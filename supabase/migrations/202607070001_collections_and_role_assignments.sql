create table public.collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  brief text not null default '',
  keywords text not null default '',
  approved_narrative text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.collection_projects (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  project_id text not null,
  project_order integer not null default 0,
  primary key(collection_id,project_id),
  foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.project_role_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  person_id text not null,
  project_id text not null,
  role_title text not null,
  contribution_summary text not null,
  approval_status text not null default 'not_approved' check(approval_status in ('not_approved','approved')),
  source_reference text,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,person_id,project_id),
  foreign key(workspace_id,person_id) references public.people(workspace_id,id) on delete cascade,
  foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create trigger collections_set_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger role_assignments_set_updated_at before update on public.project_role_assignments for each row execute function public.set_updated_at();
alter table public.collections enable row level security;
alter table public.collection_projects enable row level security;
alter table public.project_role_assignments enable row level security;
create policy collections_member on public.collections for select to authenticated using(private.is_workspace_member(workspace_id));
create policy collections_editor on public.collections for all to authenticated using(private.can_edit_workspace(workspace_id)) with check(private.can_edit_workspace(workspace_id));
create policy collection_projects_member on public.collection_projects for select to authenticated using(private.is_workspace_member(workspace_id));
create policy collection_projects_editor on public.collection_projects for all to authenticated using(private.can_edit_workspace(workspace_id)) with check(private.can_edit_workspace(workspace_id));
create policy role_assignments_member on public.project_role_assignments for select to authenticated using(private.is_workspace_member(workspace_id));
create policy role_assignments_editor on public.project_role_assignments for all to authenticated using(private.can_edit_workspace(workspace_id)) with check(private.can_edit_workspace(workspace_id));
grant select,insert,update,delete on public.collections,public.collection_projects,public.project_role_assignments to authenticated;
