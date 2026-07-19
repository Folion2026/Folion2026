create table public.project_external_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  label text not null,
  url text not null check (url ~* '^https?://'),
  provider text not null default 'Other' check (provider in ('SharePoint','OneDrive','Google Drive','Dropbox','Box','Other')),
  is_primary boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create unique index project_external_links_one_primary
  on public.project_external_links (workspace_id, project_id) where is_primary;
create index project_external_links_project
  on public.project_external_links (workspace_id, project_id, created_at);
create trigger project_external_links_set_updated_at before update on public.project_external_links
  for each row execute function public.set_updated_at();
alter table public.project_external_links enable row level security;
create policy project_external_links_member on public.project_external_links for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy project_external_links_editor on public.project_external_links for all to authenticated
  using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
grant select,insert,update,delete on public.project_external_links to authenticated;

alter table public.assets
  add column retention_kind text not null default 'durable'
    check (retention_kind in ('durable','temporary_source')),
  add column lifecycle_status text
    check (lifecycle_status is null or lifecycle_status in ('uploaded','analysing','extracted','pending_review','approved','deleted')),
  add column source_deleted_at timestamptz;
