-- Create public.games table to store games metadata
create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  title text,
  embed text,
  src text,
  thumbnail text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- trigger to update updated_at
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp on public.games;
create trigger set_timestamp
before update on public.games
for each row execute procedure public.set_timestamp();

-- Grant basic permissions (select to anon role if you plan to expose)
-- Note: adjust RLS policies in the Supabase dashboard to match your security model.
