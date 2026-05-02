alter table public.glovebox_files
drop constraint if exists glovebox_files_source_valid;

alter table public.glovebox_files
add constraint glovebox_files_source_valid
check (
  source = any (
    array[
      'glovebox'::text,
      'chat'::text,
      'ch40'::text,
      'grid_iq'::text,
      'reports'::text,
      'yard_book'::text,
      'freight_iq'::text
    ]
  )
);
