import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadEnvFile } from "node:process";
import { createClient, User } from "@supabase/supabase-js";

try {
  loadEnvFile(new URL("../../.env", import.meta.url));
} catch {}

type Json = Record<string, unknown>;
type Role = "owner" | "editor" | "viewer";
type Workspace = { id: string; name: string; slug: string };
type Membership = { workspace_id: string; role: Role; workspaces: Workspace };

const port = 8787;
function projectOrigin(value: string | undefined) {
  if (!value) return "";
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin
      : "";
  } catch {
    return "";
  }
}
const supabaseUrl = projectOrigin(process.env.SUPABASE_URL);
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecretKey)
  throw new Error(
    "SUPABASE_URL must be an absolute project URL and SUPABASE_SECRET_KEY is required",
  );

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}
function fail(res: ServerResponse, status: number, message: string) {
  reply(res, status, { error: message });
}
async function body(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
    if (chunks.reduce((sum, item) => sum + item.length, 0) > 2_000_000)
      throw new Error("Request body is too large");
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Json;
}
function bearer(req: IncomingMessage) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
async function authenticated(req: IncomingMessage) {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) {
    console.error("Supabase session validation failed", error);
    return null;
  }
  return data.user || null;
}
function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "folion-workspace"
  );
}

async function memberships(userId: string) {
  const { data, error } = await admin
    .from("workspace_members")
    .select("workspace_id,role,workspaces!inner(id,name,slug)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []) as unknown as Membership[];
}
async function ensureWorkspace(
  user: User,
): Promise<{ workspace: Workspace; role: Role }> {
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: user.id,
      email: user.email || "",
      display_name:
        user.user_metadata?.display_name || user.email?.split("@")[0] || "",
    });
  if (profileError) throw profileError;
  const existing = await memberships(user.id);
  if (existing[0])
    return { workspace: existing[0].workspaces, role: existing[0].role };
  const { data: ownedWorkspace, error: ownedError } = await admin
    .from("workspaces")
    .select("id,name,slug")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ownedError) throw ownedError;
  const name = "Folion Workspace";
  const workspaceSlug = `${slug(name)}-${user.id.slice(0, 8)}`;
  let workspace = ownedWorkspace;
  let error = null;
  if (!workspace) {
    const created = await admin
      .from("workspaces")
      .insert({ name, slug: workspaceSlug, created_by: user.id })
      .select("id,name,slug")
      .single();
    workspace = created.data;
    error = created.error;
    if (error?.code === "23505") {
      const prior = await admin
        .from("workspaces")
        .select("id,name,slug")
        .eq("slug", workspaceSlug)
        .eq("created_by", user.id)
        .single();
      workspace = prior.data;
      error = prior.error;
    }
  }
  if (error || !workspace)
    throw error || new Error("Unable to create workspace");
  const { error: memberError } = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
        invited_email: user.email || "",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,user_id" },
    );
  if (memberError) throw memberError;
  await audit(
    workspace.id,
    user.id,
    "workspace.created",
    "workspace",
    workspace.id,
    {},
  );
  return { workspace: workspace as Workspace, role: "owner" };
}
async function membership(userId: string, workspaceId: string) {
  const all = await memberships(userId);
  const member = all.find((item) => item.workspace_id === workspaceId);
  return member ? { workspace: member.workspaces, role: member.role } : null;
}
async function requireRole(user: User, workspaceId: string, allowed: Role[]) {
  const member = await membership(user.id, workspaceId);
  if (!member || !allowed.includes(member.role))
    throw Object.assign(
      new Error("You do not have permission for this workspace"),
      { status: 403 },
    );
  return member;
}
async function audit(
  workspaceId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Json,
) {
  await admin
    .from("audit_events")
    .insert({
      workspace_id: workspaceId,
      actor_user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
}

async function projectAccess(user: User, projectId: string, allowed?: Role[]) {
  const { workspace, role } = await ensureWorkspace(user);
  if (allowed && !allowed.includes(role))
    throw Object.assign(
      new Error("You do not have permission to review project evidence"),
      { status: 403 },
    );
  const { data: project, error } = await admin
    .from("projects")
    .select("id,project_name,data")
    .eq("workspace_id", workspace.id)
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project)
    throw Object.assign(new Error("Project not found"), { status: 404 });
  return { workspace, role, project };
}

async function ingestionPayload(workspaceId: string, projectId: string) {
  const [
    { data: jobs, error: jobError },
    { data: pages, error: pageError },
    { data: items, error: itemError },
    { data: sources, error: sourceError },
    { data: narratives, error: narrativeError },
  ] = await Promise.all([
    admin
      .from("ingestion_jobs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    admin
      .from("source_pages")
      .select(
        "id,extraction_job_id,source_asset_id,page_number,extracted_text,character_count,created_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("page_number"),
    admin
      .from("knowledge_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at"),
    admin
      .from("knowledge_item_sources")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
    admin
      .from("narrative_sections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .order("created_at"),
  ]);
  if (jobError || pageError || itemError || sourceError || narrativeError)
    throw jobError || pageError || itemError || sourceError || narrativeError;
  const byItem = new Map<string, unknown[]>();
  for (const source of sources || []) {
    const current = byItem.get(source.knowledge_item_id) || [];
    current.push(source);
    byItem.set(source.knowledge_item_id, current);
  }
  return {
    jobs: jobs || [],
    pages: pages || [],
    items: (items || []).map((item) => ({
      ...item,
      sources: byItem.get(item.id) || [],
    })),
    narratives: narratives || [],
  };
}

async function markDependentNarrativesStale(
  workspaceId: string,
  projectId: string,
  itemId: string,
) {
  const { data, error } = await admin
    .from("narrative_sections")
    .select("id,supporting_item_ids")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .in("status", ["draft", "approved"]);
  if (error) throw error;
  const ids = (data || [])
    .filter((section) => (section.supporting_item_ids || []).includes(itemId))
    .map((section) => section.id);
  if (!ids.length) return;
  const { error: updateError } = await admin
    .from("narrative_sections")
    .update({
      needs_refresh: true,
      stale_reason: "Supporting project knowledge changed.",
    })
    .in("id", ids);
  if (updateError) throw updateError;
}

function assetRow(
  workspaceId: string,
  projectId: string,
  userId: string,
  asset: Json,
  storagePath?: string,
) {
  const durablePath = storagePath || asset.storagePath || null;
  return {
    workspace_id: workspaceId,
    project_id: projectId,
    id: String(asset.id || crypto.randomUUID()),
    type: String(asset.type || "other"),
    title: String(asset.title || ""),
    caption: String(asset.caption || ""),
    storage_path: durablePath,
    source_url:
      !durablePath &&
      typeof asset.url === "string" &&
      !asset.url.startsWith("blob:")
        ? asset.url
        : null,
    original_filename: String(asset.fileName || asset.title || ""),
    mime_type: String(asset.mimeType || ""),
    file_size:
      typeof asset.fileSize === "number"
        ? Math.max(0, Math.round(asset.fileSize))
        : null,
    source_page: typeof asset.sourcePage === "number" ? asset.sourcePage : null,
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    uploaded_category: String(asset.uploadedCategory || asset.type || ""),
    is_primary: Boolean(asset.isPrimary),
    is_selected_for_gallery: asset.isSelectedForGallery !== false,
    created_by: userId,
  };
}

async function saveProject(workspaceId: string, user: User, project: Json) {
  const id = String(project.id || "");
  if (!id) throw new Error("Project id is required");
  const team = Array.isArray(project.team) ? (project.team as Json[]) : [];
  const assets = Array.isArray(project.assets)
    ? (project.assets as Json[])
    : [];
  const { team: _team, assets: _assets, ...data } = project;
  const { data: existing } = await admin
    .from("projects")
    .select("created_by,cover_image")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  const candidateCover =
    typeof project.coverImage === "string" &&
    !project.coverImage.startsWith("blob:")
      ? project.coverImage
      : "";
  const coverIsSignedAsset = assets.some(
    (asset) => Boolean(asset.storagePath) && asset.url === candidateCover,
  );
  const row = {
    workspace_id: workspaceId,
    id,
    project_name: String(project.projectName || ""),
    status: String(project.status || ""),
    confidentiality: String(project.confidentiality || "internal-only"),
    visibility: project.visibility === "public" ? "public" : "private",
    knowledge_status:
      project.knowledgeStatus === "Ready for Studio"
        ? "Ready for Studio"
        : "Review needed",
    cover_image: coverIsSignedAsset
      ? existing?.cover_image || ""
      : candidateCover,
    data,
    created_by: existing?.created_by || user.id,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("projects")
    .upsert(row, { onConflict: "workspace_id,id" });
  if (error) throw error;
  const { error: teamDeleteError } = await admin
    .from("project_team_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("project_id", id);
  if (teamDeleteError) throw teamDeleteError;
  if (team.length) {
    const { error: teamError } = await admin
      .from("project_team_members")
      .insert(
        team.map((member) => ({
          workspace_id: workspaceId,
          project_id: id,
          person_id: String(member.personId),
          project_role: String(member.projectRole || ""),
          contribution:
            typeof member.contribution === "string" && member.contribution
              ? member.contribution
              : null,
        })),
      );
    if (teamError) throw teamError;
  }
  const { data: existingAssets, error: existingAssetsError } = await admin
    .from("assets")
    .select("id,created_by")
    .eq("workspace_id", workspaceId)
    .eq("project_id", id);
  if (existingAssetsError) throw existingAssetsError;
  if (assets.length) {
    const creators = new Map(
      (existingAssets || []).map((asset) => [asset.id, asset.created_by]),
    );
    const rows = assets.map((asset) => {
      const row = assetRow(workspaceId, id, user.id, asset);
      return { ...row, created_by: creators.get(row.id) || user.id };
    });
    const { error: assetError } = await admin
      .from("assets")
      .upsert(rows, { onConflict: "workspace_id,project_id,id" });
    if (assetError) throw assetError;
  }
  await audit(workspaceId, user.id, "project.saved", "project", id, {
    knowledgeStatus: row.knowledge_status,
  });
  const { data: links } = await admin
    .from("package_projects")
    .select("package_id")
    .eq("workspace_id", workspaceId)
    .eq("project_id", id);
  const packageIds = [...new Set((links || []).map((link) => link.package_id))];
  if (packageIds.length)
    await admin
      .from("packages")
      .update({
        state: "source_updated",
        source_updated_at: new Date().toISOString(),
      })
      .in("id", packageIds)
      .neq("state", "archived");
}

async function packagePayload(workspaceId: string, packageId?: string) {
  let query = admin
    .from("packages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (packageId) query = query.eq("id", packageId);
  const { data: packages, error } = await query;
  if (error) throw error;
  if (packageId && !packages?.length)
    throw Object.assign(new Error("Package not found"), { status: 404 });
  const ids = (packages || []).map((item) => item.id);
  if (!ids.length) return packageId ? null : [];
  const [
    { data: sections, error: sectionError },
    { data: projects, error: projectError },
    { data: people, error: peopleError },
    { data: assets, error: assetError },
    { data: sources, error: sourceError },
  ] = await Promise.all([
    admin
      .from("package_sections")
      .select("*")
      .in("package_id", ids)
      .order("section_order"),
    admin
      .from("package_projects")
      .select("*")
      .in("package_id", ids)
      .order("section_order"),
    admin
      .from("package_people")
      .select("*")
      .in("package_id", ids)
      .order("section_order"),
    admin
      .from("package_assets")
      .select("*")
      .in("package_id", ids)
      .order("section_order"),
    admin
      .from("package_section_sources")
      .select("*")
      .in(
        "package_section_id",
        (
          await admin
            .from("package_sections")
            .select("id")
            .in("package_id", ids)
        ).data?.map((item) => item.id) || [],
      ),
  ]);
  if (sectionError || projectError || peopleError || assetError || sourceError)
    throw (
      sectionError || projectError || peopleError || assetError || sourceError
    );
  const mapped = (packages || []).map((item) => ({
    id: item.id,
    packageType: item.package_type,
    title: item.title,
    mode: item.mode,
    state: item.state,
    data: item.data || {},
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    sections: (sections || [])
      .filter((section) => section.package_id === item.id)
      .map((section) => ({
        id: section.id,
        sectionType: section.section_type,
        sectionOrder: section.section_order,
        title: section.title,
        body: section.body,
        status: section.status,
        manualContent: section.manual_content,
        sources: (sources || [])
          .filter((source) => source.package_section_id === section.id)
          .map((source) => ({
            sourceType: source.source_type,
            sourceId: source.source_id,
            sourceProjectId: source.source_project_id,
            sourcePersonId: source.source_person_id,
            sourceStatus: source.source_status,
            confidentialityStatus: source.confidentiality_status,
          })),
      })),
    projectIds: (projects || [])
      .filter((link) => link.package_id === item.id)
      .map((link) => link.project_id),
    personIds: (people || [])
      .filter((link) => link.package_id === item.id)
      .map((link) => link.person_id),
    assetIds: (assets || [])
      .filter((link) => link.package_id === item.id)
      .map((link) => link.asset_id),
  }));
  return packageId ? mapped[0] : mapped;
}

async function savePackage(
  workspaceId: string,
  user: User,
  input: Json,
  id?: string,
) {
  const packageId = id || crypto.randomUUID(),
    packageType = String(input.packageType || ""),
    title = String(input.title || "Untitled package").trim(),
    mode = String(input.mode || "internal"),
    state = String(input.state || "draft");
  if (
    ![
      "single_project_sheet",
      "project_collection",
      "pitch",
      "cv",
      "tender",
    ].includes(packageType)
  )
    throw Object.assign(new Error("Choose a valid package type"), {
      status: 400,
    });
  if (
    !["internal", "external"].includes(mode) ||
    !["draft", "ready_to_share", "source_updated", "archived"].includes(state)
  )
    throw Object.assign(new Error("Package mode or state is invalid"), {
      status: 400,
    });
  const projectIds = Array.isArray(input.projectIds)
    ? input.projectIds.map(String)
    : [];
  if (mode === "external" && projectIds.length) {
    const { data: restricted, error } = await admin
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("id", projectIds)
      .eq("confidentiality", "internal-only");
    if (error) throw error;
    if (restricted?.length)
      throw Object.assign(
        new Error("This package includes Internal-only project material."),
        { status: 409 },
      );
  }
  const { data: existing } = await admin
    .from("packages")
    .select("created_by")
    .eq("workspace_id", workspaceId)
    .eq("id", packageId)
    .maybeSingle();
  const { error } = await admin
    .from("packages")
    .upsert(
      {
        id: packageId,
        workspace_id: workspaceId,
        package_type: packageType,
        title,
        mode,
        state,
        data: input.data || {},
        created_by: existing?.created_by || user.id,
      },
      { onConflict: "id" },
    );
  if (error) throw error;
  await Promise.all(
    [
      "package_sections",
      "package_projects",
      "package_people",
      "package_assets",
    ].map((table) =>
      admin
        .from(table)
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("package_id", packageId),
    ),
  );
  const sections = Array.isArray(input.sections)
    ? (input.sections as Json[])
    : [];
  if (sections.length) {
    for (const [index, section] of sections.entries()) {
      const sectionId = String(section.id || crypto.randomUUID());
      const { error: sectionError } = await admin
        .from("package_sections")
        .insert({
          id: sectionId,
          workspace_id: workspaceId,
          package_id: packageId,
          section_type: String(section.sectionType || "content"),
          section_order: index,
          title: String(section.title || ""),
          body: String(section.body || ""),
          status: String(section.status || "draft"),
          manual_content: section.manualContent || {},
        });
      if (sectionError) throw sectionError;
      const sources = Array.isArray(section.sources)
        ? (section.sources as Json[])
        : [];
      if (sources.length) {
        const { error: sourceError } = await admin
          .from("package_section_sources")
          .insert(
            sources.map((source) => ({
              workspace_id: workspaceId,
              package_section_id: sectionId,
              source_type: String(source.sourceType || "manual"),
              source_id: String(source.sourceId || sectionId),
              source_project_id: source.sourceProjectId
                ? String(source.sourceProjectId)
                : null,
              source_person_id: source.sourcePersonId
                ? String(source.sourcePersonId)
                : null,
              source_status: String(source.sourceStatus || "approved"),
              confidentiality_status: source.confidentialityStatus
                ? String(source.confidentialityStatus)
                : null,
            })),
          );
        if (sourceError) throw sourceError;
      }
    }
  }
  if (projectIds.length) {
    const { error: projectError } = await admin
      .from("package_projects")
      .insert(
        projectIds.map((projectId, index) => ({
          workspace_id: workspaceId,
          package_id: packageId,
          project_id: projectId,
          section_order: index,
          selected_reason:
            (input.data as Json | undefined)?.relevanceNotes &&
            typeof (input.data as Json).relevanceNotes === "object"
              ? String(
                  ((input.data as Json).relevanceNotes as Json)[projectId] ||
                    "",
                )
              : null,
          source_updated_at: new Date().toISOString(),
        })),
      );
    if (projectError) throw projectError;
  }
  const personIds = Array.isArray(input.personIds)
    ? input.personIds.map(String)
    : [];
  if (personIds.length) {
    const { error: peopleError } = await admin
      .from("package_people")
      .insert(
        personIds.map((personId, index) => ({
          workspace_id: workspaceId,
          package_id: packageId,
          person_id: personId,
          project_id: "",
          section_order: index,
        })),
      );
    if (peopleError) throw peopleError;
  }
  const assetIds = Array.isArray(input.assetIds)
    ? input.assetIds.map(String)
    : [];
  if (assetIds.length) {
    const { data: assetRows, error: assetReadError } = await admin
      .from("assets")
      .select("id,project_id")
      .eq("workspace_id", workspaceId)
      .in("id", assetIds);
    if (assetReadError) throw assetReadError;
    const { error: assetLinkError } = await admin
      .from("package_assets")
      .insert(
        (assetRows || []).map((asset, index) => ({
          workspace_id: workspaceId,
          package_id: packageId,
          project_id: asset.project_id,
          asset_id: asset.id,
          usage: index === 0 ? "hero" : "supporting",
          section_order: index,
        })),
      );
    if (assetLinkError) throw assetLinkError;
  }
  const { count } = await admin
    .from("package_versions")
    .select("*", { count: "exact", head: true })
    .eq("package_id", packageId);
  await admin
    .from("package_versions")
    .insert({
      workspace_id: workspaceId,
      package_id: packageId,
      version_number: (count || 0) + 1,
      snapshot: { ...input, id: packageId },
      created_by: user.id,
    });
  await audit(
    workspaceId,
    user.id,
    existing ? "package.updated" : "package.created",
    "package",
    packageId,
    { packageType, mode, state },
  );
  return packagePayload(workspaceId, packageId);
}

async function bootstrap(user: User) {
  const { workspace, role } = await ensureWorkspace(user);
  const [
    { data: projectRows, error: projectError },
    { data: people, error: peopleError },
    { data: team, error: teamError },
    { data: assets, error: assetError },
    { data: approvedItems, error: approvedItemError },
    { data: approvedSources, error: approvedSourceError },
    { data: approvedNarratives, error: approvedNarrativeError },
  ] = await Promise.all([
    admin
      .from("projects")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false }),
    admin
      .from("people")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("name"),
    admin
      .from("project_team_members")
      .select("*")
      .eq("workspace_id", workspace.id),
    admin.from("assets").select("*").eq("workspace_id", workspace.id),
    admin
      .from("knowledge_items")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "accepted"),
    admin
      .from("knowledge_item_sources")
      .select("*")
      .eq("workspace_id", workspace.id),
    admin
      .from("narrative_sections")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("status", "approved"),
  ]);
  if (
    projectError ||
    peopleError ||
    teamError ||
    assetError ||
    approvedItemError ||
    approvedSourceError ||
    approvedNarrativeError
  )
    throw (
      projectError ||
      peopleError ||
      teamError ||
      assetError ||
      approvedItemError ||
      approvedSourceError ||
      approvedNarrativeError
    );
  const names = new Map(
    (people || []).map((person) => [person.id, person.name]),
  );
  const signedUrls = new Map<string, string>();
  for (const asset of assets || []) {
    if (!asset.storage_path) continue;
    const { data } = await admin.storage
      .from("project-assets")
      .createSignedUrl(asset.storage_path, 3600);
    if (data?.signedUrl) signedUrls.set(asset.id, data.signedUrl);
  }
  const projects = (projectRows || []).map((row) => {
    const projectAssets = (assets || []).filter(
      (item) => item.project_id === row.id,
    );
    const primaryHero =
      projectAssets.find((item) => item.type === "hero" && item.is_primary) ||
      projectAssets.find((item) => item.type === "hero");
    return {
      ...row.data,
      id: row.id,
      projectName: row.project_name,
      status: row.status,
      confidentiality: row.confidentiality,
      visibility: row.visibility,
      knowledgeStatus: row.knowledge_status,
      coverImage: primaryHero
        ? signedUrls.get(primaryHero.id) ||
          primaryHero.source_url ||
          row.cover_image
        : row.cover_image,
      team: (team || [])
        .filter((item) => item.project_id === row.id)
        .map((item) => ({
          personId: item.person_id,
          name: names.get(item.person_id) || "",
          projectRole: item.project_role,
          contribution: item.contribution || undefined,
        })),
      approvedEvidence: (approvedItems || [])
        .filter((item) => item.project_id === row.id)
        .map((item) => {
          const source = (approvedSources || []).find(
            (value) => value.knowledge_item_id === item.id,
          );
          return {
            id: item.id,
            category: item.category,
            field: item.field,
            structuredField: item.structured_field,
            value: item.value,
            sourceType: item.source_type,
            originalExtractedValue: item.original_extracted_value,
            approvedAt: item.approved_at,
            sourceAssetId: source?.source_asset_id,
            sourcePage: source?.source_page,
            exactEvidenceQuote: source?.exact_evidence_quote,
          };
        }),
      approvedNarratives: (approvedNarratives || [])
        .filter((item) => item.project_id === row.id)
        .map((item) => ({
          id: item.id,
          sectionType: item.section_type,
          text: item.approved_text || item.draft_text,
          basisType: item.basis_type,
          approvedAt: item.approved_at,
        })),
      assets: projectAssets.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        caption: item.caption,
        url: signedUrls.get(item.id) || item.source_url || "",
        storagePath: item.storage_path || undefined,
        fileName: item.original_filename || undefined,
        mimeType: item.mime_type || undefined,
        fileSize: item.file_size ?? undefined,
        uploadedAt: item.created_at,
        uploadedBy: item.created_by,
        sourcePage: item.source_page,
        tags: item.tags || [],
        uploadedCategory: item.uploaded_category,
        isPrimary: item.is_primary,
        isSelectedForGallery: item.is_selected_for_gallery,
      })),
    };
  });
  const [
    { data: collections, error: collectionError },
    { data: collectionProjects, error: collectionProjectError },
    { data: roleAssignments, error: roleAssignmentError },
  ] = await Promise.all([
    admin
      .from("collections")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false }),
    admin
      .from("collection_projects")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("project_order"),
    admin
      .from("project_role_assignments")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false }),
  ]);
  if (collectionError || collectionProjectError || roleAssignmentError)
    throw collectionError || collectionProjectError || roleAssignmentError;
  return {
    workspace,
    role,
    projects,
    people: (people || []).map((person) => ({
      id: person.id,
      name: person.name,
      position: person.position,
      office: person.office,
      email: person.email,
      bio: person.bio,
      skills: person.skills || [],
      ...person.data,
    })),
    collections: (collections || []).map((item) => ({
      id: item.id,
      name: item.title,
      description: item.brief,
      brief: item.brief,
      keywords: item.keywords || "",
      approvedNarrative: item.approved_narrative || "",
      projectIds: (collectionProjects || [])
        .filter((link) => link.collection_id === item.id)
        .map((link) => link.project_id),
    })),
    roleAssignments: (roleAssignments || []).map((item) => ({
      id: item.id,
      personId: item.person_id,
      projectId: item.project_id,
      roleTitle: item.role_title,
      contributionSummary: item.contribution_summary,
      approvalStatus: item.approval_status,
      sourceReference: item.source_reference || undefined,
    })),
  };
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );
  const path = url.pathname;
  if (req.method === "GET" && path === "/api/health")
    return reply(res, 200, { status: "ok" });
  const user = await authenticated(req);
  if (!user) return fail(res, 401, "Authentication required");
  if (req.method === "GET" && path === "/api/v1/bootstrap")
    return reply(res, 200, await bootstrap(user));
  const packageMatch = path.match(/^\/api\/v1\/packages\/([^/]+)$/);
  const packageTenderUploadMatch = path.match(
    /^\/api\/v1\/packages\/([^/]+)\/tender-source\/upload-url$/,
  );
  const packageTenderSourceMatch = path.match(
    /^\/api\/v1\/packages\/([^/]+)\/tender-source$/,
  );
  const packageTenderAnalysisMatch = path.match(
    /^\/api\/v1\/packages\/([^/]+)\/tender-analysis$/,
  );
  if (req.method === "GET" && path === "/api/v1/packages") {
    const { workspace } = await ensureWorkspace(user);
    return reply(res, 200, { packages: await packagePayload(workspace.id) });
  }
  if (req.method === "POST" && path === "/api/v1/packages") {
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(res, 403, "You do not have permission to create packages");
    return reply(res, 201, {
      package: await savePackage(workspace.id, user, await body(req)),
    });
  }
  if (req.method === "GET" && packageMatch) {
    const { workspace } = await ensureWorkspace(user);
    return reply(res, 200, {
      package: await packagePayload(
        workspace.id,
        decodeURIComponent(packageMatch[1]),
      ),
    });
  }
  if (req.method === "PUT" && packageMatch) {
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(res, 403, "You do not have permission to edit packages");
    return reply(res, 200, {
      package: await savePackage(
        workspace.id,
        user,
        await body(req),
        decodeURIComponent(packageMatch[1]),
      ),
    });
  }
  if (req.method === "POST" && packageTenderUploadMatch) {
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to add a tender source",
      );
    const packageId = decodeURIComponent(packageTenderUploadMatch[1]);
    const { data: record, error: packageError } = await admin
      .from("packages")
      .select("id,package_type")
      .eq("workspace_id", workspace.id)
      .eq("id", packageId)
      .maybeSingle();
    if (packageError) throw packageError;
    if (!record || record.package_type !== "tender")
      return fail(res, 404, "Tender package not found");
    const input = await body(req),
      filename = String(input.filename || "tender.pdf").replace(
        /[^a-zA-Z0-9._-]+/g,
        "-",
      ),
      mimeType = String(input.mimeType || ""),
      sourceId = crypto.randomUUID(),
      storagePath = `${workspace.id}/packages/${packageId}/${sourceId}-${filename}`;
    const supported =
      (mimeType === "application/pdf" && /\.pdf$/i.test(filename)) ||
      (mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
        /\.docx$/i.test(filename));
    if (!supported)
      return fail(
        res,
        415,
        "Tender Brief must be a PDF or DOCX file. Legacy .doc files are not supported.",
      );
    const { data, error } = await admin.storage
      .from("project-assets")
      .createSignedUploadUrl(storagePath);
    if (error) throw error;
    return reply(res, 201, { sourceId, storagePath, token: data.token });
  }
  if (req.method === "POST" && packageTenderSourceMatch) {
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to add a tender source",
      );
    const packageId = decodeURIComponent(packageTenderSourceMatch[1]),
      input = await body(req);
    const { data: record, error: packageError } = await admin
      .from("packages")
      .select("id,package_type")
      .eq("workspace_id", workspace.id)
      .eq("id", packageId)
      .maybeSingle();
    if (packageError) throw packageError;
    if (!record || record.package_type !== "tender")
      return fail(res, 404, "Tender package not found");
    const sourceId = String(input.sourceId || crypto.randomUUID());
    const filename = String(input.filename || "");
    const mimeType = String(input.mimeType || "");
    const pastedText = String(input.pastedText || "").trim();
    const isPdf = mimeType === "application/pdf" && /\.pdf$/i.test(filename);
    const isDocx =
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      /\.docx$/i.test(filename);
    if (!pastedText && !isPdf && !isDocx)
      return fail(
        res,
        415,
        "Tender Brief must be a PDF or DOCX file. Legacy .doc files are not supported.",
      );
    const { data: source, error: sourceError } = await admin
      .from("package_sources")
      .insert({
        id: sourceId,
        workspace_id: workspace.id,
        package_id: packageId,
        source_type: pastedText ? "tender_text" : isDocx ? "tender_docx" : "tender_pdf",
        original_filename: pastedText ? "Pasted Tender Brief" : filename,
        mime_type: pastedText ? "text/plain" : mimeType,
        file_size: pastedText ? Buffer.byteLength(pastedText, "utf8") : Number(input.fileSize) || null,
        storage_path: pastedText ? null : String(input.storagePath || ""),
        source_text: pastedText || null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (sourceError) throw sourceError;
    const { data: job, error: jobError } = await admin
      .from("tender_analysis_jobs")
      .insert({
        workspace_id: workspace.id,
        package_id: packageId,
        package_source_id: source.id,
        status: "queued",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (jobError) throw jobError;
    await audit(
      workspace.id,
      user.id,
      "tender.source_added",
      "package",
      packageId,
      { sourceId: source.id, jobId: job.id },
    );
    return reply(res, 201, { source, job });
  }
  if (req.method === "GET" && packageTenderAnalysisMatch) {
    const { workspace } = await ensureWorkspace(user);
    const packageId = decodeURIComponent(packageTenderAnalysisMatch[1]);
    const { data: job, error } = await admin
      .from("tender_analysis_jobs")
      .select(
        "id,status,analysis,failure_reason,model_name,created_at,completed_at,package_source_id",
      )
      .eq("workspace_id", workspace.id)
      .eq("package_id", packageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return reply(res, 200, { job });
  }
  if (req.method === "POST" && path === "/api/v1/bootstrap/seed") {
    const input = await body(req);
    const { workspace, role } = await ensureWorkspace(user);
    if (role !== "owner")
      return fail(res, 403, "Only an Owner can seed a workspace");
    const { count } = await admin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);
    if ((count || 0) > 0) return reply(res, 200, { seeded: false });
    const people = Array.isArray(input.people) ? (input.people as Json[]) : [];
    if (people.length) {
      const { error } = await admin.from("people").upsert(
        people.map((person) => ({
          workspace_id: workspace.id,
          id: String(person.id),
          name: String(person.name || ""),
          position: String(person.position || ""),
          office: String(person.office || ""),
          email: String(person.email || ""),
          bio: String(person.bio || ""),
          skills: Array.isArray(person.skills) ? person.skills : [],
          data: {},
        })),
        { onConflict: "workspace_id,id" },
      );
      if (error) throw error;
    }
    for (const project of Array.isArray(input.projects)
      ? (input.projects as Json[])
      : [])
      await saveProject(workspace.id, user, project);
    await audit(
      workspace.id,
      user.id,
      "workspace.seeded",
      "workspace",
      workspace.id,
      {
        projects: Array.isArray(input.projects) ? input.projects.length : 0,
        people: people.length,
      },
    );
    return reply(res, 201, { seeded: true });
  }
  if (req.method === "POST" && path === "/api/v1/people") {
    const input = await body(req);
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to add people to this workspace",
      );
    const workspaceId = workspace.id;
    const value = (input.person || {}) as Json;
    const name = String(value.name || "").trim();
    if (!name) return fail(res, 400, "Person name is required");
    const row = {
      workspace_id: workspaceId,
      id: crypto.randomUUID(),
      name,
      position: String(value.position || "").trim(),
      office: String(value.office || "").trim(),
      email: String(value.email || "").trim(),
      bio: String(value.bio || "").trim(),
      skills: Array.isArray(value.skills)
        ? value.skills.map((item) => String(item).trim()).filter(Boolean)
        : [],
      data: {},
    };
    const { data, error } = await admin
      .from("people")
      .insert(row)
      .select("id,name,position,office,email,bio,skills")
      .single();
    if (error) throw error;
    await audit(workspaceId, user.id, "person.created", "person", row.id, {});
    return reply(res, 201, { person: data, workspace, role });
  }
  if (req.method === "POST" && path === "/api/v1/collections") {
    const input = await body(req),
      { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(res, 403, "You do not have permission to create collections");
    const title = String(input.title || "").trim(),
      brief = String(input.brief || "").trim(),
      keywords = String(input.keywords || "").trim(),
      approved_narrative = String(input.approvedNarrative || "").trim();
    const projectIds=Array.isArray(input.projectIds)?input.projectIds.map(String):[];
    if (!title || !brief) return fail(res, 400, "Collection title and brief are required");
    const { data, error } = await admin
      .from("collections")
      .insert({ workspace_id: workspace.id, title, brief, keywords, approved_narrative, created_by: user.id })
      .select("*")
      .single();
    if (error) throw error;
    if(projectIds.length){const {error:linkError}=await admin.from("collection_projects").insert(projectIds.map((projectId,index)=>({workspace_id:workspace.id,collection_id:data.id,project_id:projectId,project_order:index})));if(linkError)throw linkError}
    return reply(res, 201, {
      collection: {
        id: data.id,
        name: data.title,
        description: data.brief,
        brief: data.brief,
        keywords: data.keywords || "",
        approvedNarrative: data.approved_narrative || "",
        projectIds,
      },
    });
  }
  const collectionMatch = path.match(/^\/api\/v1\/collections\/([^/]+)$/);
  if (req.method === "PUT" && collectionMatch) {
    const input = await body(req),
      { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(res, 403, "You do not have permission to edit collections");
    const id = decodeURIComponent(collectionMatch[1]),
      projectIds = Array.isArray(input.projectIds)
        ? input.projectIds.map(String)
        : [];
    const title=String(input.title||"").trim(),brief=String(input.brief||"").trim();
    if(!title||!brief)return fail(res,400,"Collection title and brief are required");
    const { error } = await admin
      .from("collections")
      .update({
        title,
        brief,
        keywords: String(input.keywords || "").trim(),
        approved_narrative: String(input.approvedNarrative || "").trim(),
      })
      .eq("workspace_id", workspace.id)
      .eq("id", id);
    if (error) throw error;
    const {data:existingLinks,error:existingLinkError}=await admin.from("collection_projects").select("project_id").eq("workspace_id",workspace.id).eq("collection_id",id);
    if(existingLinkError)throw existingLinkError;
    if (projectIds.length) {
      const { error: linkError } = await admin
        .from("collection_projects")
        .upsert(
          projectIds.map((projectId, index) => ({
            workspace_id: workspace.id,
            collection_id: id,
            project_id: projectId,
            project_order: index,
          })),{onConflict:"collection_id,project_id"}
        );
      if (linkError) throw linkError;
    }
    for(const link of existingLinks||[]){if(projectIds.includes(link.project_id))continue;const {error:removeError}=await admin.from("collection_projects").delete().eq("workspace_id",workspace.id).eq("collection_id",id).eq("project_id",link.project_id);if(removeError)throw removeError}
    return reply(res, 200, { saved: true });
  }
  if (req.method === "POST" && path === "/api/v1/role-assignments") {
    const input = await body(req),
      { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to manage role assignments",
      );
    const approved = input.approvalStatus === "approved";
    const row = {
      workspace_id: workspace.id,
      person_id: String(input.personId || ""),
      project_id: String(input.projectId || ""),
      role_title: String(input.roleTitle || "").trim(),
      contribution_summary: String(input.contributionSummary || "").trim(),
      approval_status: approved ? "approved" : "not_approved",
      source_reference: String(input.sourceReference || "").trim() || null,
      created_by: user.id,
      approved_by: approved ? user.id : null,
      approved_at: approved ? new Date().toISOString() : null,
    };
    if (
      !row.person_id ||
      !row.project_id ||
      !row.role_title ||
      !row.contribution_summary
    )
      return fail(
        res,
        400,
        "Person, project, role title and contribution are required",
      );
    const { data, error } = await admin
      .from("project_role_assignments")
      .upsert(row, { onConflict: "workspace_id,person_id,project_id" })
      .select("*")
      .single();
    if (error) throw error;
    if (approved) {
      const { error: teamError } = await admin
        .from("project_team_members")
        .upsert(
          {
            workspace_id: workspace.id,
            project_id: row.project_id,
            person_id: row.person_id,
            project_role: row.role_title,
            contribution: row.contribution_summary,
          },
          { onConflict: "workspace_id,project_id,person_id" },
        );
      if (teamError) throw teamError;
    }
    await audit(
      workspace.id,
      user.id,
      "project_role_assignment.saved",
      "project",
      row.project_id,
      { personId: row.person_id, approved },
    );
    return reply(res, 201, {
      assignment: {
        id: data.id,
        personId: data.person_id,
        projectId: data.project_id,
        roleTitle: data.role_title,
        contributionSummary: data.contribution_summary,
        approvalStatus: data.approval_status,
        sourceReference: data.source_reference || undefined,
      },
    });
  }
  const projectMatch = path.match(/^\/api\/v1\/projects\/([^/]+)$/);
  if (req.method === "POST" && path === "/api/v1/projects") {
    const input = await body(req);
    const workspaceId = String(input.workspaceId || "");
    await requireRole(user, workspaceId, ["owner", "editor"]);
    await saveProject(workspaceId, user, input.project as Json);
    return reply(res, 201, { project: input.project });
  }
  if (req.method === "PUT" && projectMatch) {
    const input = await body(req);
    const workspaceId = String(input.workspaceId || "");
    await requireRole(user, workspaceId, ["owner", "editor"]);
    await saveProject(workspaceId, user, input.project as Json);
    return reply(res, 200, { project: input.project });
  }
  const readyMatch = path.match(/^\/api\/v1\/projects\/([^/]+)\/ready$/);
  if (req.method === "POST" && readyMatch) {
    const projectId = decodeURIComponent(readyMatch[1]);
    const { workspace } = await projectAccess(user, projectId, [
      "owner",
      "editor",
    ]);
    const { data: stored, error: readError } = await admin
      .from("projects")
      .select("knowledge_status,data")
      .eq("workspace_id", workspace.id)
      .eq("id", projectId)
      .single();
    if (readError) throw readError;
    const data = (stored.data || {}) as Json;
    if (
      stored.knowledge_status === "Ready for Studio" &&
      data.creationStep === "completed"
    )
      return reply(res, 200, { ready: true, alreadyReady: true, projectId });
    const { error: updateError } = await admin
      .from("projects")
      .update({
        knowledge_status: "Ready for Studio",
        data: {
          ...data,
          knowledgeStatus: "Ready for Studio",
          creationStep: "completed",
        },
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspace.id)
      .eq("id", projectId);
    if (updateError) throw updateError;
    await audit(
      workspace.id,
      user.id,
      "project.ready_for_studio",
      "project",
      projectId,
      {},
    );
    return reply(res, 200, { ready: true, alreadyReady: false, projectId });
  }
  if (req.method === "DELETE" && projectMatch) {
    const projectId = decodeURIComponent(projectMatch[1]);
    const { workspace, role } = await ensureWorkspace(user);
    if (role !== "owner")
      return fail(res, 403, "Only an Owner can delete projects");
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("project_name")
      .eq("workspace_id", workspace.id)
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return fail(res, 404, "Project not found");
    const { data: assets, error: assetError } = await admin
      .from("assets")
      .select("storage_path")
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId);
    if (assetError) throw assetError;
    const storagePaths = (assets || [])
      .map((asset) => asset.storage_path)
      .filter((value): value is string => Boolean(value));
    if (storagePaths.length) {
      const { error: storageError } = await admin.storage
        .from("project-assets")
        .remove(storagePaths);
      if (storageError) throw storageError;
    }
    const { error: deleteError } = await admin
      .from("projects")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("id", projectId);
    if (deleteError) throw deleteError;
    await audit(
      workspace.id,
      user.id,
      "project.deleted",
      "project",
      projectId,
      {
        projectName: project.project_name,
        storageObjectsRemoved: storagePaths.length,
      },
    );
    return reply(res, 200, { deleted: true, projectId });
  }
  const inviteMatch = path.match(
    /^\/api\/v1\/workspaces\/([^/]+)\/invitations$/,
  );
  if (req.method === "POST" && inviteMatch) {
    const workspaceId = inviteMatch[1];
    await requireRole(user, workspaceId, ["owner"]);
    const input = await body(req);
    const email = String(input.email || "")
      .trim()
      .toLowerCase();
    const role = String(input.role || "viewer") as Role;
    if (!email || !["owner", "editor", "viewer"].includes(role))
      return fail(res, 400, "A valid email and role are required");
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) throw error;
    if (!data.user)
      return fail(res, 502, "Supabase did not return the invited user");
    await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, display_name: email.split("@")[0] });
    const { error: memberError } = await admin
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: data.user.id,
          role,
          invited_email: email,
          accepted_at: null,
        },
        { onConflict: "workspace_id,user_id" },
      );
    if (memberError) throw memberError;
    await audit(
      workspaceId,
      user.id,
      "workspace.member_invited",
      "workspace_member",
      data.user.id,
      { role },
    );
    return reply(res, 201, { invited: true });
  }
  const uploadMatch = path.match(
    /^\/api\/v1\/projects\/([^/]+)\/assets\/upload-url$/,
  );
  if (req.method === "POST" && uploadMatch) {
    const input = await body(req);
    const workspaceId = String(input.workspaceId || "");
    await requireRole(user, workspaceId, ["owner", "editor"]);
    const projectId = decodeURIComponent(uploadMatch[1]);
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return fail(res, 404, "Project not found");
    const filename = String(input.filename || "asset").replace(
      /[^a-zA-Z0-9._-]+/g,
      "-",
    );
    const assetId = String(input.assetId || crypto.randomUUID());
    const storagePath = `${workspaceId}/${projectId}/${assetId}-${filename}`;
    const { data, error } = await admin.storage
      .from("project-assets")
      .createSignedUploadUrl(storagePath);
    if (error) throw error;
    return reply(res, 201, { storagePath, token: data.token });
  }
  if (
    req.method === "POST" &&
    path.match(/^\/api\/v1\/projects\/[^/]+\/assets$/)
  ) {
    const input = await body(req);
    const workspaceId = String(input.workspaceId || "");
    await requireRole(user, workspaceId, ["owner", "editor"]);
    const projectId = decodeURIComponent(path.split("/")[4]);
    const row = assetRow(
      workspaceId,
      projectId,
      user.id,
      input.asset as Json,
      String(input.storagePath || ""),
    );
    if (row.is_primary) {
      const { error: primaryError } = await admin
        .from("assets")
        .update({ is_primary: false })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId);
      if (primaryError) throw primaryError;
    }
    const { error } = await admin
      .from("assets")
      .upsert(row, { onConflict: "workspace_id,project_id,id" });
    if (error) throw error;
    await audit(
      workspaceId,
      user.id,
      "asset.created",
      "asset",
      String(row.id),
      {
        projectId,
        category: row.uploaded_category,
        originalFilename: row.original_filename,
      },
    );
    return reply(res, 201, { asset: row });
  }
  const ingestionMatch = path.match(
    /^\/api\/v1\/projects\/([^/]+)\/ingestion$/,
  );
  if (req.method === "GET" && ingestionMatch) {
    const projectId = decodeURIComponent(ingestionMatch[1]);
    const { workspace } = await projectAccess(user, projectId);
    return reply(res, 200, await ingestionPayload(workspace.id, projectId));
  }
  const analyseMatch = path.match(
    /^\/api\/v1\/projects\/([^/]+)\/assets\/([^/]+)\/analyse$/,
  );
  if (req.method === "POST" && analyseMatch) {
    const projectId = decodeURIComponent(analyseMatch[1]);
    const assetId = decodeURIComponent(analyseMatch[2]);
    const input = await body(req);
    const { workspace } = await projectAccess(user, projectId, [
      "owner",
      "editor",
    ]);
    const { data: asset, error: assetError } = await admin
      .from("assets")
      .select(
        "id,type,title,original_filename,mime_type,file_size,storage_path",
      )
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("id", assetId)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return fail(res, 404, "Source asset not found");
    const filename = String(asset.original_filename || asset.title || "");
    if (!/\.pdf$/i.test(filename) && asset.mime_type !== "application/pdf")
      return fail(
        res,
        400,
        "Only text-based PDF reports can be analysed in this version.",
      );
    if (!asset.storage_path)
      return fail(
        res,
        400,
        "This PDF is not available in private project storage.",
      );
    if (
      typeof asset.file_size === "number" &&
      asset.file_size > 20 * 1024 * 1024
    )
      return fail(
        res,
        413,
        "This document is too large for analysis in this version. Please use a shorter report or split it into sections.",
      );
    const activeStatuses = [
      "queued",
      "extracting_text",
      "analysing",
      "validating",
    ];
    const { data: active, error: activeError } = await admin
      .from("ingestion_jobs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("source_asset_id", assetId)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw activeError;
    if (active) return reply(res, 200, { job: active, existing: true });
    const { data: prior, error: priorError } = await admin
      .from("ingestion_jobs")
      .select("id,status")
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("source_asset_id", assetId)
      .in("status", ["ready_for_review", "failed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (priorError) throw priorError;
    if (prior && !input.reanalyse)
      return fail(
        res,
        409,
        "This document has already been analysed. Use Analyse again to create a new review set.",
      );
    const { data: job, error: jobError } = await admin
      .from("ingestion_jobs")
      .insert({
        workspace_id: workspace.id,
        project_id: projectId,
        source_asset_id: assetId,
        status: "queued",
        model_name: process.env.GEMINI_MODEL || null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (jobError) {
      if (jobError.code === "23505") {
        const { data: existing } = await admin
          .from("ingestion_jobs")
          .select("*")
          .eq("workspace_id", workspace.id)
          .eq("project_id", projectId)
          .eq("source_asset_id", assetId)
          .in("status", activeStatuses)
          .single();
        return reply(res, 200, { job: existing, existing: true });
      }
      throw jobError;
    }
    await audit(
      workspace.id,
      user.id,
      "document.analysis_started",
      "ingestion_job",
      job.id,
      { projectId, sourceAssetId: assetId },
    );
    return reply(res, 201, { job, existing: false });
  }
  const regenerateMatch = path.match(
    /^\/api\/v1\/projects\/([^/]+)\/narrative\/regenerate$/,
  );
  if (req.method === "POST" && regenerateMatch) {
    const projectId = decodeURIComponent(regenerateMatch[1]);
    const { workspace } = await projectAccess(user, projectId, [
      "owner",
      "editor",
    ]);
    const activeStatuses = [
      "queued",
      "extracting_text",
      "analysing",
      "validating",
    ];
    const { data: active, error: activeError } = await admin
      .from("ingestion_jobs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("narrative_only", true)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw activeError;
    if (active) return reply(res, 200, { job: active, existing: true });
    const { data: source, error: sourceError } = await admin
      .from("assets")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("project_id", projectId)
      .eq("type", "report")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source)
      return fail(res, 400, "Add a report before regenerating the narrative.");
    const { data: job, error: jobError } = await admin
      .from("ingestion_jobs")
      .insert({
        workspace_id: workspace.id,
        project_id: projectId,
        source_asset_id: source.id,
        status: "queued",
        narrative_only: true,
        model_name: process.env.GEMINI_MODEL || null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (jobError) throw jobError;
    await admin
      .from("projects")
      .update({ knowledge_status: "Review needed", updated_by: user.id })
      .eq("workspace_id", workspace.id)
      .eq("id", projectId);
    await audit(
      workspace.id,
      user.id,
      "narrative.regeneration_started",
      "ingestion_job",
      job.id,
      { projectId },
    );
    return reply(res, 201, { job, existing: false });
  }
  const itemReviewMatch = path.match(/^\/api\/v1\/knowledge-items\/([^/]+)$/);
  if (req.method === "PATCH" && itemReviewMatch) {
    const itemId = decodeURIComponent(itemReviewMatch[1]);
    const input = await body(req);
    const action = String(input.action || "");
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to review project evidence",
      );
    const { data: item, error: itemError } = await admin
      .from("knowledge_items")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("id", itemId)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) return fail(res, 404, "Candidate fact not found");
    let auditAction = "";
    let resultId = item.id;
    if (action === "accept") {
      const { error } = await admin
        .from("knowledge_items")
        .update({
          status: "accepted",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("workspace_id", workspace.id)
        .eq("id", item.id);
      if (error) throw error;
      auditAction = "candidate_fact.accepted";
    } else if (action === "edit_accept") {
      const value = String(input.value || "").trim();
      if (!value) return fail(res, 400, "An accepted refinement needs a value");
      const { data: refinement, error } = await admin
        .from("knowledge_items")
        .insert({
          workspace_id: workspace.id,
          project_id: item.project_id,
          extraction_job_id: item.extraction_job_id,
          category: item.category,
          field: item.field,
          structured_field: item.structured_field,
          value,
          normalised_value: value.toLowerCase().replace(/\s+/g, " ").trim(),
          status: "accepted",
          source_type: "manual_refinement",
          conflict_group_id: item.conflict_group_id,
          parent_item_id: item.id,
          original_extracted_value: item.value,
          created_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      const { data: itemSources, error: sourceReadError } = await admin
        .from("knowledge_item_sources")
        .select("source_asset_id,source_page,exact_evidence_quote")
        .eq("workspace_id", workspace.id)
        .eq("knowledge_item_id", item.id);
      if (sourceReadError) throw sourceReadError;
      if (itemSources?.length) {
        const { error: sourceCopyError } = await admin
          .from("knowledge_item_sources")
          .insert(
            itemSources.map((source) => ({
              workspace_id: workspace.id,
              project_id: item.project_id,
              knowledge_item_id: refinement.id,
              ...source,
            })),
          );
        if (sourceCopyError) throw sourceCopyError;
      }
      const { error: supersedeError } = await admin
        .from("knowledge_items")
        .update({ status: "superseded" })
        .eq("workspace_id", workspace.id)
        .eq("id", item.id);
      if (supersedeError) throw supersedeError;
      resultId = refinement.id;
      auditAction = "candidate_fact.edited_accepted";
    } else if (action === "review_needed") {
      const { error } = await admin
        .from("knowledge_items")
        .update({
          status: "review_needed",
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
        })
        .eq("workspace_id", workspace.id)
        .eq("id", item.id);
      if (error) throw error;
      auditAction = "candidate_fact.review_needed";
    } else if (action === "reject") {
      const { error } = await admin
        .from("knowledge_items")
        .update({
          status: "rejected",
          approved_by: null,
          approved_at: null,
          rejection_reason: String(input.reason || "").trim() || null,
        })
        .eq("workspace_id", workspace.id)
        .eq("id", item.id);
      if (error) throw error;
      auditAction = "candidate_fact.rejected";
    } else return fail(res, 400, "Unknown candidate review action");
    if (action === "edit_accept" || action === "reject")
      await markDependentNarrativesStale(
        workspace.id,
        item.project_id,
        item.id,
      );
    await admin
      .from("projects")
      .update({ knowledge_status: "Review needed", updated_by: user.id })
      .eq("workspace_id", workspace.id)
      .eq("id", item.project_id);
    await audit(
      workspace.id,
      user.id,
      auditAction,
      "knowledge_item",
      resultId,
      { projectId: item.project_id, sourceItemId: item.id },
    );
    return reply(
      res,
      200,
      await ingestionPayload(workspace.id, item.project_id),
    );
  }
  const narrativeReviewMatch = path.match(
    /^\/api\/v1\/narrative-sections\/([^/]+)$/,
  );
  if (req.method === "PATCH" && narrativeReviewMatch) {
    const sectionId = decodeURIComponent(narrativeReviewMatch[1]);
    const input = await body(req);
    const action = String(input.action || "");
    const { workspace, role } = await ensureWorkspace(user);
    if (!["owner", "editor"].includes(role))
      return fail(
        res,
        403,
        "You do not have permission to review project evidence",
      );
    const { data: section, error: sectionError } = await admin
      .from("narrative_sections")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("id", sectionId)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section) return fail(res, 404, "Narrative section not found");
    if (
      (action === "approve" || action === "edit_approve") &&
      section.needs_refresh
    )
      return fail(
        res,
        409,
        "Needs refresh — supporting project knowledge changed.",
      );
    if (action === "approve" || action === "edit_approve") {
      const supporting = Array.isArray(section.supporting_item_ids)
        ? section.supporting_item_ids
        : [];
      if (supporting.length) {
        const { data: invalid, error: invalidError } = await admin
          .from("knowledge_items")
          .select("id")
          .in("id", supporting)
          .in("status", ["rejected", "superseded"]);
        if (invalidError) throw invalidError;
        if (invalid?.length)
          return fail(
            res,
            409,
            "Needs refresh — supporting project knowledge changed.",
          );
      }
    }
    let values: Json;
    let auditAction: string;
    if (action === "approve") {
      values = {
        status: "approved",
        approved_text: section.draft_text,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };
      auditAction = "narrative.approved";
    } else if (action === "edit_approve") {
      const value = String(input.value || "").trim();
      if (!value) return fail(res, 400, "An approved narrative needs text");
      values = {
        status: "approved",
        approved_text: value,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };
      auditAction = "narrative.edited_approved";
    } else if (action === "keep_draft") {
      values = {
        status: "draft",
        approved_text: null,
        approved_by: null,
        approved_at: null,
      };
      auditAction = "narrative.kept_draft";
    } else if (action === "reject") {
      values = {
        status: "rejected",
        approved_text: null,
        approved_by: null,
        approved_at: null,
      };
      auditAction = "narrative.rejected";
    } else return fail(res, 400, "Unknown narrative review action");
    const { error } = await admin
      .from("narrative_sections")
      .update(values)
      .eq("workspace_id", workspace.id)
      .eq("id", section.id);
    if (error) throw error;
    if (action === "approve" || action === "edit_approve") {
      const { error: supersedeError } = await admin
        .from("narrative_sections")
        .update({ status: "superseded" })
        .eq("workspace_id", workspace.id)
        .eq("project_id", section.project_id)
        .eq("section_type", section.section_type)
        .eq("status", "approved")
        .neq("id", section.id);
      if (supersedeError) throw supersedeError;
    }
    await admin
      .from("projects")
      .update({ knowledge_status: "Review needed", updated_by: user.id })
      .eq("workspace_id", workspace.id)
      .eq("id", section.project_id);
    await audit(
      workspace.id,
      user.id,
      auditAction,
      "narrative_section",
      section.id,
      { projectId: section.project_id, version: section.version || 1 },
    );
    return reply(
      res,
      200,
      await ingestionPayload(workspace.id, section.project_id),
    );
  }
  return fail(res, 404, "Not found");
}

createServer((req, res) => {
  route(req, res).catch((error) => {
    const status = typeof error?.status === "number" ? error.status : 500;
    console.error(error);
    fail(
      res,
      status,
      status === 500 ? "Unexpected server error" : error.message,
    );
  });
}).listen(port, "0.0.0.0", () =>
  console.log(`Folion API listening on ${port}`),
);
