alter table public.narrative_sections
  drop constraint if exists narrative_sections_section_type_check;

alter table public.narrative_sections
  add constraint narrative_sections_section_type_check check (section_type in (
    'project_summary',
    'challenge_opportunity',
    'response',
    'outcome_future_relevance',
    'distinctive_response',
    'precedent_strength',
    'future_relevance'
  )),
  add column if not exists team_input_keys text[] not null default '{}',
  add column if not exists version integer not null default 1 check (version > 0),
  add column if not exists supersedes_id uuid references public.narrative_sections(id) on delete set null;

alter table public.ingestion_jobs
  add column if not exists narrative_only boolean not null default false;

create index if not exists narrative_sections_lineage
  on public.narrative_sections (project_id, section_type, version desc);
