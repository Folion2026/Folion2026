alter table public.people
  add column if not exists employment_status text not null default 'active'
    check (employment_status in ('active', 'inactive', 'deleted')),
  add column if not exists archived_at timestamptz;

alter table public.project_team_members
  add column if not exists seniority text,
  add column if not exists source_reference text,
  add column if not exists person_name_snapshot text;

update public.project_team_members ptm
set person_name_snapshot = p.name
from public.people p
where p.workspace_id = ptm.workspace_id
  and p.id = ptm.person_id
  and coalesce(ptm.person_name_snapshot, '') = '';

alter table public.workspaces
  add column if not exists brand_kit jsonb not null default '{}'::jsonb;

-- Existing workspace membership and row-level policies continue to govern these
-- additive fields. No public storage policy is introduced.
