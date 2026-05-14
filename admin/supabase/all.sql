-- Combined schema for Khyati17 site
-- Run this entire file in Supabase SQL Editor (paste into a new query and Execute)

-- 1) profiles (creates public.profiles and RLS policies)
-- ----------------------------------------------------
-- Begin profiles.sql

-- Create profiles table linked to auth.users (named `profiles` so client code matches)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  username text UNIQUE,
  email text,
  avatar_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- Trigger to update updated_at (shared helper)
CREATE OR REPLACE FUNCTION public.set_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.profiles;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own profile (auth.uid() must equal id)
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT
  WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING ( auth.uid() = id );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );

-- End profiles.sql


-- 2) games
-- --------
-- Begin games.sql
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

-- trigger to update updated_at (re-uses public.set_timestamp)
drop trigger if exists set_timestamp on public.games;
create trigger set_timestamp
before update on public.games
for each row execute procedure public.set_timestamp();

-- End games.sql


-- 3) videos
-- ---------
-- Begin videos.sql
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

-- End videos.sql


-- 4) stories
-- ----------
-- Begin stories.sql
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

-- End stories.sql


-- 5) comments and policies
-- -----------------------
-- Begin comments.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.comments (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_content_idx ON public.comments (content_type, content_id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON public.comments (user_id);

DROP TRIGGER IF EXISTS set_timestamp ON public.comments;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_public_select" ON public.comments;
CREATE POLICY "comments_public_select" ON public.comments
  FOR SELECT USING ( true );

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "comments_update_owner" ON public.comments;
CREATE POLICY "comments_update_owner" ON public.comments
  FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "comments_delete_owner" ON public.comments;
CREATE POLICY "comments_delete_owner" ON public.comments
  FOR DELETE USING ( auth.uid() = user_id );

COMMIT;

-- End comments.sql


-- 6) upsert helpers
-- -----------------
-- Begin upsert_content.sql
create or replace function public.upsert_game(_title text, _embed text, _src text, _thumbnail text, _metadata jsonb)
returns uuid language plpgsql as $$
declare
  gid uuid;
begin
  insert into public.games (title, embed, src, thumbnail, metadata)
  values (_title, _embed, _src, _thumbnail, coalesce(_metadata, '{}'::jsonb))
  on conflict do nothing
  returning id into gid;
  if gid is null then
    select id into gid from public.games where src = _src or embed = _embed limit 1;
  end if;
  return gid;
end;
$$;

create or replace function public.upsert_video(_title text, _video_id text, _embed text, _thumbnail text, _metadata jsonb)
returns uuid language plpgsql as $$
declare
  vid uuid;
begin
  insert into public.videos (title, video_id, embed, thumbnail, metadata)
  values (_title, _video_id, _embed, _thumbnail, coalesce(_metadata, '{}'::jsonb))
  on conflict (video_id) do update set title = excluded.title, embed = excluded.embed, thumbnail = excluded.thumbnail, metadata = excluded.metadata
  returning id into vid;
  if vid is null then select id into vid from public.videos where video_id = _video_id limit 1; end if;
  return vid;
end;
$$;

create or replace function public.upsert_story(_title text, _slug text, _body text, _excerpt text, _metadata jsonb)
returns uuid language plpgsql as $$
declare
  sid uuid;
begin
  insert into public.stories (title, slug, body, excerpt, metadata)
  values (_title, _slug, _body, _excerpt, coalesce(_metadata, '{}'::jsonb))
  on conflict (slug) do update set title = excluded.title, body = excluded.body, excerpt = excluded.excerpt, metadata = excluded.metadata
  returning id into sid;
  if sid is null then select id into sid from public.stories where slug = _slug limit 1; end if;
  return sid;
end;
$$;

-- End upsert_content.sql


-- 7) Optional seed: games_json_inserts.sql
-- --------------------------------------
-- If you want to seed games from the included `assets/data/games.json`, run the following
-- INSERT statements (they come from games_json_inserts.sql). You can paste them here or
-- run the separate file.

