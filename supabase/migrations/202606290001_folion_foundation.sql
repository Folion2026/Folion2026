create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'editor', 'viewer');
create type public.project_confidentiality as enum ('internal-only', 'externally-shareable', 'publicly-publishable');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  invited_email text not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  project_name text not null,
  status text not null default '',
  confidentiality public.project_confidentiality not null default 'internal-only',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  knowledge_status text not null default 'Review needed' check (knowledge_status in ('Review needed', 'Ready for Studio')),
  cover_image text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table public.people (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  name text not null,
  position text not null default '',
  office text not null default '',
  email text not null default '',
  bio text not null default '',
  skills text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table public.project_team_members (
  workspace_id uuid not null,
  project_id text not null,
  person_id text not null,
  project_role text not null default '',
  contribution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, project_id, person_id),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, person_id) references public.people(workspace_id, id) on delete restrict
);

create table public.assets (
  workspace_id uuid not null,
  project_id text not null,
  id text not null,
  type text not null check (type in ('hero', 'report', 'plan', 'section', 'diagram', 'render', 'photo', 'document', 'other')),
  title text not null default '',
  caption text not null default '',
  storage_path text,
  source_url text,
  source_page integer,
  tags text[] not null default '{}',
  uploaded_category text not null default '',
  is_primary boolean not null default false,
  is_selected_for_gallery boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, project_id, id),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id);
create index projects_workspace_updated_idx on public.projects(workspace_id, updated_at desc);
create index people_workspace_name_idx on public.people(workspace_id, name);
create index project_team_project_idx on public.project_team_members(workspace_id, project_id);
create index assets_project_idx on public.assets(workspace_id, project_id);
create index audit_events_workspace_created_idx on public.audit_events(workspace_id, created_at desc);

create schema if not exists private;

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = (select auth.uid())
      and role in ('owner', 'editor')
  );
$$;

create or replace function private.is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.can_edit_workspace(uuid) from public;
revoke all on function private.is_workspace_owner(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid), private.can_edit_workspace(uuid), private.is_workspace_owner(uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
create trigger project_team_set_updated_at before update on public.project_team_members for each row execute function public.set_updated_at();
create trigger assets_set_updated_at before update on public.assets for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.people enable row level security;
alter table public.project_team_members enable row level security;
alter table public.assets enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_shared_workspace on public.profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_select_member on public.workspaces for select to authenticated using (private.is_workspace_member(id));
create policy workspaces_insert_self on public.workspaces for insert to authenticated with check (created_by = (select auth.uid()));
create policy workspaces_update_owner on public.workspaces for update to authenticated using (private.is_workspace_owner(id)) with check (private.is_workspace_owner(id));
create policy workspaces_delete_owner on public.workspaces for delete to authenticated using (private.is_workspace_owner(id));

create policy members_select_member on public.workspace_members for select to authenticated using (private.is_workspace_member(workspace_id));
create policy members_insert_owner on public.workspace_members for insert to authenticated with check (private.is_workspace_owner(workspace_id));
create policy members_update_owner on public.workspace_members for update to authenticated using (private.is_workspace_owner(workspace_id)) with check (private.is_workspace_owner(workspace_id));
create policy members_delete_owner on public.workspace_members for delete to authenticated using (private.is_workspace_owner(workspace_id));

create policy projects_select_member on public.projects for select to authenticated using (private.is_workspace_member(workspace_id));
create policy projects_insert_editor on public.projects for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy projects_update_editor on public.projects for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy projects_delete_editor on public.projects for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy people_select_member on public.people for select to authenticated using (private.is_workspace_member(workspace_id));
create policy people_insert_editor on public.people for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy people_update_editor on public.people for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy people_delete_editor on public.people for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy team_select_member on public.project_team_members for select to authenticated using (private.is_workspace_member(workspace_id));
create policy team_insert_editor on public.project_team_members for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy team_update_editor on public.project_team_members for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy team_delete_editor on public.project_team_members for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy assets_select_member on public.assets for select to authenticated using (private.is_workspace_member(workspace_id));
create policy assets_insert_editor on public.assets for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy assets_update_editor on public.assets for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy assets_delete_editor on public.assets for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy audit_select_member on public.audit_events for select to authenticated using (private.is_workspace_member(workspace_id));
create policy audit_insert_member on public.audit_events for insert to authenticated with check (private.is_workspace_member(workspace_id) and actor_user_id = (select auth.uid()));

grant select, insert, update, delete on public.profiles, public.workspaces, public.workspace_members, public.projects, public.people, public.project_team_members, public.assets to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-assets', 'project-assets', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy project_assets_read_member on storage.objects for select to authenticated using (
  bucket_id = 'project-assets' and exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid()) and workspace_id::text = (storage.foldername(name))[1]
  )
);
create policy project_assets_insert_editor on storage.objects for insert to authenticated with check (
  bucket_id = 'project-assets' and exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid()) and role in ('owner', 'editor') and workspace_id::text = (storage.foldername(name))[1]
  )
);
create policy project_assets_update_editor on storage.objects for update to authenticated using (
  bucket_id = 'project-assets' and exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid()) and role in ('owner', 'editor') and workspace_id::text = (storage.foldername(name))[1]
  )
) with check (
  bucket_id = 'project-assets' and exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid()) and role in ('owner', 'editor') and workspace_id::text = (storage.foldername(name))[1]
  )
);
create policy project_assets_delete_editor on storage.objects for delete to authenticated using (
  bucket_id = 'project-assets' and exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid()) and role in ('owner', 'editor') and workspace_id::text = (storage.foldername(name))[1]
  )
);
