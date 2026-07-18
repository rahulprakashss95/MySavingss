# Supabase setup

The app will not load any data until all the steps below are done. Everything
here is one-time setup per project.

## 0. Point the app at your project

```bash
cp .env.example .env      # then fill in the two values
```

Both come from Dashboard → Project Settings → API. Expo reads `.env` at startup,
so restart the dev server after editing it. `.env` is gitignored; `.env.example`
is the tracked template.

## 1. Create the schema

Dashboard → SQL Editor → New query → paste all of `database/schema.sql` → Run.

It is safe to re-run: every statement is `if not exists` or `drop … if exists`
first.

## 2. Configure Auth

Dashboard → Authentication → Providers → **Email**:

- **Enable** the email provider. HomeVault has no email addresses of its own —
  members log in with a username inside a family — but Supabase Auth identifies
  users by email, so each member gets a synthetic address derived from
  `(familyId, username)`. Nobody ever sees or types it. See `syntheticEmail` in
  `database/query.ts`, which **must** stay identical to the copy in
  `functions/auth/index.ts`.
- **Turn "Confirm email" off**, or leave it on — either works. Accounts are
  created by the Edge Function with `email_confirm: true`, because there is no
  mailbox behind a synthetic address that could ever confirm one.

## 3. Deploy the Edge Function

This uploads `functions/auth/` to Supabase, where it runs server-side. It is the
only step the SQL Editor can't do. Run both from the **project root**; no global
install needed:

```bash
npx supabase login          # opens a browser
npx supabase functions deploy auth --no-verify-jwt --project-ref aefybibcwuzlhafkkhgz
```

`--project-ref` avoids `supabase link`, which would also ask for the database
password. The function **must** be named `auth` — the app calls it by that name
(`callAuth` in `database/client.ts`).

Prefer the dashboard? Edge Functions → Deploy a new function → name it `auth` →
paste `functions/auth/index.ts` → **turn "Verify JWT" off**.

`--no-verify-jwt` is required and is **not** a hole: registration, the login
screen's family lookup, and "Forgot Family ID" all necessarily run signed-out.
Leaving it on would break them. The function does its own per-action
authorization instead — everything that changes a member checks the caller is an
admin of that family first.

No secrets to set: `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

Redeploy with the same command after any edit to `functions/auth/index.ts`.

## How the pieces fit

| Concern | Lives in |
| --- | --- |
| Passwords, tokens, refresh, sessions | Supabase Auth |
| Family scoping, private/public, owner-only edits | RLS policies in `database/schema.sql` |
| Creating/renaming/removing members, registration, family lookup, recovery | `functions/auth/index.ts` |
| Everything else (all domain reads/writes) | `database/query.ts`, straight to the tables |

The publishable key (from `.env`) is public and grants **no data access on its
own** — every policy requires a signed-in user. Being an `EXPO_PUBLIC_` var it
is inlined into the shipped bundle, which is fine for exactly that reason.

The `service_role` key must never appear in `.env` or any `EXPO_PUBLIC_` var: it
bypasses RLS entirely. Supabase injects it into the Edge Function server-side,
which is the only place it exists.

### Why an Edge Function exists at all

Three things a client bundle cannot do:

1. **Create a member.** A client `signUp()` would replace the admin's own
   session with the new member's. `auth.admin.createUser()` needs
   `service_role`.
2. **Stamp `app_metadata.family_id`.** Every RLS policy trusts that claim
   *because* only `service_role` can write it. (`user_metadata` would be unsafe
   — users can write their own.)
3. **Look up a family before sign-in**, without letting anyone enumerate every
   registered family.

## Known sharp edges

- **CORS: don't hand-maintain the allowed-header list.** supabase-js attaches
  headers of its own (`x-client-info`, and more over time). Listing them by hand
  means a browser preflight starts failing the day the library adds one — which
  is exactly what happened on the first web registration attempt. The OPTIONS
  handler now echoes back `Access-Control-Request-Headers`. Native has no
  preflight, so this class of bug only ever shows up on web.

- **The two `syntheticEmail` functions must match byte for byte.** They are
  deliberately duplicated rather than shared, because one runs on Deno and one
  on Hermes. If you change one, change both, or every login breaks.
- **Removing a member does not remove their records.** This is deliberate — see
  the `owner_id` comment in `database/schema.sql`.
- **`recover` attempts one sign-in per family that shares the username**, so a
  username in many families could brush against Supabase's auth rate limits.
  In practice it is one.
