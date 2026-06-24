-- Trading access approvals (run AFTER profiles.sql).
-- A shared, server-side approval list so the request -> approve -> unlock loop
-- works across devices. Owner = mskhyati17@gmail.com (change if needed).

create table if not exists public.access_requests (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  status       text not null default 'pending',   -- pending | approved | denied
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  expires_at   timestamptz                          -- approvals expire (yearly re-approval)
);

alter table public.access_requests enable row level security;

-- A signed-in user may create their own pending request
drop policy if exists ar_insert_own on public.access_requests;
create policy ar_insert_own on public.access_requests
  for insert with check (auth.uid() = user_id);

-- A user may read their own row (to know if they're approved)
drop policy if exists ar_select_own on public.access_requests;
create policy ar_select_own on public.access_requests
  for select using (auth.uid() = user_id);

-- A user may re-submit (update) their own row only while pending/denied
drop policy if exists ar_update_own on public.access_requests;
create policy ar_update_own on public.access_requests
  for update using (auth.uid() = user_id);

-- The owner (admin) can read ALL requests
drop policy if exists ar_admin_select on public.access_requests;
create policy ar_admin_select on public.access_requests
  for select using ((auth.jwt() ->> 'email') = 'mskhyati17@gmail.com');

-- The owner (admin) can approve/deny anyone
drop policy if exists ar_admin_update on public.access_requests;
create policy ar_admin_update on public.access_requests
  for update using ((auth.jwt() ->> 'email') = 'mskhyati17@gmail.com');

-- Helper the site calls to check the current user's access (true if approved & not expired)
create or replace function public.has_trade_access()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.access_requests
    where user_id = auth.uid()
      and status = 'approved'
      and (expires_at is null or expires_at > now())
  );
$$;
