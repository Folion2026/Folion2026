do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collections'
      and column_name = 'narrative_keywords'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collections'
      and column_name = 'keywords'
  ) then
    alter table public.collections
      rename column narrative_keywords to keywords;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collections'
      and column_name = 'keywords'
  ) then
    alter table public.collections
      add column keywords text not null default '';
  end if;
end $$;

notify pgrst, 'reload schema';
