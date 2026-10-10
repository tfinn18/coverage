-- Marks rows created by "Try with example data", so the UI can label them and remove them in one click.
alter table public.contacts add column is_example boolean not null default false;
create index contacts_user_id_is_example_idx on public.contacts (user_id) where is_example;
