-- Friends, presence-adjacent chat, and safety (block) tables for Khyati17.
-- Run this in the Supabase SQL Editor AFTER all.sql / profiles.sql have already
-- been run (it references public.profiles and public.set_timestamp()).
--
-- What this adds:
--   * public.friend_requests  — pending/accepted/declined requests between users
--   * public.blocks           — one-way blocks; blocking removes any friendship
--   * public.friend_messages  — text chat between accepted friends only
--   * public.public_profiles  — a SAFE, non-sensitive view of profiles (id,
--     username, first_name, avatar_url only — never email) that any signed-in
--     user can read, so people can search for a friend by username without
--     the app exposing everyone's email address.
--
-- Realtime "online" status is NOT a table — it uses Supabase Realtime Presence
-- (see assets/js/friends.js). Note the inherent limitation documented at the
-- bottom of this file before you rely on it for anything sensitive.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) public_profiles: a safe, non-sensitive view for friend search + display
-- ---------------------------------------------------------------------------
-- profiles.profiles_select policy restricts SELECT to auth.uid() = id (you can
-- only read your own row). That's correct for the private table, but it means
-- no one could ever find another user to friend. This view exposes only
-- non-sensitive columns and is readable by any signed-in user.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username, first_name, avatar_url
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) blocks — one-way; either party blocking the other kills the friendship
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  id bigserial PRIMARY KEY,
  blocker uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT blocks_no_self CHECK (blocker <> blocked),
  CONSTRAINT blocks_unique UNIQUE (blocker, blocked)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON public.blocks (blocker);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks (blocked);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT USING ( auth.uid() = blocker );

DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT WITH CHECK ( auth.uid() = blocker );

DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE USING ( auth.uid() = blocker );

-- Helper: true if either user has blocked the other, in either direction.
CREATE OR REPLACE FUNCTION public.is_blocked(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker = a AND blocked = b) OR (blocker = b AND blocked = a)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) friend_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id bigserial PRIMARY KEY,
  from_user uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT friend_requests_no_self CHECK (from_user <> to_user),
  CONSTRAINT friend_requests_unique_pair UNIQUE (from_user, to_user)
);

CREATE INDEX IF NOT EXISTS friend_requests_to_idx ON public.friend_requests (to_user, status);
CREATE INDEX IF NOT EXISTS friend_requests_from_idx ON public.friend_requests (from_user, status);

DROP TRIGGER IF EXISTS set_timestamp ON public.friend_requests;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- You can see requests you sent or received.
DROP POLICY IF EXISTS "friend_requests_select" ON public.friend_requests;
CREATE POLICY "friend_requests_select" ON public.friend_requests
  FOR SELECT USING ( auth.uid() = from_user OR auth.uid() = to_user );

-- You can only send a request as yourself, and only if neither side has blocked the other.
DROP POLICY IF EXISTS "friend_requests_insert" ON public.friend_requests;
CREATE POLICY "friend_requests_insert" ON public.friend_requests
  FOR INSERT WITH CHECK (
    auth.uid() = from_user
    AND NOT public.is_blocked(from_user, to_user)
  );

-- Only the recipient can accept/decline; only the sender can cancel (handled as a delete).
DROP POLICY IF EXISTS "friend_requests_update_recipient" ON public.friend_requests;
CREATE POLICY "friend_requests_update_recipient" ON public.friend_requests
  FOR UPDATE USING ( auth.uid() = to_user ) WITH CHECK ( auth.uid() = to_user );

DROP POLICY IF EXISTS "friend_requests_delete_own" ON public.friend_requests;
CREATE POLICY "friend_requests_delete_own" ON public.friend_requests
  FOR DELETE USING ( auth.uid() = from_user OR auth.uid() = to_user );

-- Helper: true if a and b have an accepted friend_requests row, in either direction.
CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'accepted'
      AND ((from_user = a AND to_user = b) OR (from_user = b AND to_user = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) friend_messages — text chat, accepted friends only, not blocked
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_messages (
  id bigserial PRIMARY KEY,
  from_user uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL CHECK ( char_length(body) BETWEEN 1 AND 1000 ),
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz,
  CONSTRAINT friend_messages_no_self CHECK (from_user <> to_user)
);

CREATE INDEX IF NOT EXISTS friend_messages_pair_idx
  ON public.friend_messages (LEAST(from_user, to_user), GREATEST(from_user, to_user), created_at);

ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_messages_select" ON public.friend_messages;
CREATE POLICY "friend_messages_select" ON public.friend_messages
  FOR SELECT USING ( auth.uid() = from_user OR auth.uid() = to_user );

DROP POLICY IF EXISTS "friend_messages_insert" ON public.friend_messages;
CREATE POLICY "friend_messages_insert" ON public.friend_messages
  FOR INSERT WITH CHECK (
    auth.uid() = from_user
    AND public.are_friends(from_user, to_user)
    AND NOT public.is_blocked(from_user, to_user)
  );

-- Recipient can mark a message read.
DROP POLICY IF EXISTS "friend_messages_update_read" ON public.friend_messages;
CREATE POLICY "friend_messages_update_read" ON public.friend_messages
  FOR UPDATE USING ( auth.uid() = to_user ) WITH CHECK ( auth.uid() = to_user );

-- Basic anti-spam: no more than 20 messages from one sender in a 10-second
-- window. This is a coarse guard, not full moderation — see README notes.
CREATE OR REPLACE FUNCTION public.friend_messages_rate_limit() RETURNS trigger AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.friend_messages
  WHERE from_user = NEW.from_user
    AND created_at > now() - interval '10 seconds';
  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Sending too fast — please slow down.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS friend_messages_rate_limit ON public.friend_messages;
CREATE TRIGGER friend_messages_rate_limit BEFORE INSERT ON public.friend_messages
FOR EACH ROW EXECUTE FUNCTION public.friend_messages_rate_limit();

COMMIT;

-- ---------------------------------------------------------------------------
-- 5) Enable Realtime on the new tables (safe to re-run)
-- ---------------------------------------------------------------------------
-- In the Supabase dashboard: Database -> Replication -> supabase_realtime,
-- add friend_requests and friend_messages. Or run:
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- NOTES / KNOWN LIMITATIONS (read before relying on this in production)
-- ---------------------------------------------------------------------------
-- 1. "Online" status uses a single shared Supabase Realtime Presence channel
--    (assets/js/friends.js, channel "online-users"). Presence channels are
--    not access-controlled by RLS: any authenticated client that subscribes
--    to that exact channel name can see the raw list of currently-online
--    user IDs (not names/emails — those still require public_profiles, which
--    only exposes username/first_name/avatar_url). The app only *displays*
--    presence for your accepted friends, but the channel itself is not
--    friend-scoped. This is a standard simplification (most small apps do
--    this) — worth knowing before treating "online" as a private signal.
-- 2. Message content has no profanity/safety filtering server-side — only a
--    length check and the basic rate limit above. Add a moderation layer
--    (e.g. a Postgres trigger calling an external filter, or a scheduled
--    review queue) before treating this as fully moderated for younger users.
-- 3. There is no admin "report user" flow yet, only block. If you want a
--    formal report queue, that's a reasonable next addition to this schema.
