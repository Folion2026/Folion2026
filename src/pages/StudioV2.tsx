import {
  ArrowLeft,
  BookOpen,
  FileText,
  FileDown,
  Layers3,
  Presentation,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { apiRequest } from "../lib/api";
import { createUuid } from "../lib/id";
import { exportA4Pages } from "../lib/exportPdf";
import {
  approvedDraftSections,
  reviewedKnowledgeFacts,
} from "../lib/project";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import {Button} from "../components/ui";
import {
  Asset,
  Collection,
  Project,
  StudioPackage,
  StudioPackageMode,
  StudioPackageType,
  StudioSection,
} from "../types";

type Flow = "home" | "sheet" | "collection" | "pitch" | "cv" | "tender";
type SheetVariant = "hero" | "plan" | "collage";
const labels: Record<StudioPackageType, string> = {
  single_project_sheet: "Project Sheet",
  project_collection: "Project Collection",
  pitch: "Pitch",
  cv: "CV",
  tender: "Tender Response",
};
const source = (project: Project, type = "approved_project") => ({
  sourceType: type,
  sourceId: project.id,
  sourceProjectId: project.id,
  sourceStatus: "approved",
  confidentialityStatus: project.confidentiality,
});
const section = (
  sectionType: string,
  title: string,
  body: string,
  order: number,
  sources: StudioSection["sources"] = [],
): StudioSection => ({
  id: createUuid(),
  sectionType,
  sectionOrder: order,
  title,
  body,
  status: "draft",
  sources,
});
const imageAssets = (project: Project) =>
  project.assets.filter(
    (asset) =>
      asset.url &&
      ["hero", "photo", "render", "plan", "section", "diagram"].includes(
        asset.type,
      ),
  );
const projectSummary = (project: Project) =>
  approvedDraftSections(project).find((item) => item.key === "summary")
    ?.value || project.story.brief;
const projectNarrative = (project: Project) =>
  approvedDraftSections(project).find(
    (item) => item.label === "Project narrative",
  )?.value || project.story.response;
const eligibleProject = (project: Project, mode: StudioPackageMode) =>
  project.status !== "Archived" &&
  (mode === "internal" || project.confidentiality !== "internal-only");
const capabilityIntroduction = (projects: Project[], purpose: string) => {
  const sectors = [
      ...new Set(projects.map((project) => project.sector).filter(Boolean)),
    ],
    services = [
      ...new Set(
        projects.flatMap((project) => project.services).filter(Boolean),
      ),
    ].slice(0, 5),
    conditions = [
      ...new Set(projects.flatMap((project) => project.tags).filter(Boolean)),
    ].slice(0, 4);
  return [
    `This collection brings together ${projects.length} approved project precedent${projects.length === 1 ? "" : "s"}${sectors.length ? ` across ${sectors.join(", ")}` : ""}.`,
    services.length
      ? `Together, the work demonstrates applied capability in ${services.join(", ")}.`
      : "",
    conditions.length
      ? `The selected projects provide grounded evidence across ${conditions.join(", ")}.`
      : "",
    purpose
      ? `The collection is curated for ${purpose.trim().replace(/[.]$/, "")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};
const sampleTender = {
  tender_title: "Regional Places and Precinct Strategy",
  client: "Sample public-sector client",
  client_needs:
    "A clear place-led strategy supported by relevant precinct planning and engagement experience.",
  evaluation_criteria: [
    "Demonstrated place and precinct strategy experience",
    "Evidence of stakeholder and community engagement",
    "A credible approach to public-domain outcomes",
  ],
  mandatory_requirements: [
    "Nominate relevant project precedents",
    "Identify the proposed team and their explicit roles",
  ],
  capability_to_prove: [
    "Place strategy",
    "Urban design",
    "Stakeholder engagement",
  ],
  key_decision_factors: [
    "Direct relevance of precedents",
    "Clarity of individual experience",
    "Evidence-backed public benefit",
  ],
  team_evidence_required: ["Explicit project role", "Approved contribution"],
  evidence_gaps: [
    "No evidence should be claimed for qualifications or mandatory criteria not recorded in Folion.",
  ],
};
const missingValue =
  /^(location not recorded|year not recorded|not available|uncategorised|unknown|n\/a)$/i;
const populated = (value: unknown) =>
  typeof value === "string" &&
  Boolean(value.trim()) &&
  !missingValue.test(value.trim());
const sanctuaryFixture = {
  client: "Sekisui House",
  location: "Wentworth Point, NSW",
  year: "2016–2019",
  services:
    "Urban Design; Independent Urban Design Review; Strategic Design Advisory",
  referee: "Zac Petrovic, Development Manager, Sekisui House",
};

export default function StudioV2() {
  const { session } = useAuth(),
    { projects, people, collections, workspace } = useStore(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState<StudioPackage[]>([]),
    [active, setActive] = useState<StudioPackage | null>(null),
    [flow, setFlow] = useState<Flow>("home"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const result = await apiRequest<{ packages: StudioPackage[] }>(
        session,
        "/v1/packages",
      );
      setPackages(result.packages);
      const id = params.get("package");
      setActive(
        id ? result.packages.find((item) => item.id === id) || null : null,
      );
      setFlow("home");
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Studio could not load saved packages",
      );
    } finally {
      setLoading(false);
    }
  }, [session, params]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = (item: StudioPackage) => {
    setActive(item);
    setParams({ package: item.id });
  };
  const close = () => {
    setActive(null);
    setParams({});
    setFlow("home");
  };
  const created = (item: StudioPackage) => {
    setPackages((current) => [
      item,
      ...current.filter((value) => value.id !== item.id),
    ]);
    open(item);
  };
  if (active)
    return (
      <PackageWorkspace
        item={active}
        projects={projects}
        people={people.filter(person=>person.status==='active')}
        workspace={workspace}
        onBack={close}
      />
    );
  if (flow === "sheet")
    return (
      <ProjectSheetSetup
        projects={projects}
        onBack={() => setFlow("home")}
        onCreated={created}
      />
    );
  if (flow === "collection")
    return (
      <CollectionSetup
        projects={projects}
        collections={collections}
        onBack={() => setFlow("home")}
        onCreated={created}
      />
    );
  if (flow === "pitch")
    return (
      <PitchSetup
        projects={projects}
        onBack={() => setFlow("home")}
        onCreated={created}
      />
    );
  if (flow === "cv")
    return (
      <CvSetup
        projects={projects}
        people={people.filter(person=>person.status==='active')}
        onBack={() => setFlow("home")}
        onCreated={created}
      />
    );
  if (flow === "tender")
    return (
      <TenderSetupNew
        projects={projects}
        people={people.filter(person=>person.status==='active')}
        onBack={() => setFlow("home")}
        onCreated={created}
      />
    );
  return (
    <div className="sv2">
      <header className="sv2-intro">
        <p className="eyebrow">Studio V2</p>
        <h1>What are you making?</h1>
        <p>
          Compose editorial packages from approved project knowledge and
          selected source assets.
        </p>
      </header>
      {error && <p className="auth-message error">{error}</p>}
      <div className="sv2-choices">
        <Choice
          icon={FileText}
          title="Project Sheet"
          body="One portrait A4 project story."
          onClick={() => setFlow("sheet")}
        />
        <Choice
          icon={Layers3}
          title="Project Collection"
          body="A capability introduction followed by project sheets."
          onClick={() => setFlow("collection")}
        />
        <Choice
          icon={Presentation}
          title="Pitch"
          body="Analyse a briefing and compose an evidence-led visual narrative."
          onClick={() => setFlow("pitch")}
        />
        <Choice
          icon={Users}
          title="CV"
          body="Role-safe experience tailored to a brief."
          onClick={() => setFlow("cv")}
        />
        <Choice
          icon={BookOpen}
          title="Tender Response"
          body="Understand a tender and assemble grounded evidence."
          onClick={() => setFlow("tender")}
        />
      </div>
      <section className="sv2-saved">
        <p className="eyebrow">Saved work</p>
        <h2>Packages</h2>
        {loading ? (
          <p>Loading packages…</p>
        ) : !packages.length ? (
          <p>No Studio V2 packages yet.</p>
        ) : (
          <div>
            {packages
              .filter((item) =>
                String(item.data.template || "").startsWith("studio-v2"),
              )
              .map((item) => (
                <button key={item.id} onClick={() => open(item)}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {labels[item.packageType]} · {item.mode}
                    </small>
                  </span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </button>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Choice({
  icon: Icon,
  title,
  body,
  onClick,
  disabled = false,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button disabled={disabled} onClick={onClick}>
      <Icon />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      {disabled && <em>On hold</em>}
    </button>
  );
}

function ProjectSheetSetup({
  projects,
  onBack,
  onCreated,
}: {
  projects: Project[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth();
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [projectId, setProjectId] = useState(""),
    [search, setSearch] = useState(""),
    [sector, setSector] = useState(""),
    [location, setLocation] = useState(""),
    [client, setClient] = useState(""),
    [year, setYear] = useState(""),
    [service, setService] = useState(""),
    [status, setStatus] = useState(""),
    [variant, setVariant] = useState<SheetVariant>("hero"),
    [imageZoom,setImageZoom]=useState(1),
    [imageX,setImageX]=useState(50),
    [imageY,setImageY]=useState(50),
    [keyFocus,setKeyFocus]=useState(""),
    [primary, setPrimary] = useState(""),
    [support, setSupport] = useState<string[]>([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const options = (values: string[]) => [...new Set(values.filter(Boolean))].sort(),
    available = projects.filter((item) => eligibleProject(item, mode)),
    eligible = available.filter(
      (item) =>
        (!search || item.projectName.toLowerCase().includes(search.toLowerCase())) &&
        (!sector || item.sector === sector) &&
        (!location || item.location === location) &&
        (!client || item.client === client) &&
        (!year || item.year === year) &&
        (!service || item.services.includes(service)) &&
        (!status || item.status === status),
    ),
    project = eligible.find((item) => item.id === projectId),
    assets = project ? imageAssets(project) : [];
  useEffect(() => {
    if (project && !primary) setPrimary(assets[0]?.id || "");
  }, [project, assets, primary]);
  useEffect(()=>{if(!project)return setKeyFocus("");setKeyFocus([project.story.challenge,project.story.response,project.whyItMatters].filter(populated).join(" "))},[projectId]);
  const create = async () => {
    if (!session || !project)
      return setError("Select one existing project.");
    setSaving(true);
    try {
      const facts = reviewedKnowledgeFacts(project),
        sections = [
          section(
            "project_summary",
            "Project description",
            projectSummary(project),
            0,
            [source(project, "approved_project_summary")],
          ),
          section(
            "project_narrative",
            "Project narrative",
            projectNarrative(project),
            1,
            [source(project, "approved_project_narrative")],
          ),
          section(
            "project_facts",
            "Project facts",
            facts.map((item) => `${item.label}: ${item.value}`).join("\n"),
            2,
            facts.map(() => source(project, "approved_project_fact")),
          ),
          section(
            "outcomes",
            "Outcomes and relevance",
            [project.story.outcome, project.whyItMatters]
              .filter(Boolean)
              .join("\n\n"),
            3,
            [source(project)],
          ),
          section("key_focus","Key Focus",keyFocus.trim(),4,[source(project)]),
        ];
      const result = await apiRequest<{ package: StudioPackage }>(
        session,
        "/v1/packages",
        {
          method: "POST",
          body: JSON.stringify({
            packageType: "single_project_sheet",
            title: project.projectName,
            mode,
            state: "draft",
            data: {
              template: "studio-v2-project-sheet",
              variant,
              projectId: project.id,
              primaryAssetId: primary,
              supportAssetIds: support,
              imageCrop:{zoom:imageZoom,x:imageX,y:imageY},
            },
            sections,
            projectIds: [project.id],
            personIds: [],
            assetIds: [primary, ...support].filter(Boolean),
          }),
        },
      );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Project Sheet could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a Project Sheet" onBack={onBack} error={error}>
      <Mode
        value={mode}
        onChange={(value) => {
          setMode(value);
          setProjectId("");
          setPrimary("");
          setSupport([]);
        }}
      />
      <Field title="Choose an existing project">
        <label className="label">
          Search by project name
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" />
        </label>
        <div className="sv2-filter-grid">
          <select aria-label="Sector or typology" value={sector} onChange={(event) => setSector(event.target.value)}><option value="">All sectors / typologies</option>{options(available.map(item=>item.sector)).map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label="Location" value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All locations</option>{options(available.map(item=>item.location)).map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label="Client" value={client} onChange={(event) => setClient(event.target.value)}><option value="">All clients</option>{options(available.map(item=>item.client)).map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{options(available.map(item=>item.year)).map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label="Service" value={service} onChange={(event) => setService(event.target.value)}><option value="">All services</option>{options(available.flatMap(item=>item.services)).map(value=><option key={value}>{value}</option>)}</select>
          <select aria-label="Project status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All project statuses</option>{options(available.map(item=>item.status)).map(value=><option key={value}>{value}</option>)}</select>
        </div>
        {eligible.map((item) => (
          <SelectRow
            key={item.id}
            checked={projectId === item.id}
            type="radio"
            title={item.projectName}
            detail={`${item.location} · ${item.confidentiality.replaceAll("-", " ")}`}
            onChange={() => {
              setProjectId(item.id);
              setPrimary("");
              setSupport([]);
            }}
          />
        ))}
      </Field>
      <Field title="Page composition">
        <div className="sv2-variant">
          {(["hero", "plan", "collage"] as SheetVariant[]).map((value) => (
            <button
              className={variant === value ? "active" : ""}
              onClick={() => setVariant(value)}
              key={value}
            >
              {value === "hero"
                ? "Hero-led"
                : value === "plan"
                  ? "Plan / map-led"
                  : "Collage-led"}
            </button>
          ))}
        </div>
      </Field>
      {project && (
        <Field title="Select visual material">
          <div className="sv2-assets">
            {assets.map((asset) => (
              <label key={asset.id}>
                <input
                  type="radio"
                  name="primary"
                  checked={primary === asset.id}
                  onChange={() => setPrimary(asset.id)}
                />
                <img src={asset.url} alt="" />
                <span>
                  {asset.title || asset.fileName || asset.type}
                  <small>Primary image</small>
                </span>
              </label>
            ))}
          </div>
          {variant === "collage" && (
            <div className="sv2-support">
              <p>Supporting images (up to two)</p>
              {assets
                .filter((asset) => asset.id !== primary)
                .map((asset) => (
                  <SelectRow
                    key={asset.id}
                    checked={support.includes(asset.id)}
                    type="checkbox"
                    title={asset.title || asset.fileName || asset.type}
                    detail={asset.type}
                    onChange={() =>
                      setSupport((current) =>
                        current.includes(asset.id)
                          ? current.filter((id) => id !== asset.id)
                          : current.length < 2
                            ? [...current, asset.id]
                            : current,
                      )
                    }
                  />
                ))}
            </div>
          )}
        </Field>
      )}
      {project&&<Field title="Image framing"><label className="label">Zoom<input type="range" min="1" max="2" step="0.01" value={imageZoom} onChange={event=>setImageZoom(Number(event.target.value))}/></label><label className="label">Horizontal position<input type="range" min="0" max="100" value={imageX} onChange={event=>setImageX(Number(event.target.value))}/></label><label className="label">Vertical position<input type="range" min="0" max="100" value={imageY} onChange={event=>setImageY(Number(event.target.value))}/></label><Button variant="ghost" onClick={()=>{setImageZoom(1);setImageX(50);setImageY(50)}}>Reset crop</Button></Field>}
      {project&&<label className="label">Key Focus<textarea value={keyFocus} onChange={event=>setKeyFocus(event.target.value)} placeholder="Add the distinctive challenge, opportunity, innovation or strategic focus supported by approved project knowledge."/><small>Editable output based only on approved project content.</small></label>}
      <button
        className="sv2-primary"
        disabled={saving || !project}
        onClick={create}
      >
        {saving ? "Creating…" : "Create Project Sheet"}
      </button>
    </Setup>
  );
}

function CollectionSetup({
  projects,
  collections,
  onBack,
  onCreated,
}: {
  projects: Project[];
  collections: Collection[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth();
  const [collectionId, setCollectionId] = useState(""),
    [collectionSearch,setCollectionSearch]=useState(""),
    [format, setFormat] = useState<"card_grid" | "expanded">("expanded"),
    [introDraft,setIntroDraft]=useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    collection = collections.find((item) => item.id === collectionId),
    selected =
      (collection?.projectIds
        .map((id) => projects.find((project) => project.id === id))
        .filter(
          (project) => project && eligibleProject(project, "internal"),
        ) as Project[]) || [];
  useEffect(()=>{setIntroDraft(collection?.approvedNarrative||"")},[collectionId]);
  const create = async () => {
    if (!session || !collection) return setError("Select a collection.");
    if (!collection.brief.trim())
      return setError(
        "Add a Collection Brief in Projects before creating a polished opening page.",
      );
    if (!collection.approvedNarrative.trim())
      return setError("Generate and approve the Collection Narrative in Projects before export.");
    if (!selected.length)
      return setError(
        "The collection needs at least one existing project.",
      );
    setSaving(true);
    try {
      const themes = [
          ...new Set(
            selected.flatMap((project) => project.services).filter(populated),
          ),
        ].slice(0, 3),
        intro = introDraft.trim(),
        sections = [
          section(
            "capability_intro",
            "Capability proposition",
            intro,
            0,
            selected.map((project) => source(project)),
          ),
          ...selected.map((project, index) =>
            section(
              "project_sheet",
              project.projectName,
              [projectSummary(project), projectNarrative(project)]
                .filter(Boolean)
                .join("\n\n"),
              index + 1,
              [source(project)],
            ),
          ),
        ],
        result = await apiRequest<{ package: StudioPackage }>(
          session,
          "/v1/packages",
          {
            method: "POST",
            body: JSON.stringify({
              packageType: "project_collection",
              title: collection.name,
              mode: "internal",
              state: "draft",
              data: {
                template: "studio-v2-collection",
                collectionId: collection.id,
                collectionBrief: collection.brief,
                themes,
                collectionFormat: format,
              },
              sections,
              projectIds: selected.map((project) => project.id),
              personIds: [],
              assetIds: selected
                .map((project) => imageAssets(project)[0]?.id)
                .filter(Boolean),
            }),
          },
        );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Collection package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a Project Collection" onBack={onBack} error={error}>
      <Field title="Choose a Collection">
        <label className="label">Search Collections<input value={collectionSearch} onChange={(event)=>setCollectionSearch(event.target.value)} placeholder="Search Collections"/></label>
        {collections.filter(item=>item.name.toLowerCase().includes(collectionSearch.toLowerCase())).map((item) => (
          <SelectRow
            key={item.id}
            checked={collectionId === item.id}
            type="radio"
            title={item.name}
            detail={item.brief || "Brief needed before polished Studio output"}
            onChange={() => setCollectionId(item.id)}
          />
        ))}
      </Field>
      {collection && (
        <div className="sv2-fixture">
          <strong>Collection Brief</strong>
          <p>
            {collection.brief ||
              "No brief yet. Edit this collection in Projects."}
          </p>
          <p>
            {selected.length} eligible selected project
            {selected.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
      {collection&&<label className="label">Opening narrative<textarea value={introDraft} onChange={(event)=>setIntroDraft(event.target.value)}/><small>Generated from the Collection Brief and approved selected-project evidence. Edit before export.</small></label>}
      <Field title="Export format">
        <SelectRow type="radio" checked={format==="card_grid"} title="Card Grid" detail="Visual project cards with image, title and year." onChange={()=>setFormat("card_grid")}/>
        <SelectRow type="radio" checked={format==="expanded"} title="Expanded Collection" detail="Opening narrative followed by one finished Project Sheet per project." onChange={()=>setFormat("expanded")}/>
      </Field>
      <button
        className="sv2-primary"
        disabled={saving || !collection}
        onClick={create}
      >
        {saving ? "Creating…" : "Create Collection package"}
      </button>
    </Setup>
  );
}
function PitchSetup({
  projects,
  onBack,
  onCreated,
}: {
  projects: Project[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth();
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [briefing, setBriefing] = useState(""),
    [projectIds, setProjectIds] = useState<string[]>([]),
    [analysed,setAnalysed]=useState(false),
    [analysing,setAnalysing]=useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const eligible = projects.filter((project) => eligibleProject(project, mode)&&(approvedDraftSections(project).length>0||(project.approvedEvidence?.length||0)>0)),
    pitchThemes=[...new Set(briefing.toLowerCase().split(/\W+/).filter(word=>word.length>4))],
    ranked=eligible.map(project=>{const corpus=[project.projectName,project.sector,project.client,project.location,...project.services,...project.tags,project.story.challenge,project.story.response,project.story.outcome,project.whyItMatters,projectNarrative(project)].join(" ").toLowerCase(),covered=pitchThemes.filter(theme=>corpus.includes(theme));return{project,covered,missing:pitchThemes.filter(theme=>!covered.includes(theme))}}).sort((a,b)=>b.covered.length-a.covered.length);
  const toggle = (id: string) =>
    setProjectIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const move=(id:string,direction:-1|1)=>setProjectIds(current=>{const index=current.indexOf(id),next=index+direction;if(index<0||next<0||next>=current.length)return current;const copy=[...current];[copy[index],copy[next]]=[copy[next],copy[index]];return copy});
  const analyse=()=>{if(!briefing.trim())return setError("Enter a Pitch Briefing.");if(!eligible.length)return setError("No project evidence is available for matching.");setAnalysing(true);setError("");setTimeout(()=>{setAnalysing(false);if(!ranked[0]?.covered.length){setAnalysed(false);setError("No adequate project evidence matched this Pitch Briefing.");return}setAnalysed(true);setProjectIds([])},250)};
  const create = async () => {
    if (!session) return;
    if (!briefing.trim()) return setError("Enter a Pitch Briefing.");
    if (!analysed || !projectIds.length)
      return setError("Analyse the briefing and select at least one matched project.");
    setSaving(true);
    try {
      const selected = projectIds
          .map((id) => projects.find((project) => project.id === id))
          .filter(Boolean) as Project[],
        lead = selected[0],
        services = [
          ...new Set(selected.flatMap((project) => project.services)),
        ].slice(0, 5),
        slides = [
          {
            kind: "cover",
            title:
              briefing.trim().split(/[.!?]/)[0].slice(0, 90) ||
              "A proposition for place",
            body: [lead.story.response,lead.whyItMatters].filter(populated).join(" "),
            projectId: lead.id,
            assetId: imageAssets(lead)[0]?.id,
          },
          {
            kind: "tension",
            title: "The defining opportunity",
            body: briefing.trim(),
            projectId: lead.id,
            assetId: imageAssets(lead)[0]?.id,
          },
          {
            kind: "success",
            title: "What success needs to achieve",
            body: [lead.story.challenge, lead.whyItMatters]
              .filter(Boolean)
              .join(" "),
            projectId: lead.id,
            assetId: imageAssets(lead)[1]?.id || imageAssets(lead)[0]?.id,
          },
          {
            kind: "precedent",
            title: "Precedent that makes the ambition tangible",
            body: projectNarrative(lead),
            projectId: lead.id,
            assetId: imageAssets(lead)[0]?.id,
          },
          ...selected
            .slice(1, 3)
            .map((project, index) => ({
              kind: "evidence",
              title: index
                ? "Evidence for enduring relevance"
                : "A response grounded in place",
              body: [project.story.response, project.story.outcome]
                .filter(Boolean)
                .join(" "),
              projectId: project.id,
              assetId: imageAssets(project)[0]?.id,
            })),
          {
            kind: "proof",
            title: "Capability assembled around the brief",
            body: services.length
              ? services.join(" · ")
              : selected
                  .map((project) => project.sector)
                  .filter(Boolean)
                  .join(" · "),
            projectId: lead.id,
            assetId: imageAssets(lead)[2]?.id || imageAssets(lead)[0]?.id,
          },
          {
            kind: "close",
            title: "A clear next move",
            body: selected.map(project=>project.story.outcome||project.whyItMatters).filter(populated).join(" "),
            projectId: lead.id,
            assetId: imageAssets(lead)[0]?.id,
          },
        ].slice(0, 8);
      const sections = slides.map((slide, index) =>
        section("pitch_slide", slide.title, slide.body, index, [
          source(projects.find((project) => project.id === slide.projectId)!),
        ]),
      );
      const result = await apiRequest<{ package: StudioPackage }>(
        session,
        "/v1/packages",
        {
          method: "POST",
          body: JSON.stringify({
            packageType: "pitch",
            title: slides[0].title,
            mode,
            state: "draft",
            data: { template: "studio-v2-pitch", briefing, slides },
            sections,
            projectIds,
            personIds: [],
            assetIds: slides.map((slide) => slide.assetId).filter(Boolean),
          }),
        },
      );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pitch package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a Pitch Package" onBack={onBack} error={error}>
      <Mode
        value={mode}
        onChange={(value) => {
          setMode(value);
          setProjectIds([]);
          setAnalysed(false);
        }}
      />
      <label className="label">
        Pitch Briefing
        <textarea
          value={briefing}
          onChange={(event) => {setBriefing(event.target.value);setAnalysed(false);setProjectIds([])}}
          placeholder="Describe what is being pitched, the opportunity, tension and desired narrative."
        />
      </label>
      <button className="sv2-primary" disabled={analysing||!briefing.trim()} onClick={analyse}>{analysing?"Analysing…":"Analyse Pitch"}</button>
      {analysed&&<Field title={`Ranked project matches · ${projectIds.length} selected`}><div className="sv2-pitch-matches">{ranked.map(({project,covered,missing},index)=>{const image=imageAssets(project)[0];return <article key={project.id} className={projectIds.includes(project.id)?"selected":""}>{image&&<img src={image.url} alt=""/>}<div><span>#{index+1}</span><h3>{project.projectName}</h3><p>{[project.year,project.client,project.location].filter(populated).join(" · ")}</p><strong>{covered.length} of {pitchThemes.length} pitch themes evidenced</strong><p>Why it matches: {[project.sector,...project.services,project.story.response].filter(populated).slice(0,4).join(" · ")}</p>{missing.length>0&&<small>Weak or missing evidence: {missing.slice(0,5).join(", ")}</small>}</div><button type="button" onClick={()=>toggle(project.id)}>{projectIds.includes(project.id)?"Selected":"Select"}</button></article>})}</div>{projectIds.length>1&&<div className="sv2-order">{projectIds.map((id,index)=><div key={id}><span>{index+1}. {projects.find(project=>project.id===id)?.projectName}</span><button disabled={index===0} onClick={()=>move(id,-1)}>↑</button><button disabled={index===projectIds.length-1} onClick={()=>move(id,1)}>↓</button></div>)}</div>}</Field>}
      {analysed&&<button className="sv2-primary" disabled={saving||!projectIds.length} onClick={create}>{saving?"Creating…":"Create Pitch"}</button>}
    </Setup>
  );
}
function CvSetup({
  projects,
  people,
  onBack,
  onCreated,
}: {
  projects: Project[];
  people: {
    id: string;
    name: string;
    position: string;
    bio?: string;
    skills?: string[];
  }[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth();
  const assignments=projects.flatMap(project=>project.team.filter(member=>member.personStatus!=='deleted').map(member=>({personId:member.personId,projectId:project.id,roleTitle:member.projectRole,contributionSummary:member.contribution||'',approvalStatus:'approved' as const})));
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [personIds, setPersonIds] = useState<string[]>([]),
    [projectIds, setProjectIds] = useState<string[]>([]),
    [brief, setBrief] = useState(""),
    [matched, setMatched] = useState(false),
    [teamCounts,setTeamCounts]=useState<Record<string,number>>({"Team Lead":1,"Senior":0,"Junior":0,"Support / Management":0}),
    [slotSelections,setSlotSelections]=useState<Record<string,string[]>>({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const briefTerms = [...new Set(brief.toLowerCase().split(/\W+/).filter((word) => word.length > 3))];
  const personMatches = people.map((person) => {
    const approved = assignments.filter((item) => item.approvalStatus === "approved" && item.personId === person.id);
    const evidenceProjects = approved.map((item) => projects.find((project) => project.id === item.projectId)).filter(Boolean) as Project[];
    const corpus = [person.position, person.bio || "", ...(person.skills || []), ...approved.flatMap((item) => [item.roleTitle,item.contributionSummary]), ...evidenceProjects.flatMap((project) => [project.sector,...project.services,project.siteArea,project.height])].join(" ").toLowerCase();
    const covered = briefTerms.filter((term) => corpus.includes(term));
    return {person,approved,evidenceProjects,covered};
  }).sort((a,b)=>b.covered.length-a.covered.length);
  const score = (project: Project) => {
    const words = brief
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);
    return words.filter((word) =>
      [
        project.projectName,
        project.sector,
        project.location,
        ...project.services,
        ...project.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(word),
    ).length;
  };
  const roleSafe = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            eligibleProject(project, mode) &&
            assignments.some(
              (item) =>
                item.approvalStatus === "approved" &&
                item.projectId === project.id &&
                personIds.includes(item.personId),
            ),
        )
        .sort((a, b) => score(b) - score(a)),
    [projects, assignments, personIds, mode, brief],
  );
  const togglePerson = (id: string) => {
    const next = personIds.includes(id)
      ? personIds.filter((value) => value !== id)
      : [...personIds, id];
    setPersonIds(next);
    const recommended = projects
      .filter(
        (project) =>
          eligibleProject(project, mode) &&
          assignments.some(
            (item) =>
              item.approvalStatus === "approved" &&
              item.projectId === project.id &&
              next.includes(item.personId),
          ),
      )
      .sort((a, b) => score(b) - score(a))
      .slice(0, 5)
      .map((project) => project.id);
    setProjectIds(recommended);
  };
  const selectSlot=(slot:string,index:number,personId:string)=>{const selections={...slotSelections,[slot]:[...(slotSelections[slot]||[])]};selections[slot][index]=personId;setSlotSelections(selections);const next=[...new Set(Object.values(selections).flat().filter(Boolean))];setPersonIds(next);setProjectIds(projects.filter(project=>assignments.some(item=>item.approvalStatus==='approved'&&item.projectId===project.id&&next.includes(item.personId))).sort((a,b)=>score(b)-score(a)).slice(0,8).map(project=>project.id))};
  const create = async () => {
    if (!session || !personIds.length)
      return setError("Select a person or proposed team.");
    if (!projectIds.length)
      return setError("No explicit project role has been selected.");
    setSaving(true);
    try {
      const chosen = projectIds
        .map((id) => projects.find((project) => project.id === id))
        .filter(Boolean) as Project[];
      const profiles = people.filter((person) => personIds.includes(person.id));
      const summary = brief.trim()
        ? `For this opportunity, the selected team brings explicitly recorded experience across ${[...new Set(chosen.map((project) => project.sector).filter(Boolean))].join(", ")}. The project evidence below has been selected against the brief and retains each person's recorded project role.`
        : `The selected experience below is drawn only from explicit project-team assignments and approved project knowledge.`;
      const sections = [
        section(
          "cv_profile",
          "Bespoke Experience Summary",
          summary,
          0,
          personIds.map((id) => ({
            sourceType: "approved_person_profile",
            sourceId: id,
            sourcePersonId: id,
            sourceStatus: "approved",
          })),
        ),
        ...chosen.flatMap((project, index) =>
          project.team
            .filter(
              (member) =>
                personIds.includes(member.personId) &&
                member.projectRole.trim(),
            )
            .map((member) =>
              section(
                "cv_experience",
                `${member.name} · ${project.projectName}`,
                [
                  `Project-specific role: ${member.projectRole}`,
                  member.contribution &&
                    `Approved contribution: ${member.contribution}`,
                  projectSummary(project),
                  brief &&
                    `Brief relevance: ${project.sector}${project.services.length ? ` · ${project.services.join(", ")}` : ""}`,
                ]
                  .filter(Boolean)
                  .join("\n\n"),
                index + 1,
                [
                  {
                    ...source(project, "explicit_project_role"),
                    sourcePersonId: member.personId,
                  },
                ],
              ),
            ),
        ),
      ];
      const result = await apiRequest<{ package: StudioPackage }>(
        session,
        "/v1/packages",
        {
          method: "POST",
          body: JSON.stringify({
            packageType: "cv",
            title:
              profiles.length === 1
                ? `${profiles[0].name} · Bespoke CV`
                : "Proposed team CVs",
            mode,
            state: "draft",
            data: { template: "studio-v2-cv", brief, recommendedCount: 5 },
            sections,
            projectIds,
            personIds,
            assetIds: [],
          }),
        },
      );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "CV package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a CV" onBack={onBack} error={error}>
      <Mode
        value={mode}
        onChange={(value) => {
          setMode(value);
          setProjectIds([]);
        }}
      />
      <Field title="Step 1 · Define team structure"><div className="sv2-team-counts">{Object.entries(teamCounts).map(([slot,count])=><label className="label" key={slot}>{slot}<input type="number" min="0" max="12" value={count} onChange={event=>{setTeamCounts(current=>({...current,[slot]:Number(event.target.value)}));setMatched(false)}}/></label>)}</div></Field>
      <label className="label">
        Step 2 · Staffing brief
        <textarea
          value={brief}
          onChange={(event) => {setBrief(event.target.value);setMatched(false);setPersonIds([]);setProjectIds([])}}
          placeholder="Describe the expertise, sectors, scale, services and seniority needed."
        />
      </label>
      <button className="sv2-primary" disabled={!brief.trim()||!Object.values(teamCounts).some(Boolean)} onClick={()=>{setMatched(true);setError(brief.trim()?"":"Enter a CV / staffing brief.")}}>Step 3 · Match People</button>
      {matched&&<Field title="Step 4 · Select team">{Object.entries(teamCounts).flatMap(([slot,count])=>Array.from({length:count},(_,index)=><label className="label" key={`${slot}-${index}`}>{slot} {count>1?index+1:""}<select value={slotSelections[slot]?.[index]||""} onChange={event=>selectSlot(slot,index,event.target.value)}><option value="">Select ranked candidate</option>{personMatches.map(({person,covered,evidenceProjects})=><option key={person.id} value={person.id}>{person.name} · {person.position} · {covered.length} of {briefTerms.length} requirements · {evidenceProjects.length} precedents</option>)}</select></label>))}</Field>}
      {matched && <Field title="Ranked people">
        {personMatches.map(({person,evidenceProjects,covered}) => (
          <SelectRow
            key={person.id}
            checked={personIds.includes(person.id)}
            type="checkbox"
            title={person.name}
            detail={`${person.position} · ${covered.length} of ${briefTerms.length} brief requirements evidenced · ${evidenceProjects.map(project=>project.projectName).join(", ") || "No approved project role evidence"}`}
            onChange={() => togglePerson(person.id)}
          />
        ))}
      </Field>}
      {personIds.length > 0 && (
        <Field title="Selected experience · five recommended by default">
          {roleSafe.map((project) => (
            <SelectRow
              key={project.id}
              checked={projectIds.includes(project.id)}
              type="checkbox"
              title={project.projectName}
              detail={`${project.team
                .filter((member) => personIds.includes(member.personId))
                .map((member) => member.projectRole)
                .join(", ")} · ${project.location}`}
              onChange={() =>
                setProjectIds((current) =>
                  current.includes(project.id)
                    ? current.filter((id) => id !== project.id)
                    : [...current, project.id],
                )
              }
            />
          ))}
        </Field>
      )}
      <button className="sv2-primary" disabled={saving||!personIds.length} onClick={create}>
        {saving ? "Creating…" : "Create CV Package"}
      </button>
    </Setup>
  );
}
function TenderSetup({
  projects,
  people,
  onBack,
  onCreated,
}: {
  projects: Project[];
  people: { id: string; name: string; position: string }[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth(),
    { workspace } = useStore();
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [file, setFile] = useState<File | null>(null),
    [count, setCount] = useState(3),
    [projectIds, setProjectIds] = useState<string[]>([]),
    [personIds, setPersonIds] = useState<string[]>([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const eligible = projects.filter((project) => eligibleProject(project, mode));
  const toggle = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) =>
    setter((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const create = async () => {
    if (!session || !workspace || !supabase)
      return setError("A workspace session is required.");
    if (!file) return setError("Upload a Tender Brief in PDF or DOCX format.");
    if (
      !(
        (file.type === "application/pdf" && /\.pdf$/i.test(file.name)) ||
        (file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
          /\.docx$/i.test(file.name))
      )
    )
      return setError(
        "Unsupported Tender Brief. Choose a PDF or DOCX file; legacy .doc files are not supported.",
      );
    setSaving(true);
    try {
      const selectedProjects = projectIds.slice(0, count),
        sections = [
          section(
            "tender_understanding",
            "Tender understanding",
            "Analysis is being prepared from the uploaded tender.",
            0,
            [],
          ),
          section(
            "firm_statement",
            "Why this firm is right for this tender",
            "Draft after the Tender Understanding is reviewed.",
            1,
            selectedProjects.map((id) =>
              source(projects.find((project) => project.id === id)!),
            ),
          ),
          ...selectedProjects.map((id, index) => {
            const project = projects.find((value) => value.id === id)!;
            return section(
              "project_precedent",
              project.projectName,
              projectSummary(project),
              index + 2,
              [source(project)],
            );
          }),
        ];
      const result = await apiRequest<{ package: StudioPackage }>(
        session,
        "/v1/packages",
        {
          method: "POST",
          body: JSON.stringify({
            packageType: "tender",
            title: file.name.replace(/\.(pdf|docx)$/i, ""),
            mode,
            state: "draft",
            data: {
              template: "studio-v2-tender",
              projectCount: count,
              tenderSourceName: file.name,
            },
            sections,
            projectIds: selectedProjects,
            personIds,
            assetIds: [],
          }),
        },
      );
      const signed = await apiRequest<{
        sourceId: string;
        storagePath: string;
        token: string;
      }>(
        session,
        `/v1/packages/${encodeURIComponent(result.package.id)}/tender-source/upload-url`,
        {
          method: "POST",
          body: JSON.stringify({ filename: file.name, mimeType: file.type }),
        },
      );
      const { error: uploadError } = await supabase.storage
        .from("project-assets")
        .uploadToSignedUrl(signed.storagePath, signed.token, file, {
          contentType: file.type,
        });
      if (uploadError) throw uploadError;
      await apiRequest(
        session,
        `/v1/packages/${encodeURIComponent(result.package.id)}/tender-source`,
        {
          method: "POST",
          body: JSON.stringify({
            sourceId: signed.sourceId,
            storagePath: signed.storagePath,
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        },
      );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Tender package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a Tender Response" onBack={onBack} error={error}>
      <Mode
        value={mode}
        onChange={(value) => {
          setMode(value);
          setProjectIds([]);
        }}
      />
      <label className="label">
        Upload Tender Brief
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            setError("");
            setFile(event.target.files?.[0] || null);
          }}
        />
        <small>
          PDF pages and DOCX sections are extracted server-side. Scanned PDFs
          and legacy .doc files are not supported.
        </small>
      </label>
      <label className="label">
        Number of project precedents
        <input
          type="number"
          min="1"
          max="12"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </label>
      <Field title="Eligible approved projects">
        {eligible.map((project) => (
          <SelectRow
            key={project.id}
            checked={projectIds.includes(project.id)}
            type="checkbox"
            title={project.projectName}
            detail={`${project.sector} · ${project.location}`}
            onChange={() => toggle(project.id, setProjectIds)}
          />
        ))}
      </Field>
      <Field title="Proposed team">
        {people.map((person) => (
          <SelectRow
            key={person.id}
            checked={personIds.includes(person.id)}
            type="checkbox"
            title={person.name}
            detail={person.position}
            onChange={() => toggle(person.id, setPersonIds)}
          />
        ))}
      </Field>
      <button className="sv2-primary" disabled={saving} onClick={create}>
        {saving ? "Uploading tender…" : "Create and analyse tender"}
      </button>
    </Setup>
  );
}

function PlaceholderSetup({
  title,
  projects,
  people = [],
  packageType,
  template,
  onBack,
  onCreated,
}: {
  title: string;
  projects: Project[];
  people?: { id: string; name: string; position: string }[];
  packageType: StudioPackageType;
  template: string;
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth();
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [selected, setSelected] = useState<string[]>([]),
    [selectedPeople, setSelectedPeople] = useState<string[]>([]),
    [brief, setBrief] = useState(""),
    [count, setCount] = useState(5),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const eligible = projects.filter((item) => eligibleProject(item, mode));
  const toggle = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) =>
    setter((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const move = (id: string, direction: -1 | 1) =>
    setSelected((current) => {
      const index = current.indexOf(id),
        next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  const create = async () => {
    if (!session || !selected.length)
      return setError("Select at least one approved project.");
    if (packageType === "cv" && !selectedPeople.length)
      return setError("Select at least one person.");
    setSaving(true);
    try {
      const chosen = selected
        .map((id) => projects.find((item) => item.id === id))
        .filter(Boolean) as Project[];
      const sections = chosen.map((project, index) =>
        section(
          "project_sheet",
          project.projectName,
          [projectSummary(project), projectNarrative(project)]
            .filter(Boolean)
            .join("\n\n"),
          index + 1,
          [source(project)],
        ),
      );
      if (packageType === "project_collection")
        sections.unshift(
          section(
            "capability_intro",
            "Capability introduction",
            capabilityIntroduction(chosen, brief),
            0,
            chosen.map((item) => source(item)),
          ),
        );
      if (packageType === "cv")
        sections.unshift(
          section(
            "cv_profile",
            "Bespoke profile",
            brief,
            0,
            selectedPeople.map((id) => ({
              sourceType: "approved_person_profile",
              sourceId: id,
              sourcePersonId: id,
              sourceStatus: "approved",
            })),
          ),
        );
      if (packageType === "tender")
        sections.unshift(
          section("tender_understanding", "Tender understanding", brief, 0, []),
        );
      const result = await apiRequest<{ package: StudioPackage }>(
        session,
        "/v1/packages",
        {
          method: "POST",
          body: JSON.stringify({
            packageType,
            title,
            mode,
            state: "draft",
            data: { template, brief, projectCount: count },
            sections,
            projectIds: selected,
            personIds: selectedPeople,
            assetIds: chosen
              .map((project) => imageAssets(project)[0]?.id)
              .filter(Boolean),
          }),
        },
      );
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title={title} onBack={onBack} error={error}>
      <Mode value={mode} onChange={setMode} />
      <label className="label">
        Brief / purpose
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </label>
      {packageType === "tender" && (
        <label className="label">
          Tender PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) =>
              setBrief(
                (current) =>
                  current ||
                  `Tender source: ${event.target.files?.[0]?.name || ""}`,
              )
            }
          />
          <small>Stored as a package source when the tender is created.</small>
        </label>
      )}
      {packageType === "tender" && (
        <label className="label">
          Recommended project count
          <input
            type="number"
            min="1"
            max="12"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>
      )}
      {people.length > 0 && (
        <Field title="People">
          {people.map((person) => (
            <SelectRow
              key={person.id}
              checked={selectedPeople.includes(person.id)}
              type="checkbox"
              title={person.name}
              detail={person.position}
              onChange={() => toggle(person.id, setSelectedPeople)}
            />
          ))}
        </Field>
      )}
      <Field
        title={
          packageType === "cv" ? "Role-safe project experience" : "Projects"
        }
      >
        {eligible.map((project) => (
          <SelectRow
            key={project.id}
            checked={selected.includes(project.id)}
            type="checkbox"
            title={project.projectName}
            detail={`${project.location} · ${project.confidentiality.replaceAll("-", " ")}`}
            onChange={() => toggle(project.id, setSelected)}
          />
        ))}
      </Field>
      {packageType === "project_collection" && selected.length > 1 && (
        <section className="sv2-order">
          <h3>Page order</h3>
          {selected.map((id, index) => (
            <div key={id}>
              <span>
                {index + 1}.{" "}
                {projects.find((project) => project.id === id)?.projectName}
              </span>
              <button disabled={index === 0} onClick={() => move(id, -1)}>
                ↑
              </button>
              <button
                disabled={index === selected.length - 1}
                onClick={() => move(id, 1)}
              >
                ↓
              </button>
            </div>
          ))}
        </section>
      )}
      <button className="sv2-primary" disabled={saving} onClick={create}>
        {saving ? "Creating…" : "Create package"}
      </button>
    </Setup>
  );
}

function PackageWorkspace({
  item,
  projects,
  people,
  workspace,
  onBack,
}: {
  item: StudioPackage;
  projects: Project[];
  people: {
    id: string;
    name: string;
    position: string;
    bio?: string;
    skills?: string[];
  }[];
  workspace: ReturnType<typeof useStore>['workspace'];
  onBack: () => void;
}) {
  const project = projects.find((value) => value.id === item.projectIds[0]);
  const pagesRef = useRef<HTMLElement>(null),
    [exporting, setExporting] = useState(false),
    canExport = item.packageType !== "pitch";
  const download = async () => {
    if (!pagesRef.current) return;
    setExporting(true);
    try {
      await exportA4Pages(pagesRef.current, item.title);
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="sv2-workspace">
      <header>
        <button onClick={onBack}>
          <ArrowLeft />
          Studio V2
        </button>
        <div>
          <p className="eyebrow">{labels[item.packageType]}</p>
          <h1>{item.title}</h1>
        </div>
        <div className="sv2-workspace-actions">
          <span>Saved · {new Date(item.updatedAt).toLocaleString()}</span>
          {canExport ? (
            <button className="sv2-primary" disabled={exporting} onClick={() => void download()}>
              <FileDown size={16} /> {exporting ? "Preparing PDF…" : "Export PDF"}
            </button>
          ) : (
            <button disabled>Preview only — export coming next</button>
          )}
        </div>
      </header>
      <main ref={pagesRef} style={{'--studio-primary':workspace?.brandKit.primaryColour||'#18201D','--studio-accent':workspace?.brandKit.accentColour||'#D6FF5C','--studio-logo':workspace?.brandKit.logoUrl?`url(${workspace.brandKit.logoUrl})`:'none','--studio-brand-name':`"${(workspace?.name||'').replace(/"/g,'')}"`} as React.CSSProperties}>
        {item.packageType === "single_project_sheet" && project ? (
          <ProjectSheetPageNew item={item} project={project} />
        ) : item.packageType === "project_collection" ? (
          <CollectionPages item={item} projects={projects} />
        ) : item.packageType === "pitch" ? (
          <PitchPages item={item} projects={projects} />
        ) : item.packageType === "cv" ? (
          <CvPagesNew item={item} projects={projects} people={people} />
        ) : (
          <TenderPagesNew item={item} projects={projects} people={people} />
        )}
      </main>
    </div>
  );
}

function ProjectSheetPage({
  item,
  project,
}: {
  item: StudioPackage;
  project: Project;
}) {
  const primary =
      project.assets.find((asset) => asset.id === item.data.primaryAssetId) ||
      imageAssets(project)[0],
    support = ((item.data.supportAssetIds as string[]) || [])
      .map((id) => project.assets.find((asset) => asset.id === id))
      .filter(Boolean) as Asset[],
    variant = String(item.data.variant || "hero");
  const facts = reviewedKnowledgeFacts(project).slice(0, 6),
    summary =
      item.sections.find((value) => value.sectionType === "project_summary")
        ?.body || projectSummary(project),
    narrative =
      item.sections.find((value) => value.sectionType === "project_narrative")
        ?.body || projectNarrative(project),
    outcomes =
      item.sections.find((value) => value.sectionType === "outcomes")?.body ||
      [project.story.outcome, project.whyItMatters]
        .filter(Boolean)
        .join("\n\n");
  return (
    <article className={`sv2-page sv2-sheet ${variant}`}>
      <Visual primary={primary} support={support} />
      <section className="sv2-title">
        <p>{project.sector}</p>
        <h2>
          {project.projectName}
        </h2>
      </section>
      <section className="sv2-body">
        <aside>
          {facts.map((fact) => (
            <div key={fact.key}>
              <small>{fact.label}</small>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </aside>
        <div>
          <h3>Project Description</h3>
          <p>{summary}</p>
          <p>{narrative}</p>
        </div>
        <div>
          <h3>Outcomes + Relevance</h3>
          <p>
            {outcomes || "No approved outcome statement has been selected."}
          </p>
        </div>
      </section>
      <footer>Folion · Approved project knowledge</footer>
    </article>
  );
}
function Visual({ primary, support, crop }: { primary?: Asset; support: Asset[]; crop?:{zoom:number;x:number;y:number} }) {
  return (
    <div className="sv2-visual">
      {primary?.url ? (
        <img src={primary.url} alt={primary.caption || primary.title} style={crop?{objectFit:'contain',objectPosition:`${crop.x}% ${crop.y}%`,transform:`scale(${crop.zoom})`,background:'#e4e6e2'}:undefined}/>
      ) : (
        <div className="sv2-image-placeholder">
          Approved visual not selected
        </div>
      )}
      {support.map((asset) => (
        <img
          key={asset.id}
          src={asset.url}
          alt={asset.caption || asset.title}
        />
      ))}
    </div>
  );
}
function AssetImage({ asset }: { asset: Asset }) {
  return <img src={asset.url} alt={asset.caption || asset.title} />;
}
function CollectionPages({
  item,
  projects,
}: {
  item: StudioPackage;
  projects: Project[];
}) {
  const ordered = item.projectIds
      .map((id) => projects.find((project) => project.id === id))
      .filter(Boolean) as Project[],
    intro = item.sections.find(
      (value) => value.sectionType === "capability_intro",
    )?.body,
    themes = ((item.data.themes as string[]) || [])
      .filter(populated)
      .slice(0, 3),
    hero = ordered.flatMap(imageAssets)[0],
    format = String(item.data.collectionFormat || "expanded");
  if (format === "card_grid") {
    const pages: Project[][] = [];
    for (let index = 0; index < ordered.length; index += 6) pages.push(ordered.slice(index, index + 6));
    return <>{pages.map((projectsOnPage,pageIndex)=><article className="sv2-page sv2-card-grid" key={pageIndex}><header><p className="eyebrow">Project Collection</p><h2>{item.title}</h2>{pageIndex===0&&intro&&<p>{intro}</p>}</header><div>{projectsOnPage.map(project=>{const image=imageAssets(project)[0];return <article key={project.id}>{image&&<AssetImage asset={image}/>}<section><h3>{project.projectName}</h3>{populated(project.year)&&<p>{project.year}</p>}</section></article>})}</div></article>)}</>;
  }
  return (
    <>
      <article
        className={`sv2-page sv2-intro-page ${hero ? "has-image" : "text-led"}`}
      >
        {hero && (
          <div className="sv2-collection-image">
            <AssetImage asset={hero} />
          </div>
        )}
        <div className="sv2-collection-copy">
          <p className="eyebrow">Project Collection</p>
          <h2>{item.title}</h2>
          {intro && <p>{intro}</p>}
          {themes.length > 0 && (
            <div className="sv2-themes">
              {themes.map((theme, index) => (
                <div key={theme}>
                  <span>0{index + 1}</span>
                  <strong>{theme}</strong>
                </div>
              ))}
            </div>
          )}
          <small>
            {ordered.length} selected{" "}
            {ordered.length === 1 ? "project" : "projects"}
          </small>
        </div>
      </article>
      {ordered.map((project) => (
        <ProjectSheetPageNew
          key={project.id}
          item={{
            ...item,
            data: { ...item.data, primaryAssetId: imageAssets(project)[0]?.id },
          }}
          project={project}
        />
      ))}
    </>
  );
}
function CvPages({
  item,
  projects,
  people,
}: {
  item: StudioPackage;
  projects: Project[];
  people: {
    id: string;
    name: string;
    position: string;
    bio?: string;
    skills?: string[];
  }[];
}) {
  return (
    <>
      {people
        .filter((value) => item.personIds.includes(value.id))
        .map((person) => (
          <article className="sv2-page sv2-cv" key={person.id}>
            <header>
              <div>
                <h2>{person.name}</h2>
                <p>{person.position}</p>
              </div>
              <strong>FOLION</strong>
            </header>
            <section>
              <aside>
                <h3>Expertise</h3>
                <p>
                  {person.skills?.join("\n") ||
                    "Approved expertise not recorded."}
                </p>
              </aside>
              <main>
                <h3>Experience Summary</h3>
                <p>
                  {item.sections.find(
                    (value) => value.sectionType === "cv_profile",
                  )?.body || person.bio}
                </p>
                <h3>Selected Experience</h3>
                {projects
                  .filter(
                    (project) =>
                      item.projectIds.includes(project.id) &&
                      project.team.some(
                        (member) =>
                          member.personId === person.id &&
                          member.projectRole.trim(),
                      ),
                  )
                  .slice(0, 5)
                  .map((project) => {
                    const member = project.team.find(
                      (value) => value.personId === person.id,
                    )!;
                    return (
                      <div key={project.id}>
                        <h4>
                          {project.client ? `${project.client}, ` : ""}
                          {project.projectName}, {project.location} —{" "}
                          {member.projectRole}
                        </h4>
                        {member.contribution && <p>{member.contribution}</p>}
                        <p>{projectSummary(project)}</p>
                      </div>
                    );
                  })}
              </main>
            </section>
          </article>
        ))}
    </>
  );
}
function TenderPages({
  item,
  projects,
  people,
}: {
  item: StudioPackage;
  projects: Project[];
  people: { id: string; name: string; position: string }[];
}) {
  const { session } = useAuth();
  const [job, setJob] = useState<{
    status: string;
    analysis?: Record<string, unknown>;
    failure_reason?: string;
  } | null>(null);
  useEffect(() => {
    if (!session) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await apiRequest<{ job: typeof job }>(
          session,
          `/v1/packages/${encodeURIComponent(item.id)}/tender-analysis`,
        );
        if (!stopped) setJob(result.job);
        if (
          result.job &&
          ["queued", "extracting_text", "analysing"].includes(result.job.status)
        )
          timer = setTimeout(poll, 2500);
      } catch {}
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [session, item.id]);
  const selected = projects.filter((project) =>
      item.projectIds.includes(project.id),
    ),
    analysis = job?.analysis || {},
    list = (key: string) =>
      Array.isArray(analysis[key]) ? (analysis[key] as string[]) : [],
    firmStatement = `The selected evidence brings together approved experience across ${[...new Set(selected.map((project) => project.sector).filter(Boolean))].join(", ") || "the required project contexts"}${selected.flatMap((project) => project.services).length ? `, supported by recorded services in ${[...new Set(selected.flatMap((project) => project.services))].slice(0, 5).join(", ")}` : ""}. Each precedent and team role remains traceable to approved Folion records.`;
  return (
    <div className="sv2-tender-layout">
      <article className="sv2-page sv2-tender">
        <p className="eyebrow">Tender response</p>
        <h2>{String(analysis.tender_title || item.title)}</h2>
        <h3>Why this firm is right for this tender</h3>
        <p>{firmStatement}</p>
        <h3>Relevant project precedents</h3>
        {selected.map((project) => (
          <div key={project.id}>
            <strong>{project.projectName}</strong>
            <p>{projectSummary(project)}</p>
          </div>
        ))}
        {item.personIds.length > 0 && (
          <>
            <h3>Proposed team</h3>
            <p>
              {people
                .filter((person) => item.personIds.includes(person.id))
                .map((person) => person.name)
                .join(", ")}
            </p>
          </>
        )}
      </article>
      <aside className="sv2-inspector">
        <p className="eyebrow">Internal only</p>
        <h3>Tender Understanding</h3>
        {!job ? (
          <p>Waiting for analysis…</p>
        ) : job.status === "failed" ? (
          <p className="auth-message error">{job.failure_reason}</p>
        ) : job.status !== "ready_for_review" ? (
          <p>Folion is {job.status.replaceAll("_", " ")}…</p>
        ) : (
          <>
            <h4>What the client needs</h4>
            <p>{String(analysis.client_needs || "Not stated")}</p>
            <h4>Capability to prove</h4>
            <ul>
              {list("capability_to_prove").map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <h4>Decision factors</h4>
            <ul>
              {list("key_decision_factors").map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <h4>Team evidence</h4>
            <ul>
              {list("team_evidence_required").map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
            <h4>Evidence gaps</h4>
            <ul>
              {list("evidence_gaps").map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}

function PitchPages({
  item,
  projects,
}: {
  item: StudioPackage;
  projects: Project[];
}) {
  const initialSlides = Array.isArray(item.data.slides)
      ? (item.data.slides as Array<{
          kind: string;
          title: string;
          body: string;
          projectId: string;
          assetId?: string;
        }>)
      : [],
    [slides,setSlides]=useState(initialSlides),
    [active, setActive] = useState<number | null>(null);
  const render = (
    slide: (typeof slides)[number],
    index: number,
    preview = false,
  ) => {
    const project = projects.find((value) => value.id === slide.projectId),
      asset = project?.assets.find((value) => value.id === slide.assetId);
    return (
      <article
        className={`sv2-slide ${slide.kind} ${preview ? "preview" : ""}`}
        key={`${slide.title}-${index}`}
      >
        {asset?.url && <img src={asset.url} alt="" />}
        <div>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h2>{slide.title}</h2>
          <p>{slide.body}</p>
        </div>
      </article>
    );
  };
  return (
    <div className="sv2-deck">
      <header>
        <div>
          <p className="eyebrow">Deck overview</p>
          <h2>{slides.length} slide visual narrative</h2>
        </div>
        <button
          className="sv2-primary"
          onClick={() => setActive(0)}
          disabled={!slides.length}
        >
          Present deck
        </button>
      </header>
      <div className="sv2-slide-grid">
        {slides.map((slide, index) => (
          <button
            key={`${slide.title}-${index}`}
            onClick={() => setActive(index)}
          >
            {render(slide, index)}
          </button>
        ))}
      </div>
      <section className="sv2-slide-editor"><h3>Review key statements</h3>{slides.map((slide,index)=><label className="label" key={`${slide.kind}-${index}`}>Slide {index+1}<input value={slide.title} onChange={event=>setSlides(current=>current.map((value,i)=>i===index?{...value,title:event.target.value}:value))}/><textarea value={slide.body} onChange={event=>setSlides(current=>current.map((value,i)=>i===index?{...value,body:event.target.value}:value))}/></label>)}</section>
      {active !== null && slides[active] && (
        <div className="sv2-present">
          <button className="sv2-present-close" onClick={() => setActive(null)}>
            Close
          </button>
          {render(slides[active], active, true)}
          <nav>
            <button
              disabled={active === 0}
              onClick={() =>
                setActive((value) => Math.max(0, (value || 0) - 1))
              }
            >
              Previous
            </button>
            <span>
              {active + 1} / {slides.length}
            </span>
            <button
              disabled={active === slides.length - 1}
              onClick={() =>
                setActive((value) =>
                  Math.min(slides.length - 1, (value || 0) + 1),
                )
              }
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function ProjectSheetPageNew({
  item,
  project,
}: {
  item: StudioPackage;
  project: Project;
}) {
  const fixture = /sanctuary/i.test(project.projectName)
      ? sanctuaryFixture
      : null,
    primary =
      project.assets.find((asset) => asset.id === item.data.primaryAssetId) ||
      imageAssets(project)[0],
    support = ((item.data.supportAssetIds as string[]) || [])
      .map((id) => project.assets.find((asset) => asset.id === id))
      .filter(Boolean) as Asset[],
    variant = String(item.data.variant || "hero"),
    facts = [
      { label: "Client", value: fixture?.client || project.client },
      { label: "Location", value: fixture?.location || project.location },
      { label: "Year", value: fixture?.year || project.year },
      {
        label: "Services",
        value: fixture?.services || project.services.join("; "),
      },
      { label: "Referee", value: fixture?.referee },
      { label: "Role", value: project.identity?.role?.join(", ") },
      { label: "Site area", value: project.siteArea },
      { label: "GFA", value: project.gfa },
      { label: "Height", value: project.height },
    ].filter((fact) => populated(fact.value)),
    summary =
      item.sections.find((value) => value.sectionType === "project_summary")
        ?.body || projectSummary(project),
    narrative =
      item.sections.find((value) => value.sectionType === "project_narrative")
        ?.body || projectNarrative(project),
    outcomesText =
      item.sections.find((value) => value.sectionType === "outcomes")?.body ||
      [project.story.outcome, project.whyItMatters]
        .filter(populated)
        .join("\n\n"),
    outcomes = outcomesText.split(/\n\s*\n/).filter(populated),
    compactFacts = facts.length < 4,
    sparseOutcomes = outcomes.length < 3,
    crop=(item.data.imageCrop as {zoom:number;x:number;y:number}|undefined),
    keyFocus=item.sections.find(value=>value.sectionType==='key_focus')?.body||'';
  return (
    <article
      className={`sv2-page sv2-sheet ${variant} ${compactFacts ? "compact-facts" : ""} ${sparseOutcomes ? "sparse-outcomes" : ""} ${primary ? "" : "text-led"}`}
    >
      {primary ? (
        <Visual primary={primary} support={support} crop={crop} />
      ) : (
        <section className="sv2-text-lead">
          <p className="eyebrow">{project.sector || "Project"}</p>
          <p>{summary || narrative}</p>
        </section>
      )}
      <section className="sv2-title">
        {project.sector && <p>{project.sector}</p>}
        <h2>
          {project.projectName}
        </h2>
        {compactFacts && (
          <div className="sv2-meta-line">
            {facts.map((fact) => (
              <span key={fact.label}>
                <small>{fact.label}</small>
                {fact.value}
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="sv2-body">
        {!compactFacts && (
          <aside>
            {facts.map((fact) => (
              <div key={fact.label}>
                <small>{fact.label}</small>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </aside>
        )}
        <div className="sv2-description">
          <h3>Project Description</h3>
          {summary && <p>{summary}</p>}
          {narrative && narrative !== summary && <p>{narrative}</p>}
        </div>
        <div className="sv2-key-focus"><h3>Key Focus</h3>{keyFocus&&<p>{keyFocus}</p>}</div>
        {outcomes.length > 0 && (
          <div className="sv2-outcomes">
            <h3>Key Project Outcomes</h3>
            {outcomes.map((value) => (
              <p key={value}>{value}</p>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}

function CvPagesNew({
  item,
  projects,
  people,
}: {
  item: StudioPackage;
  projects: Project[];
  people: {
    id: string;
    name: string;
    position: string;
    bio?: string;
    skills?: string[];
  }[];
}) {
  return (
    <>
      {people
        .filter((value) => item.personIds.includes(value.id))
        .flatMap((person) => {
          const profile = person as typeof person & {
              education?: string[];
              affiliations?: string[];
              yearsExperience?: string;
              careerHistory?: string[];
            },
            experience = projects
              .filter(
                (project) =>
                  item.projectIds.includes(project.id) &&
                  project.team.some(
                    (member) =>
                      member.personId === person.id &&
                      member.projectRole.trim(),
                  ),
              )
              .slice(0, 5);
          return [
            <article className="sv2-page sv2-cv" key={`${person.id}-profile`}>
              <header>
                <div>
                  <h2>{person.name}</h2>
                  <p>{person.position}</p>
                </div>
                <strong>FOLION</strong>
              </header>
              <section>
                <aside>
                  {profile.education?.length ? (
                    <>
                      <h3>Education</h3>
                      <p>{profile.education.join("\n")}</p>
                    </>
                  ) : null}
                  {profile.affiliations?.length ? (
                    <>
                      <h3>Affiliations</h3>
                      <p>{profile.affiliations.join("\n")}</p>
                    </>
                  ) : null}
                  {profile.yearsExperience && (
                    <>
                      <h3>Years in practice</h3>
                      <p>{profile.yearsExperience}</p>
                    </>
                  )}{" "}
                  {person.skills?.length ? (
                    <>
                      <h3>Areas of Expertise</h3>
                      <p>{person.skills.join("\n")}</p>
                    </>
                  ) : null}
                </aside>
                <main>
                  <h3>Experience Summary</h3>
                  <p>
                    {item.sections.find(
                      (value) => value.sectionType === "cv_profile",
                    )?.body || person.bio}
                  </p>
                  {profile.careerHistory?.length ? (
                    <>
                      <h3>Career History</h3>
                      <p>{profile.careerHistory.join("\n")}</p>
                    </>
                  ) : null}
                </main>
              </section>
            </article>,
            <article
              className="sv2-page sv2-cv sv2-cv-experience"
              key={`${person.id}-experience`}
            >
              <header>
                <div>
                  <p className="eyebrow">Selected Experience</p>
                  <h2>{person.name}</h2>
                </div>
                <strong>02</strong>
              </header>
              <main>
                {experience.map((project) => {
                  const member = project.team.find(
                    (value) => value.personId === person.id,
                  )!;
                  return (
                    <section key={project.id}>
                      <h4>
                        {project.client ? `${project.client}, ` : ""}
                        {project.projectName}, {project.location} —{" "}
                        {member.projectRole}
                      </h4>
                      <p>
                        {member.contribution ||
                          `Recorded role: ${member.projectRole}.`}
                      </p>
                      <p>{projectSummary(project)}</p>
                    </section>
                  );
                })}
              </main>
            </article>,
          ];
        })}
    </>
  );
}

function TenderSetupNew({
  projects,
  people,
  onBack,
  onCreated,
}: {
  projects: Project[];
  people: { id: string; name: string; position: string }[];
  onBack: () => void;
  onCreated: (item: StudioPackage) => void;
}) {
  const { session } = useAuth(),
    { workspace } = useStore();
  const [mode, setMode] = useState<StudioPackageMode>("internal"),
    [file, setFile] = useState<File | null>(null),
    [fixture, setFixture] = useState(false),
    [pasteMode, setPasteMode] = useState(false),
    [pastedText, setPastedText] = useState(""),
    [count, setCount] = useState(3),
    [projectIds, setProjectIds] = useState<string[]>([]),
    [personIds, setPersonIds] = useState<string[]>([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    eligible = projects.filter((project) => eligibleProject(project, mode)),
    toggle = (
      id: string,
      setter: React.Dispatch<React.SetStateAction<string[]>>,
    ) =>
      setter((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id],
      );
  const create = async () => {
    if (!session || !workspace || !supabase)
      return setError("A workspace session is required.");
    if (!fixture && !pasteMode && !file)
      return setError(
        "Upload a Tender Brief in PDF or DOCX format, or use the controlled sample tender.",
      );
    if (
      !fixture && !pasteMode &&
      file &&
      !(
        (file.type === "application/pdf" && /\.pdf$/i.test(file.name)) ||
        (file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
          /\.docx$/i.test(file.name))
      )
    )
      return setError(
        "Unsupported Tender Brief. Choose a PDF or DOCX file; legacy .doc files are not supported.",
      );
    setSaving(true);
    try {
      const selected = projectIds.slice(0, count),
        title = fixture
          ? sampleTender.tender_title
          : pasteMode
            ? "Pasted Tender Brief"
            : file!.name.replace(/\.(pdf|docx)$/i, ""),
        sections = [
          section(
            "tender_understanding",
            "Tender understanding",
            fixture
              ? sampleTender.client_needs
              : "Analysis is being prepared from the uploaded tender.",
            0,
            [],
          ),
          ...selected.map((id, index) => {
            const project = projects.find((value) => value.id === id)!;
            return section(
              "project_precedent",
              project.projectName,
              projectSummary(project),
              index + 1,
              [source(project)],
            );
          }),
        ],
        result = await apiRequest<{ package: StudioPackage }>(
          session,
          "/v1/packages",
          {
            method: "POST",
            body: JSON.stringify({
              packageType: "tender",
              title,
              mode,
              state: "draft",
              data: {
                template: "studio-v2-tender",
                projectCount: count,
                tenderSourceName: fixture
                  ? "Controlled sample tender"
                  : pasteMode ? "Pasted Tender Brief" : file!.name,
                tenderFixture: fixture ? sampleTender : null,
              },
              sections,
              projectIds: selected,
              personIds,
              assetIds: [],
            }),
          },
        );
      if (file && !fixture) {
        const signed = await apiRequest<{
            sourceId: string;
            storagePath: string;
            token: string;
          }>(
            session,
            `/v1/packages/${encodeURIComponent(result.package.id)}/tender-source/upload-url`,
            {
              method: "POST",
              body: JSON.stringify({ filename: file.name, mimeType: file.type }),
            },
          ),
          uploaded = await supabase.storage
            .from("project-assets")
            .uploadToSignedUrl(signed.storagePath, signed.token, file, {
              contentType: file.type,
            });
        if (uploaded.error) throw uploaded.error;
        await apiRequest(
          session,
          `/v1/packages/${encodeURIComponent(result.package.id)}/tender-source`,
          {
            method: "POST",
            body: JSON.stringify({
              sourceId: signed.sourceId,
              storagePath: signed.storagePath,
              filename: file.name,
              mimeType: file.type,
              fileSize: file.size,
            }),
          },
        );
      }
      if (pasteMode && !fixture) {
        await apiRequest(
          session,
          `/v1/packages/${encodeURIComponent(result.package.id)}/tender-source`,
          { method: "POST", body: JSON.stringify({ pastedText }) },
        );
      }
      onCreated(result.package);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Tender package could not be created",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Setup title="Create a Tender Response" onBack={onBack} error={error}>
      <Mode
        value={mode}
        onChange={(value) => {
          setMode(value);
          setProjectIds([]);
        }}
      />
      <div className="sv2-source-choice">
        <label>
          <input
            type="radio"
            checked={!fixture && !pasteMode}
            onChange={() => { setFixture(false); setPasteMode(false); }}
          />
          Upload Tender Brief
        </label>
        <label>
          <input type="radio" checked={pasteMode} onChange={() => { setFixture(false); setPasteMode(true); setFile(null); }} />
          Paste Tender Brief text
        </label>
        <label>
          <input
            type="radio"
            checked={fixture}
            onChange={() => { setFixture(true); setPasteMode(false); setFile(null); }}
          />
          Use controlled sample tender
        </label>
      </div>
      {!fixture && !pasteMode && (
        <label className="label">
          Upload Tender Brief
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setError("");
              setFile(event.target.files?.[0] || null);
            }}
          />
          <small>
            PDF pages and DOCX sections are analysed server-side. Scanned PDFs
            and legacy .doc files are not supported.
          </small>
        </label>
      )}
      {pasteMode && <label className="label">Paste Tender Brief<textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} placeholder="Paste the tender scope, evaluation criteria and requirements"/><small>Folion analyses only the text supplied here.</small></label>}
      {fixture && (
        <div className="sv2-fixture">
          <strong>{sampleTender.tender_title}</strong>
          <p>{sampleTender.client_needs}</p>
        </div>
      )}
      <label className="label">
        Number of project precedents
        <input
          type="number"
          min="1"
          max="12"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </label>
      <Field title="Approved projects">
        {eligible.map((project) => (
          <SelectRow
            key={project.id}
            checked={projectIds.includes(project.id)}
            type="checkbox"
            title={project.projectName}
            detail={`${project.sector} · ${project.location}`}
            onChange={() => toggle(project.id, setProjectIds)}
          />
        ))}
      </Field>
      <Field title="People with relevant recorded experience">
        {people
          .filter((person) =>
            projects.some((project) =>
              project.team.some(
                (member) =>
                  member.personId === person.id && member.projectRole.trim(),
              ),
            ),
          )
          .map((person) => (
            <SelectRow
              key={person.id}
              checked={personIds.includes(person.id)}
              type="checkbox"
              title={person.name}
              detail={person.position}
              onChange={() => toggle(person.id, setPersonIds)}
            />
          ))}
      </Field>
      <button
        className="sv2-primary"
        disabled={saving || (pasteMode && !pastedText.trim())}
        onClick={create}
      >
        {saving ? "Analysing…" : "Analyse Tender"}
      </button>
    </Setup>
  );
}

function TenderPagesNew({
  item,
  projects,
  people,
}: {
  item: StudioPackage;
  projects: Project[];
  people: { id: string; name: string; position: string }[];
}) {
  const { session } = useAuth(),
    fixture = item.data.tenderFixture as typeof sampleTender | null,
    [job, setJob] = useState<{
      status: string;
      analysis?: Record<string, unknown>;
      failure_reason?: string;
    } | null>(null),
    [teamSlots,setTeamSlots]=useState<Record<string,string>>({"Team Lead":"","Senior":"","Junior":"","Support / Management":""});
  useEffect(() => {
    if (!session || fixture) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await apiRequest<{ job: typeof job }>(
          session,
          `/v1/packages/${encodeURIComponent(item.id)}/tender-analysis`,
        );
        if (!stopped) setJob(result.job);
        if (
          result.job &&
          ["queued", "extracting_text", "analysing"].includes(result.job.status)
        )
          timer = setTimeout(poll, 2500);
      } catch {}
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [session, item.id, fixture]);
  const analysis = (fixture || job?.analysis || {}) as Record<string, unknown>,
    criteria = Array.isArray(analysis.evaluation_criteria)
      ? (analysis.evaluation_criteria as string[])
      : [],
    matchingTerms = [...new Set(criteria.flatMap(value=>value.toLowerCase().split(/\W+/)).filter(word=>word.length>4))],
    rankedProjects = projects.filter(project=>project.status!=="Archived").map(project=>({project,covered:matchingTerms.filter(word=>[project.sector,...project.services,...project.tags,projectSummary(project),projectNarrative(project)].join(" ").toLowerCase().includes(word))})).sort((a,b)=>b.covered.length-a.covered.length),
    selected = rankedProjects.slice(0,Number(item.data.projectCount)||5).map(value=>value.project),
    selectedPeople = people.filter((person) =>
      item.personIds.includes(person.id),
    );
  const match = (criterion: string) => {
    const words = criterion
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 4),
      ranked = selected
        .map((project) => ({
          project,
          score: words.filter((word) =>
            [
              project.sector,
              ...project.services,
              ...project.tags,
              projectSummary(project),
            ]
              .join(" ")
              .toLowerCase()
              .includes(word),
          ).length,
        }))
        .sort((a, b) => b.score - a.score),
      best = ranked[0];
    return best?.score ? best.project : null;
  };
  return (
    <div className="sv2-tender-review">
      <header>
        <p className="eyebrow">Tender source and analysis</p>
        <h2>{String(analysis.tender_title || item.title)}</h2>
        <p>
          {String(
            analysis.client_needs ||
              "Analysis is being prepared from the uploaded tender.",
          )}
        </p>
        {!fixture && job?.status !== "ready_for_review" && (
          <span className="sv2-analysis-state">
            {job?.status?.replaceAll("_", " ") || "waiting for analysis"}
          </span>
        )}
      </header>
      <section className="sv2-requirement-map">
        <div className="sv2-map-head">
          <span>Requirement</span>
          <span>Matched evidence</span>
          <span>Relevance and draft response</span>
        </div>
        {criteria.map((criterion) => {
          const project = match(criterion),
            members =
              project?.team.filter(
                (member) =>
                  item.personIds.includes(member.personId) &&
                  member.projectRole.trim(),
              ) || [];
          return (
            <article key={criterion}>
              <div>
                <strong>{criterion}</strong>
                <small>
                  Source:{" "}
                  {fixture
                    ? "Controlled sample tender"
                    : "Uploaded tender analysis"}
                </small>
              </div>
              {project ? (
                <div>
                  <strong>{project.projectName}</strong>
                  <p>{project.services.join(", ") || project.sector}</p>
                  <small>
                    Approved project record
                    {members.length
                      ? ` · ${members.map((member) => `${member.name}: ${member.projectRole}`).join("; ")}`
                      : ""}
                  </small>
                </div>
              ) : (
                <div className="sv2-gap">
                  <strong>Evidence gap</strong>
                  <p>
                    No selected approved project directly supports this
                    requirement.
                  </p>
                </div>
              )}
              <div>
                {project ? (
                  <>
                    <strong>Why relevant</strong>
                    <p>{projectSummary(project)}</p>
                    <strong>Draft response</strong>
                    <p>
                      Our approved evidence includes {project.projectName},
                      where the recorded scope covers{" "}
                      {project.services.join(", ") || project.sector}.{" "}
                      {members.length
                        ? `The recorded individual experience includes ${members.map((member) => `${member.name} as ${member.projectRole}`).join(" and ")}.`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Gap — action required</strong>
                    <p>
                      Do not claim compliance. Confirm suitable evidence or
                      address this requirement outside Folion.
                    </p>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {!criteria.length && (
          <p className="sv2-fixture">
            Requirements will appear here when analysis is ready.
          </p>
        )}
      </section>
      {criteria.length>0&&<section className="sv2-tender-shortlist"><h3>Suggested project evidence</h3>{selected.map(project=>{const result=rankedProjects.find(value=>value.project.id===project.id)!;return <article key={project.id}><strong>{project.projectName}</strong><span>{result.covered.length} of {matchingTerms.length} tender criteria terms evidenced</span><p>{projectSummary(project)}</p>{matchingTerms.length>result.covered.length&&<small>Gap: {matchingTerms.filter(term=>!result.covered.includes(term)).slice(0,5).join(", ")}</small>}</article>})}</section>}
      {criteria.length>0&&<section className="sv2-team-builder"><h3>Tender team builder</h3>{Object.entries(teamSlots).map(([slot,personId])=><label className="label" key={slot}>{slot}<select value={personId} onChange={event=>setTeamSlots(current=>({...current,[slot]:event.target.value}))}><option value="">Select a person</option>{people.map(person=>{const relevant=selected.filter(project=>project.team.some(member=>member.personId===person.id&&member.projectRole.trim()));return <option key={person.id} value={person.id}>{person.name} · {person.position}{relevant.length?` · ${relevant.length} approved precedents`:" · no approved role evidence"}</option>})}</select></label>)}</section>}
      {selectedPeople.length > 0 && (
        <footer>
          Selected people:{" "}
          {selectedPeople.map((person) => person.name).join(", ")}
        </footer>
      )}
      {criteria.length>0&&<article className="sv2-page sv2-tender-output"><p className="eyebrow">Tender Response</p><h2>{String(analysis.tender_title||item.title)}</h2><section><h3>Requirement-to-evidence mapping</h3>{criteria.map(criterion=>{const project=match(criterion);return <div key={criterion}><strong>{criterion}</strong>{project?<p>{project.projectName} — {project.services.join(", ")||project.sector}</p>:<p className="sv2-gap-copy">Evidence gap — no approved project evidence selected.</p>}</div>})}</section><section><h3>Selected team</h3>{Object.entries(teamSlots).map(([slot,personId])=><div key={slot}><strong>{slot}</strong><p>{people.find(person=>person.id===personId)?.name||"Not selected — gap remains"}</p></div>)}</section></article>}
      {criteria.length>0&&selected.map(project=><ProjectSheetPageNew key={project.id} item={{...item,data:{...item.data,primaryAssetId:imageAssets(project)[0]?.id}}} project={project}/>)}
    </div>
  );
}

function Setup({
  title,
  onBack,
  error,
  children,
}: {
  title: string;
  onBack: () => void;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sv2 sv2-setup">
      <button className="detail-back" onClick={onBack}>
        <ArrowLeft />
        Studio V2
      </button>
      <header>
        <p className="eyebrow">New package</p>
        <h1>{title}</h1>
        <p>
          Choose approved knowledge and visual material. Your package remains
          editable and saved.
        </p>
      </header>
      {error && <p className="auth-message error">{error}</p>}
      <main>{children}</main>
    </div>
  );
}
function Mode({
  value,
  onChange,
}: {
  value: StudioPackageMode;
  onChange: (value: StudioPackageMode) => void;
}) {
  return (
    <fieldset className="sv2-mode">
      <legend>Use</legend>
      <label>
        <input
          type="radio"
          checked={value === "internal"}
          onChange={() => onChange("internal")}
        />
        Internal
      </label>
      <label>
        <input
          type="radio"
          checked={value === "external"}
          onChange={() => onChange("external")}
        />
        External
      </label>
    </fieldset>
  );
}
function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sv2-field">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function SelectRow({
  checked,
  type,
  title,
  detail,
  onChange,
}: {
  checked: boolean;
  type: "radio" | "checkbox";
  title: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label className="sv2-row">
      <input type={type} checked={checked} onChange={onChange} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </label>
  );
}
