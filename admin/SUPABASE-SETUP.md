This project includes optional Supabase-backed persistence for games, videos, stories and comments.

Easiest path: open `all.sql` and run the whole file in one paste — it already
contains every table below in the right order.

Run order in Supabase SQL Editor (if running files individually instead)
1. profiles.sql       -- creates public.profiles and RLS policies
2. games.sql          -- creates public.games
3. videos.sql         -- creates public.videos
4. stories.sql        -- creates public.stories
5. comments.sql       -- creates public.comments and RLS policies
6. upsert_content.sql -- helper functions for upserts
7. (optional) games_json_inserts.sql -- seed games from local JSON

Note: the "Explore Together" friend chat feature (friends/friends.html) does
not use Supabase at all — it connects two browsers directly over WebRTC, so
it needs none of this setup.

Notes and RLS
- The provided policies in `profiles.sql` and `comments.sql` allow public reads for comments and require auth.uid() to match user_id for comment inserts.
- Adjust policies to allow moderators or admins as needed.

Local configuration
- Copy `assets/js/supabase-config.js` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your project values.
- The site will dynamically create `window.supabase` at runtime using these keys.

Importing local JSON content to Supabase (optional)
- There's a Node script `scripts/import_content.js` that calls RPC upsert helpers. To run it:
  - Set environment variables SUPABASE_URL and SUPABASE_KEY (service_role key is needed for upserts that bypass RLS) and run:

    SUPABASE_URL=https://your.supabase.co SUPABASE_KEY=service_role_key node scripts/import_content.js

Security note
- Do NOT commit service_role keys to source control. Use environment variables or CI secrets when importing seed data.

If you'd like, I can run the SQL against your Supabase project automatically if you confirm that `assets/js/supabase-config.js` contains the correct Project URL and anon key and you want me to proceed. I cannot and will not use any service_role (admin) key without explicit instructions.