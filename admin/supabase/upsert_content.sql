-- Upsert helper for games
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
    -- try to match by src or embed
    select id into gid from public.games where src = _src or embed = _embed limit 1;
  end if;
  return gid;
end;
$$;

-- Upsert helper for videos
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

-- Upsert helper for stories (match by slug)
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

-- Example usage:
-- select public.upsert_game('Tetris','https://.../embed/123','https://.../123','/assets/img/t.png','{"type":"puzzle"}'::jsonb);
-- select public.upsert_video('Teaser','LixDSK0BRFs','https://www.youtube.com/embed/LixDSK0BRFs','/assets/img/vid.png', '{}'::jsonb);
-- select public.upsert_story('Title','slug','full body','excerpt', '{}'::jsonb);
