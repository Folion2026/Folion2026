alter table public.collections
  add column if not exists narrative_keywords text not null default '',
  add column if not exists generated_narrative text not null default '',
  add column if not exists approved_narrative text not null default '',
  add column if not exists narrative_status text not null default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collections_narrative_status_check'
  ) then
    alter table public.collections
      add constraint collections_narrative_status_check
      check (narrative_status in ('draft','generated','approved'));
  end if;
end $$;

notify pgrst, 'reload schema';
