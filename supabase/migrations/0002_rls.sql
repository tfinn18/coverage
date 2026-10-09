-- Row Level Security: a signed-in user can only see and change their own rows.
-- Anonymous (logged-out) requests match no policy, so they see nothing.

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.calls enable row level security;

-- Table privileges for the API roles. RLS below still filters every row.
revoke all on public.profiles, public.contacts, public.calls from anon;
grant select, insert, update, delete on public.profiles, public.contacts, public.calls to authenticated;

-- profiles (keyed by id). Inserts happen only through the sign-up trigger.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- contacts
create policy "contacts_select_own" on public.contacts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "contacts_insert_own" on public.contacts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contacts_update_own" on public.contacts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contacts_delete_own" on public.contacts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- calls: also require that the linked contact belongs to the same user,
-- so nobody can attach a call to someone else's contact.
create policy "calls_select_own" on public.calls
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "calls_insert_own" on public.calls
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = (select auth.uid())
    )
  );
create policy "calls_update_own" on public.calls
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = (select auth.uid())
    )
  );
create policy "calls_delete_own" on public.calls
  for delete to authenticated using ((select auth.uid()) = user_id);
