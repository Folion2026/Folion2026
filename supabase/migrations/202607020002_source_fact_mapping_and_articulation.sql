alter table public.knowledge_items
  add column if not exists structured_field text;

alter table public.knowledge_items
  drop constraint if exists knowledge_items_structured_field_check;

alter table public.knowledge_items
  add constraint knowledge_items_structured_field_check check (structured_field is null or structured_field in (
    'project_name','location','address','client','project_status','year','dates','project_type','sector_typology',
    'site_area','gfa','dwellings_units','height_levels','fsr','other_scale_metrics',
    'practice_name','services','scope','explicit_responsibilities'
  ));

-- Idempotent compatibility backfill. It maps existing candidates in place, preserving
-- their review state and evidence links, and deliberately does not approve anything.
update public.knowledge_items
set structured_field = case regexp_replace(lower(trim(field)), '[^a-z0-9]+', '_', 'g')
  when 'project_name' then 'project_name' when 'name' then 'project_name'
  when 'location' then 'location' when 'project_location' then 'location'
  when 'address' then 'address' when 'site_address' then 'address'
  when 'client' then 'client' when 'project_client' then 'client'
  when 'status' then 'project_status' when 'project_status' then 'project_status'
  when 'year' then 'year' when 'project_year' then 'year'
  when 'date' then 'dates' when 'dates' then 'dates' when 'project_dates' then 'dates'
  when 'project_type' then 'project_type' when 'type' then 'project_type'
  when 'sector' then 'sector_typology' when 'typology' then 'sector_typology' when 'sector_typology' then 'sector_typology'
  when 'site_area' then 'site_area' when 'gfa' then 'gfa' when 'gross_floor_area' then 'gfa'
  when 'dwellings' then 'dwellings_units' when 'units' then 'dwellings_units' when 'dwellings_units' then 'dwellings_units'
  when 'height' then 'height_levels' when 'levels' then 'height_levels' when 'storeys' then 'height_levels' when 'height_levels' then 'height_levels'
  when 'fsr' then 'fsr' when 'floor_space_ratio' then 'fsr'
  when 'other_scale_metrics' then 'other_scale_metrics'
  when 'practice' then 'practice_name' when 'practice_name' then 'practice_name'
  when 'services' then 'services' when 'service' then 'services'
  when 'scope' then 'scope'
  when 'responsibilities' then 'explicit_responsibilities' when 'explicit_responsibilities' then 'explicit_responsibilities'
  else null end
where structured_field is null;

create index if not exists knowledge_items_structured_field
  on public.knowledge_items (workspace_id, project_id, structured_field, status);

alter table public.narrative_sections
  drop constraint if exists narrative_sections_section_type_check;

alter table public.narrative_sections
  add constraint narrative_sections_section_type_check check (section_type in (
    'project_summary','challenge_opportunity','response','outcome_future_relevance',
    'distinctive_response','precedent_strength','future_relevance','precedent_relevance','project_narrative'
  )),
  add column if not exists needs_refresh boolean not null default false,
  add column if not exists stale_reason text;
