create table public.packages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_type text not null check (package_type in ('single_project_sheet','project_collection','pitch','cv','tender')),
  title text not null,
  mode text not null default 'internal' check (mode in ('internal','external')),
  state text not null default 'draft' check (state in ('draft','ready_to_share','source_updated','archived')),
  data jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (package_id, version_number)
);

create table public.package_sections (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade, section_type text not null,
  section_order integer not null default 0, title text not null default '', body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','needs_attention')),
  manual_content jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.package_projects (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, package_id uuid not null references public.packages(id) on delete cascade,
  project_id text not null, selected_reason text, section_order integer not null default 0, source_updated_at timestamptz,
  primary key (package_id, project_id), foreign key (workspace_id, project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.package_people (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, package_id uuid not null references public.packages(id) on delete cascade,
  person_id text not null, project_id text, role_context text, section_order integer not null default 0,
  primary key (package_id, person_id, project_id), foreign key (workspace_id, person_id) references public.people(workspace_id,id) on delete cascade
);
create table public.package_assets (
  workspace_id uuid not null references public.workspaces(id) on delete cascade, package_id uuid not null references public.packages(id) on delete cascade,
  project_id text not null, asset_id text not null, usage text not null check (usage in ('cover','hero','supporting','reference')), section_order integer not null default 0,
  primary key (package_id, project_id, asset_id), foreign key (workspace_id,project_id,asset_id) references public.assets(workspace_id,project_id,id) on delete cascade
);
create table public.package_section_sources (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_section_id uuid not null references public.package_sections(id) on delete cascade, source_type text not null,
  source_id text not null, source_project_id text, source_person_id text, source_status text not null,
  confidentiality_status text, created_at timestamptz not null default now()
);

create index packages_workspace_updated on public.packages(workspace_id,updated_at desc);
create index package_sections_package on public.package_sections(package_id,section_order);
create trigger packages_set_updated_at before update on public.packages for each row execute function public.set_updated_at();
create trigger package_sections_set_updated_at before update on public.package_sections for each row execute function public.set_updated_at();

alter table public.packages enable row level security; alter table public.package_versions enable row level security;
alter table public.package_sections enable row level security; alter table public.package_projects enable row level security;
alter table public.package_people enable row level security; alter table public.package_assets enable row level security;
alter table public.package_section_sources enable row level security;

create policy packages_select_member on public.packages for select to authenticated using (private.is_workspace_member(workspace_id));
create policy packages_insert_editor on public.packages for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy packages_update_editor on public.packages for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy packages_delete_editor on public.packages for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy package_versions_select_member on public.package_versions for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_versions_insert_editor on public.package_versions for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy package_sections_member on public.package_sections for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_sections_editor on public.package_sections for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy package_projects_member on public.package_projects for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_projects_editor on public.package_projects for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy package_people_member on public.package_people for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_people_editor on public.package_people for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy package_assets_member on public.package_assets for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_assets_editor on public.package_assets for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy package_sources_member on public.package_section_sources for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_sources_editor on public.package_section_sources for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));

grant select,insert,update,delete on public.packages,public.package_sections,public.package_projects,public.package_people,public.package_assets,public.package_section_sources to authenticated;
grant select,insert on public.package_versions to authenticated;
