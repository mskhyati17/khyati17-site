-- Supabase SQL: create public.comments table and RLS policies
-- Run this in the Supabase SQL Editor.

BEGIN;

-- Create comments table to store user comments on arbitrary content (games/videos/stories)
CREATE TABLE IF NOT EXISTS public.comments (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,-- e.g. 'game', 'video', 'story'
  content_id text NOT NULL,-- identifier for the content (could be a slug, numeric id, scratch project id, youtube id, etc.)
  body text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups by content
CREATE INDEX IF NOT EXISTS comments_content_idx ON public.comments (content_type, content_id);
CREATE INDEX IF NOT EXISTS comments_user_idx ON public.comments (user_id);

-- Reuse existing set_timestamp() trigger if present; if not, the CREATE TRIGGER below will fail
-- but most projects already have a similar trigger (see profiles.sql). If you don't have
-- the function, create one first (see profiles.sql for example).
DROP TRIGGER IF EXISTS set_timestamp ON public.comments;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to SELECT comments so comments are publicly visible
DROP POLICY IF EXISTS "comments_public_select" ON public.comments;
CREATE POLICY "comments_public_select" ON public.comments
  FOR SELECT USING ( true );

-- Allow authenticated users to INSERT comments only for themselves
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK ( auth.uid() = user_id );

-- Allow owners to UPDATE their own comments
DROP POLICY IF EXISTS "comments_update_owner" ON public.comments;
CREATE POLICY "comments_update_owner" ON public.comments
  FOR UPDATE USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );

-- Allow owners to DELETE their own comments
DROP POLICY IF EXISTS "comments_delete_owner" ON public.comments;
CREATE POLICY "comments_delete_owner" ON public.comments
  FOR DELETE USING ( auth.uid() = user_id );

COMMIT;

-- Notes:
-- 1) content_type/content_id are flexible so this single table can store comments for
--    games, videos, stories, blog posts, etc. Use a clear convention for content_id
--    (e.g., the scratch project id for games, the youtube id for videos, or a page slug).
-- 2) The policies above allow public reads and require the authenticated user's uid
--    to match comments.user_id when inserting/updating/deleting.
-- 3) If you want to allow moderators to delete or update any comment, add additional
--    policies that check for a role (for example: auth.role() = 'authenticated' AND
--    auth.jwt() ->> 'role' = 'moderator') or put moderator UIDs in a separate table.
-- 4) To show comments on the client, query via the REST or PostgREST endpoint:
--    GET /rest/v1/comments?content_type=eq.game&content_id=eq.12345&order=created_at.desc
