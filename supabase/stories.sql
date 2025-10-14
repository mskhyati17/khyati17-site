-- Create public.stories table to store story content
create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  title text,
  slug text unique,
  body text,
  excerpt text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_timestamp on public.stories;
create trigger set_timestamp
before update on public.stories
for each row execute procedure public.set_timestamp();
