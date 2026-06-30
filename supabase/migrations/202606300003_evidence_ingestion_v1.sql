create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  source_asset_id text not null,
  status text not null default 'queued' check (status in ('queued', 'extracting_text', 'analysing', 'validating', 'ready_for_review', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  model_name text,
  analysed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, project_id, source_asset_id) references public.assets(workspace_id, project_id, id) on delete cascade
);

create unique index ingestion_jobs_one_active_per_asset
  on public.ingestion_jobs (workspace_id, project_id, source_asset_id)
  where status in ('queued', 'extracting_text', 'analysing', 'validating');
create index ingestion_jobs_worker_queue on public.ingestion_jobs (status, created_at);
create index ingestion_jobs_project on public.ingestion_jobs (workspace_id, project_id, created_at desc);

create table public.source_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  extraction_job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  source_asset_id text not null,
  page_number integer not null check (page_number > 0),
  extracted_text text not null,
  normalised_text text not null,
  character_count integer not null check (character_count >= 0),
  created_at timestamptz not null default now(),
  unique (extraction_job_id, page_number),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, project_id, source_asset_id) references public.assets(workspace_id, project_id, id) on delete cascade
);

create index source_pages_asset on public.source_pages (workspace_id, project_id, source_asset_id, page_number);

create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  extraction_job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  source_page_id uuid not null references public.source_pages(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  text text not null,
  normalised_text text not null,
  created_at timestamptz not null default now(),
  unique (source_page_id, chunk_index),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  extraction_job_id uuid references public.ingestion_jobs(id) on delete set null,
  category text not null check (category in ('project_identity', 'scale', 'practice_role', 'place_context', 'design_response', 'outcomes_relevance', 'tags_themes')),
  field text not null,
  value text not null,
  normalised_value text,
  status text not null default 'review_needed' check (status in ('review_needed', 'accepted', 'rejected', 'superseded')),
  source_type text not null check (source_type in ('document', 'manual_refinement')),
  conflict_group_id uuid,
  parent_item_id uuid references public.knowledge_items(id) on delete set null,
  original_extracted_value text,
  rejection_reason text,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create index knowledge_items_project on public.knowledge_items (workspace_id, project_id, status, created_at);
create index knowledge_items_job on public.knowledge_items (extraction_job_id);

create table public.knowledge_item_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  knowledge_item_id uuid not null references public.knowledge_items(id) on delete cascade,
  source_asset_id text not null,
  source_page integer not null check (source_page > 0),
  exact_evidence_quote text not null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, project_id, source_asset_id) references public.assets(workspace_id, project_id, id) on delete cascade
);

create index knowledge_sources_item on public.knowledge_item_sources (knowledge_item_id);

create table public.narrative_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id text not null,
  extraction_job_id uuid references public.ingestion_jobs(id) on delete set null,
  section_type text not null check (section_type in ('project_summary', 'challenge_opportunity', 'response', 'outcome_future_relevance')),
  draft_text text not null,
  approved_text text,
  basis_type text not null check (basis_type in ('source_supported', 'team_input', 'mixed')),
  supporting_item_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'superseded')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);

create index narrative_sections_project on public.narrative_sections (workspace_id, project_id, status, created_at);

create trigger ingestion_jobs_set_updated_at before update on public.ingestion_jobs for each row execute function public.set_updated_at();
create trigger knowledge_items_set_updated_at before update on public.knowledge_items for each row execute function public.set_updated_at();
create trigger narrative_sections_set_updated_at before update on public.narrative_sections for each row execute function public.set_updated_at();

alter table public.ingestion_jobs enable row level security;
alter table public.source_pages enable row level security;
alter table public.source_chunks enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.knowledge_item_sources enable row level security;
alter table public.narrative_sections enable row level security;

create policy ingestion_jobs_select_member on public.ingestion_jobs for select to authenticated using (private.is_workspace_member(workspace_id));
create policy ingestion_jobs_insert_editor on public.ingestion_jobs for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy ingestion_jobs_update_editor on public.ingestion_jobs for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy ingestion_jobs_delete_editor on public.ingestion_jobs for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy source_pages_select_member on public.source_pages for select to authenticated using (private.is_workspace_member(workspace_id));
create policy source_pages_insert_editor on public.source_pages for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy source_pages_update_editor on public.source_pages for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy source_pages_delete_editor on public.source_pages for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy source_chunks_select_member on public.source_chunks for select to authenticated using (private.is_workspace_member(workspace_id));
create policy source_chunks_insert_editor on public.source_chunks for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy source_chunks_update_editor on public.source_chunks for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy source_chunks_delete_editor on public.source_chunks for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy knowledge_items_select_member on public.knowledge_items for select to authenticated using (private.is_workspace_member(workspace_id));
create policy knowledge_items_insert_editor on public.knowledge_items for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy knowledge_items_update_editor on public.knowledge_items for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy knowledge_items_delete_editor on public.knowledge_items for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy knowledge_sources_select_member on public.knowledge_item_sources for select to authenticated using (private.is_workspace_member(workspace_id));
create policy knowledge_sources_insert_editor on public.knowledge_item_sources for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy knowledge_sources_update_editor on public.knowledge_item_sources for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy knowledge_sources_delete_editor on public.knowledge_item_sources for delete to authenticated using (private.can_edit_workspace(workspace_id));

create policy narrative_sections_select_member on public.narrative_sections for select to authenticated using (private.is_workspace_member(workspace_id));
create policy narrative_sections_insert_editor on public.narrative_sections for insert to authenticated with check (private.can_edit_workspace(workspace_id));
create policy narrative_sections_update_editor on public.narrative_sections for update to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy narrative_sections_delete_editor on public.narrative_sections for delete to authenticated using (private.can_edit_workspace(workspace_id));

grant select, insert, update, delete on public.ingestion_jobs, public.source_pages, public.source_chunks, public.knowledge_items, public.knowledge_item_sources, public.narrative_sections to authenticated;

notify pgrst, 'reload schema';
