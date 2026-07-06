create table public.package_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  source_type text not null check (source_type in ('tender_pdf')),
  original_filename text not null,
  mime_type text not null,
  file_size bigint,
  storage_path text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.tender_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  package_source_id uuid not null references public.package_sources(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','extracting_text','analysing','ready_for_review','failed')),
  analysis jsonb not null default '{}'::jsonb,
  failure_reason text,
  model_name text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.tender_source_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  package_id uuid not null references public.packages(id) on delete cascade,
  tender_analysis_job_id uuid not null references public.tender_analysis_jobs(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text not null,
  character_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tender_analysis_job_id,page_number)
);

create index package_sources_package on public.package_sources(package_id,created_at desc);
create index tender_jobs_package on public.tender_analysis_jobs(package_id,created_at desc);
create index tender_pages_job on public.tender_source_pages(tender_analysis_job_id,page_number);

alter table public.package_sources enable row level security;
alter table public.tender_analysis_jobs enable row level security;
alter table public.tender_source_pages enable row level security;
create policy package_sources_member on public.package_sources for select to authenticated using (private.is_workspace_member(workspace_id));
create policy package_sources_editor on public.package_sources for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy tender_jobs_member on public.tender_analysis_jobs for select to authenticated using (private.is_workspace_member(workspace_id));
create policy tender_jobs_editor on public.tender_analysis_jobs for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy tender_pages_member on public.tender_source_pages for select to authenticated using (private.is_workspace_member(workspace_id));
create policy tender_pages_editor on public.tender_source_pages for all to authenticated using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
grant select,insert,update,delete on public.package_sources,public.tender_analysis_jobs,public.tender_source_pages to authenticated;
