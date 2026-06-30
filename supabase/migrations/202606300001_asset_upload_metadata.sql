alter table public.assets
  add column if not exists original_filename text not null default '',
  add column if not exists mime_type text not null default '',
  add column if not exists file_size bigint check (file_size is null or file_size >= 0);
