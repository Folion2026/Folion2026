-- Compatibility repair for deployments that received the upload API before
-- the asset metadata columns were visible to PostgREST.
alter table public.assets
  add column if not exists original_filename text not null default '',
  add column if not exists mime_type text not null default '',
  add column if not exists file_size bigint;

alter table public.assets
  drop constraint if exists assets_file_size_check,
  add constraint assets_file_size_check
    check (file_size is null or file_size >= 0) not valid;

alter table public.assets validate constraint assets_file_size_check;

notify pgrst, 'reload schema';
