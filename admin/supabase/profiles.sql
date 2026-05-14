-- Supabase SQL: create public.s table and RLS policies
-- Run this in Supabase SQL Editor

BEGIN;


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

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.profiles;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();

-- Enable Row Level Security and add sample policies that allow
-- authenticated users to manage their own  row.
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

COMMIT;

-- Notes:
-- 1) Run this in Supabase SQL Editor. After creating the table, ensure your
--    Authentication -> Settings -> Redirect URLs include your app origins.
-- 2) If you want s created automatically on sign-up, you can either
--    create a Postgres trigger in the `auth` schema (requires care / privileges),
--    or call an insert into `s` from the client immediately after signUp
--    (the example client-side snippet in signup.html demonstrates this).