-- Begin games_json_inserts.sql (optional)
INSERT INTO public.games (title, embed, src, thumbnail, metadata) VALUES
('PupTown', 'https://scratch.mit.edu/projects/1203372098/embed', 'https://scratch.mit.edu/projects/1203372098/', 'https://cdn2.scratch.mit.edu/get_image/project/1203372098_480x360.png', '{}'::jsonb),
('Plane Game', 'https://scratch.mit.edu/projects/1203678096/embed', 'https://scratch.mit.edu/projects/1203678096/', 'https://cdn2.scratch.mit.edu/get_image/project/1203678096_480x360.png', '{}'::jsonb),
('Jelly Jump', 'https://scratch.mit.edu/projects/1204228487/embed', 'https://scratch.mit.edu/projects/1204228487/', 'https://cdn2.scratch.mit.edu/get_image/project/1204228487_480x360.png', '{}'::jsonb),
('Obstacle', 'https://scratch.mit.edu/projects/1196230313/embed', 'https://scratch.mit.edu/projects/1196230313/', 'https://cdn2.scratch.mit.edu/get_image/project/1196230313_480x360.png', '{}'::jsonb),
('Pet Duck', 'https://scratch.mit.edu/projects/1193516688/embed', 'https://scratch.mit.edu/projects/1193516688/', 'https://cdn2.scratch.mit.edu/get_image/project/1193516688_480x360.png', '{}'::jsonb),
('CubeField dash', 'https://scratch.mit.edu/projects/1203607156/embed', 'https://scratch.mit.edu/projects/1203607156/', 'https://cdn2.scratch.mit.edu/get_image/project/1203607156_480x360.png', '{}'::jsonb),
('Flip Walk', 'https://scratch.mit.edu/projects/1202557967/embed', 'https://scratch.mit.edu/projects/1202557967/', 'https://cdn2.scratch.mit.edu/get_image/project/1202557967_480x360.png', '{}'::jsonb),
('NightTime Highway', 'https://scratch.mit.edu/projects/1203606564/embed', 'https://scratch.mit.edu/projects/1203606564/', 'https://cdn2.scratch.mit.edu/get_image/project/1203606564_480x360.png', '{}'::jsonb),
('Dress Up', 'https://scratch.mit.edu/projects/1193900264/embed', 'https://scratch.mit.edu/projects/1193900264/', 'https://cdn2.scratch.mit.edu/get_image/project/1193900264_480x360.png', '{}'::jsonb),
('Virtual Doll', 'https://scratch.mit.edu/projects/1194281295/embed', 'https://scratch.mit.edu/projects/1194281295/', 'https://cdn2.scratch.mit.edu/get_image/project/1194281295_480x360.png', '{}'::jsonb),
('Uno', 'https://scratch.mit.edu/projects/1194283767/embed', 'https://scratch.mit.edu/projects/1194283767/', 'https://cdn2.scratch.mit.edu/get_image/project/1194283767_480x360.png', '{}'::jsonb),
('Geometry Dash', 'https://scratch.mit.edu/projects/1193912968/embed', 'https://scratch.mit.edu/projects/1193912968/', 'https://cdn2.scratch.mit.edu/get_image/project/1193912968_480x360.png', '{}'::jsonb),
('Pusheen Cat', 'https://scratch.mit.edu/projects/1194285039/embed', 'https://scratch.mit.edu/projects/1194285039/', 'https://cdn2.scratch.mit.edu/get_image/project/1194285039_480x360.png', '{}'::jsonb),
('Iphone', 'https://scratch.mit.edu/projects/1185456668/embed', 'https://scratch.mit.edu/projects/1185456668/', 'https://cdn2.scratch.mit.edu/get_image/project/1185456668_480x360.png', '{}'::jsonb),
(NULL, 'https://scratch.mit.edu/projects/1180478891/embed', 'https://scratch.mit.edu/projects/1180478891/', 'https://cdn2.scratch.mit.edu/get_image/project/1180478891_480x360.png', '{}'::jsonb),
(NULL, 'https://scratch.mit.edu/projects/973056500/embed', 'https://scratch.mit.edu/projects/973056500/', 'https://cdn2.scratch.mit.edu/get_image/project/973056500_480x360.png', '{}'::jsonb),
(NULL, 'https://scratch.mit.edu/projects/1203954575/embed', 'https://scratch.mit.edu/projects/1203954575/', 'https://cdn2.scratch.mit.edu/get_image/project/1203954575_480x360.png', '{}'::jsonb);

-- End games_json_inserts.sql
