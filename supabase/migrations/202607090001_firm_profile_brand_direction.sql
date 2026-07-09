alter table public.workspaces
  add column if not exists firm_profile jsonb not null default '{}'::jsonb;

-- Firm profile and brand kit are workspace-level identity settings. Existing
-- workspace RLS policies continue to govern select/update access.
