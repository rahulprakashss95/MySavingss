-- HomeVault schema for Supabase (Postgres).
-- Run once in the Supabase dashboard → SQL Editor → New query. Safe to re-run.
--
-- ================================================================== --
-- How security works here
--
-- Identity comes from Supabase Auth, but the app's login is by *username
-- within a family*, with no email and admin-created members. Those are bridged
-- like this:
--
--  - each member has a real `auth.users` row whose email is synthetic and
--    derived from (family_id, username) — see `syntheticEmail` in
--    `database/query.ts`. Nobody ever sees or types it.
--  - `login_users.id` IS the `auth.users` uuid, so `auth.uid()` identifies the
--    row directly and `owner_id` needs no translation.
--  - the member's family lives in the JWT's `app_metadata.family_id`. That is
--    set by the `auth` Edge Function using the service_role key and **cannot be
--    modified by the user**, which is what makes it safe to trust in a policy.
--    (`user_metadata` would NOT be safe — users can write their own.)
--
-- So family scoping, private/public visibility, and owner-only editing are
-- enforced *by Postgres*. `database/query.ts` still filters client-side, but
-- that is now belt-and-braces rather than the only line of defense.
--
-- The anon/publishable key on its own can read nothing at all.
--
-- ================================================================== --
-- Why some columns are real and the rest is jsonb
--
-- Every domain row keeps the fields something *queries* — family, owner,
-- visibility, and (on the four tables below) amounts, dates and lookup ids — as
-- real typed columns. Everything else is payload in `data`.
--
-- The eight small tables (banks, ornaments, properties, vehicles, documents,
-- ledger clients, expense types) are tens of rows, are never filtered or
-- totalled in SQL, and hold nested structures — a property's payment entries are
-- an array inside the record. They stay entirely in jsonb on purpose.
--
-- The four below grow and are what filters and totals will actually hit, so
-- their amounts are `numeric` and their dates are `date`. Note the app formats
-- dates as "17-Jul-2026" for display; that is a *display* format and must never
-- reach the database — `database/query.ts` converts at the boundary. Sorting
-- "01-Apr-2025" against "01-Aug-2024" as text is wrong, which is why `date`
-- columns exist here at all.
-- ================================================================== --

-- ---------------------------------------------------------------- --
-- Claim helpers
--
-- `stable`, so they are evaluated once per statement rather than once per row.
-- ---------------------------------------------------------------- --

create or replace function jwt_family_id() returns text
  language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb
        -> 'app_metadata' ->> 'family_id',
      ''
    ), ''
  );
$$;

/* The signed-in member's `login_users.id`. */
create or replace function jwt_user_id() returns text
  language sql stable as $$
  select nullif(coalesce(auth.uid()::text, ''), '');
$$;

-- ---------------------------------------------------------------- --
-- Tenants and accounts
-- ---------------------------------------------------------------- --

-- data: { name, createdAt }
create table if not exists families (
  id   text primary key,
  code text not null,
  data jsonb not null default '{}'::jsonb
);

-- Family codes are normalized (lowercase, underscores) before they are written,
-- so a plain unique index is enough to enforce the handle's uniqueness.
create unique index if not exists families_code_key on families (code);

-- Profile and access only — Supabase Auth owns the credentials. `id` is the
-- `auth.users` uuid.
-- data: { name, role, moduleAccess }
create table if not exists login_users (
  id        text primary key,
  family_id text not null references families (id) on delete cascade,
  username  text not null,
  data      jsonb not null default '{}'::jsonb
);

-- Usernames are unique within a family, not globally: two families can each
-- have their own "admin" or "dad".
create unique index if not exists login_users_family_username_key
  on login_users (family_id, username);

-- Credential recovery ("Forgot Family ID") looks a username up across every
-- family, inside the Edge Function.
create index if not exists login_users_username_idx on login_users (username);

