-- Repair live environments that reached the UI/API release before the Brand Kit
-- column was visible to PostgREST. Collection links already cascade from their
-- parent collection, while the underlying projects remain independent.
alter table public.workspaces
  add column if not exists brand_kit jsonb not null default '{}'::jsonb;

grant select, update (brand_kit) on public.workspaces to authenticated;

notify pgrst, 'reload schema';
