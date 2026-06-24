# Trading approval — make it real (Supabase)

Goal: real accounts + a shared approval list so this loop works across devices:
**user requests → it's stored centrally → you see it in your Admin panel and approve → the user gets unlocked.**

## What YOU do (one time, ~10–15 min) — I'll guide each step

1. **Create a free Supabase project**
   - Go to https://supabase.com → sign up → "New project".
   - Pick a name + password (save the password). Wait ~2 min for it to finish.

2. **Send me two values** (both are safe to share):
   - Project URL — Settings → API → "Project URL" (looks like `https://abcd1234.supabase.co`)
   - anon public key — Settings → API → "Project API keys" → **anon / public** (a long string).
   - (Do NOT send the `service_role` key.)

3. **Run the database setup**
   - In Supabase → **SQL Editor** → New query → paste & Run each file from `admin/supabase/` in this order:
     `profiles.sql`, `comments.sql`, then **`trade_access.sql`** (the new approval table).
   - (I can give you one combined paste if you prefer.)

4. **Turn on email confirmations off (optional, easier testing)**
   - Authentication → Providers → Email → you can disable "Confirm email" for quick testing, or leave on.

## What I'll do once you send the URL + anon key
- Put them in `assets/js/supabase-config.js` (this flips the whole site from demo localStorage to real Supabase accounts).
- Wire the **Trading tab** + **Admin panel** to the `access_requests` table:
  - Signed-in, no request → "Request access" creates a real pending row.
  - Your **Admin panel** lists **pending requests** → Approve (sets approved + 1-yr expiry) / Deny.
  - The user's device checks Supabase → gets unlocked when approved (works on any device).
- Test the full loop and deploy.

## Email notification (optional, add after core works)
Supabase can't email arbitrary messages by itself. To actually email you on each
request, add a free **Resend** account + a tiny Supabase **Edge Function**/Database
Webhook. Until then, you simply check the **pending list in your Admin panel** —
the approval still works fully without email.

## Note on protecting your strategy
Even with this, the Railway app's URL is public. To truly lock it down, the
**Railway app itself** should require Supabase login and check approval server-side.
This site's gate controls the link/embed; the real protection lives in your app.
