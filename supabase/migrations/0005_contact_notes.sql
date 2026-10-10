-- Structured notes for each contact (Prep / Call notes / Follow-up), plus an optional email address.
--
-- contact_notes.doc holds the notes document as JSON. contacts.notes stays as a plain-text copy of
-- that document, kept in sync by the app, so the grid preview, search and CSV export keep working
-- without loading every document.

alter table public.contacts
  add column email text check (email is null or char_length(email) <= 320);

create table public.contact_notes (
  contact_id uuid primary key references public.contacts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  doc jsonb not null default '{}'::jsonb check (octet_length(doc::text) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_notes_user_id_idx on public.contact_notes (user_id);

create trigger contact_notes_set_updated_at
  before update on public.contact_notes
  for each row execute function public.set_updated_at();

-- Row Level Security: same rule as every other table, and notes can only be attached
-- to a contact the same user owns.
alter table public.contact_notes enable row level security;
revoke all on public.contact_notes from anon;
grant select, insert, update, delete on public.contact_notes to authenticated;

create policy "contact_notes_select_own" on public.contact_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "contact_notes_insert_own" on public.contact_notes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = (select auth.uid())
    )
  );
create policy "contact_notes_update_own" on public.contact_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = (select auth.uid())
    )
  );
create policy "contact_notes_delete_own" on public.contact_notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Move existing notes into "Key advice" bullets (one bullet per non-empty line) so nothing is lost.
insert into public.contact_notes (contact_id, user_id, doc)
select
  c.id,
  c.user_id,
  jsonb_build_object(
    'v', 1,
    'call', jsonb_build_object(
      'keyAdvice',
      coalesce(
        (select jsonb_agg(trim(line) order by n)
         from regexp_split_to_table(c.notes, E'\\r?\\n') with ordinality as t(line, n)
         where trim(line) <> ''),
        '[]'::jsonb
      )
    )
  )
from public.contacts c
where trim(c.notes) <> ''
on conflict (contact_id) do nothing;