-- One row per family, id = families.id. data: metal rates.
create table if not exists family_settings (
  id   text primary key references families (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- True if the caller is an admin of `target_family`. `security definer` so it
-- can read `login_users` without re-triggering that table's own policies, which
-- would recurse.
create or replace function is_family_admin(target_family text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from login_users u
    where u.id = jwt_user_id()
      and u.family_id = target_family
      and u.family_id = jwt_family_id()
      and u.data ->> 'role' = 'admin'
  );
$$;

-- ---------------------------------------------------------------- --
-- The four measured tables
--
-- DROPPED AND RECREATED: promoting a jsonb field to a typed column changes the
-- row shape, and these tables are new enough to have nothing worth keeping. If
-- you have rows here you care about, export them before running this.
--
-- `owner_id`, `type_id`, `client_id` and `bank_id` are deliberately NOT foreign
-- keys — see the note under the small tables below.
-- ---------------------------------------------------------------- --

drop table if exists expenses cascade;
create table expenses (
  id         text primary key,
  family_id  text not null references families (id) on delete cascade,
  owner_id   text not null,
  visibility text not null default 'private'
             check (visibility in ('private', 'public')),
  -- was a string in jsonb; totals are computed on it
  amount     numeric not null,
  -- was "17-Jul-2026"; the filter you want needs a real date
  spent_on   date,
  -- `expense_types` row id. `data.typeName` stays denormalised alongside it.
  type_id    text,
  -- typeName, comments
  data       jsonb not null default '{}'::jsonb
);
create index expenses_family_id_idx on expenses (family_id);
create index expenses_family_spent_on_idx on expenses (family_id, spent_on desc);
create index expenses_family_type_idx on expenses (family_id, type_id);

drop table if exists ledger_earnings cascade;
create table ledger_earnings (
  id         text primary key,
  family_id  text not null references families (id) on delete cascade,
  owner_id   text not null,
  visibility text not null default 'private'
             check (visibility in ('private', 'public')),
  amount     numeric not null,
  entry_date date,
  -- `ledger_clients` row id. `data.clientName` stays denormalised alongside it.
  client_id  text,
  -- clientName, comments, type
  data       jsonb not null default '{}'::jsonb
);
create index ledger_earnings_family_id_idx on ledger_earnings (family_id);
create index ledger_earnings_family_date_idx
  on ledger_earnings (family_id, entry_date desc);

drop table if exists ledger_savings cascade;
create table ledger_savings (
  id         text primary key,
  family_id  text not null references families (id) on delete cascade,
  owner_id   text not null,
  visibility text not null default 'private'
             check (visibility in ('private', 'public')),
  amount     numeric not null,
  entry_date date,
  client_id  text,
  -- clientName, comments
  data       jsonb not null default '{}'::jsonb
);
create index ledger_savings_family_id_idx on ledger_savings (family_id);
create index ledger_savings_family_date_idx
  on ledger_savings (family_id, entry_date desc);

drop table if exists fixed_deposits cascade;
create table fixed_deposits (
  id                  text primary key,
  family_id           text not null references families (id) on delete cascade,
  owner_id            text not null,
  visibility          text not null default 'private'
                      check (visibility in ('private', 'public')),
  amount              numeric not null,
  -- `banks` row id
  bank_id             text,
  deposited_on        date,
  matures_on          date,
  -- optional: the form allows these to be left blank
  interest            numeric,
  interest_percentage numeric,
  -- depositorName
  data                jsonb not null default '{}'::jsonb
);
create index fixed_deposits_family_id_idx on fixed_deposits (family_id);
create index fixed_deposits_family_matures_idx
  on fixed_deposits (family_id, matures_on);
create index fixed_deposits_family_bank_idx on fixed_deposits (family_id, bank_id);

-- ---------------------------------------------------------------- --
-- The small jsonb-only tables
--
-- Tens of rows each, never filtered or totalled in SQL. `properties` in
-- particular holds a nested array of payment entries, which is exactly what
-- jsonb is for.
--
-- None of these reference `login_users`, and the measured tables above don't
-- reference each other. That is deliberate: `on delete cascade` would mean
-- removing a member (or an expense type) silently destroyed the records that
-- pointed at them, and `restrict` would block the removal instead. Firestore had
-- no such constraint, and the app relies on the old behavior — a deleted
-- expense type leaves its expenses readable via the denormalised `typeName`.
-- ---------------------------------------------------------------- --

do $$
declare
  t text;
begin
  foreach t in array array[
    'banks', 'government_documents', 'bank_documents',
    'ornaments', 'properties', 'vehicles', 'ledger_clients', 'expense_types'
  ]
  loop
    execute format($fmt$
      create table if not exists %I (
        id         text primary key,
        family_id  text not null references families (id) on delete cascade,
        owner_id   text not null,
        visibility text not null default 'private'
                   check (visibility in ('private', 'public')),
        data       jsonb not null default '{}'::jsonb
      );
    $fmt$, t);

    execute format(
      'create index if not exists %I on %I (family_id);', t || '_family_id_idx', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------- --
-- RLS for every domain table
--
-- Identical rules for all eleven, whether or not they have promoted columns.
-- ---------------------------------------------------------------- --

do $$
declare
  t text;
begin
  foreach t in array array[
    'banks', 'fixed_deposits', 'government_documents', 'bank_documents',
    'ornaments', 'properties', 'vehicles', 'ledger_clients', 'ledger_earnings',
    'ledger_savings', 'expenses', 'expense_types'
  ]
  loop
    execute format('alter table %I enable row level security;', t);

    -- Read: everything public in my family, plus my own private rows.
    execute format('drop policy if exists %I on %I;', t || '_select', t);
    execute format($fmt$
      create policy %I on %I for select to authenticated
        using (
          family_id = jwt_family_id()
          and (visibility = 'public' or owner_id = jwt_user_id())
        );
    $fmt$, t || '_select', t);

    -- Write: only my own rows, only in my own family. This is what makes
    -- owner-only editing a database rule rather than a client convention — a
    -- member cannot modify another member's row even though they can see it.
    execute format('drop policy if exists %I on %I;', t || '_insert', t);
    execute format($fmt$
      create policy %I on %I for insert to authenticated
        with check (family_id = jwt_family_id() and owner_id = jwt_user_id());
    $fmt$, t || '_insert', t);

    execute format('drop policy if exists %I on %I;', t || '_update', t);
    execute format($fmt$
      create policy %I on %I for update to authenticated
        using (family_id = jwt_family_id() and owner_id = jwt_user_id())
        with check (family_id = jwt_family_id() and owner_id = jwt_user_id());
    $fmt$, t || '_update', t);

    execute format('drop policy if exists %I on %I;', t || '_delete', t);
    execute format($fmt$
      create policy %I on %I for delete to authenticated
        using (family_id = jwt_family_id() and owner_id = jwt_user_id());
    $fmt$, t || '_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- --
-- RLS for the account tables
-- ---------------------------------------------------------------- --

alter table families        enable row level security;
alter table login_users     enable row level security;
alter table family_settings enable row level security;

-- A member sees only their own family. Registration and the login screen's
-- family lookup do NOT go through here — they run inside the Edge Function —
-- which is what stops the publishable key from enumerating every registered
-- family.
drop policy if exists families_select on families;
create policy families_select on families for select to authenticated
  using (id = jwt_family_id());

drop policy if exists families_update on families;
create policy families_update on families for update to authenticated
  using (id = jwt_family_id() and is_family_admin(id))
  with check (id = jwt_family_id() and is_family_admin(id));

-- Every member can see their family's roster (admin panel, person pickers).
drop policy if exists login_users_select on login_users;
create policy login_users_select on login_users for select to authenticated
  using (family_id = jwt_family_id());

-- Adding a member, renaming one, resetting a password and removing a member all
-- have to touch `auth.users` too, so they run in the Edge Function under the
-- service_role key. Nothing else may write this table.
drop policy if exists login_users_update on login_users;
drop policy if exists login_users_delete on login_users;
drop policy if exists login_users_insert on login_users;

-- Metal rates are shared family-wide, so any member may read and write them.
drop policy if exists family_settings_all on family_settings;
create policy family_settings_all on family_settings for all to authenticated
  using (id = jwt_family_id())
  with check (id = jwt_family_id());

-- ---------------------------------------------------------------- --
-- Attachments (scans and photos of documents, ornaments, deeds…)
--
-- The *files* live in Storage; their metadata lives in the owning record's
-- `data.attachments` array, not in a table of its own:
--
--   data.attachments = [
--     { id, name, path, mime, size, uploadedAt }, ...
--   ]
--
-- That is what makes visibility correct with no work. An attachment is not a
-- thing you can see on its own — it is part of the record it hangs off, so it
-- should be exactly as visible as that record is. Keeping the metadata inside
-- the row means flipping a document private -> public takes its files with it,
-- deleting the row takes its file list with it, and there is no second copy of
-- `visibility`/`owner_id` that can drift out of sync with the first. A separate
-- `attachments` table would need all of that kept in step by hand, on every
-- edit, forever.
--
-- Nothing filters or sorts on attachments, so jsonb is the right home for them
-- under the same rule as the small tables above.
-- ---------------------------------------------------------------- --

-- Private bucket: no object is readable without a signed URL, which the client
-- can only mint for paths the policies below already let it read.
--
-- The limits are enforced here rather than only in the picker, because the
-- picker is client code and this is not. 10 MB fits a phone photo of an ID or a
-- multi-page PDF scan with room to spare.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths are `{family_id}/{attachment_id}.{ext}`, so the first folder segment is
-- the tenant boundary and `storage.foldername(name))[1]` is what the policies
-- key off — the exact analogue of `family_id = jwt_family_id()` on a table.
--
-- Read is family-wide and write is owner-only, matching the domain tables. Note
-- the asymmetry with the *record* rules: a member who can see a public document
-- can fetch its files, and a member who cannot see a private document never
-- learns its attachment paths, because those paths only exist inside a row RLS
-- already hid from them. The ids are 20 random characters, so the paths are not
-- guessable either — but this is one policy short of exact: a member holding a
-- path they were never meant to have could still fetch it. Tightening that
-- means resolving each path back to its owning record, which cannot be done
-- without a table that knows which module the file belongs to.
drop policy if exists documents_select on storage.objects;
create policy documents_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = jwt_family_id()
  );

-- `owner` is stamped by Storage with the uploader's auth.uid(), so it is the
-- same guarantee `owner_id = jwt_user_id()` gives on the tables: you may only
-- add, replace or remove files you uploaded yourself.
drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = jwt_family_id()
    and owner = auth.uid()
  );

drop policy if exists documents_update on storage.objects;
create policy documents_update on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = jwt_family_id()
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = jwt_family_id()
    and owner = auth.uid()
  );

drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = jwt_family_id()
    and owner = auth.uid()
  );
