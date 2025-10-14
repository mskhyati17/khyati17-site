-- Create public.videos table to store video metadata
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  title text,
  video_id text,
  embed text,
  thumbnail text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_timestamp on public.videos;
create trigger set_timestamp
before update on public.videos
for each row execute procedure public.set_timestamp();
