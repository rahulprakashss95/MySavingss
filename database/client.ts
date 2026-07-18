/**
 * The database connection. **Currently backed by Supabase (hosted Postgres);
 * before 2026-07-17 it was Firestore.**
 *
 * Named for its role, not its vendor, and deliberately so: the previous name
 * (`firebaseDb`) meant swapping providers churned every import in the app.
 * Nothing outside `database/` imports this file — screens go through
 * `database/query.ts` — so a future provider change should touch these two
 * files and nothing else.
 *
 * ## What the key does and doesn't buy you
 *
 * The connection details come from `.env` (see `.env.example`). That keeps
 * project config out of source and lets environments differ — it does not make
 * them secret: `EXPO_PUBLIC_*` values are inlined into the bundle and ship to
 * every device.
 *
 * That is fine, because the publishable key **grants no data access on its
 * own.** Every table requires a signed-in user: the RLS policies in
 * `schema.sql` key off the caller's identity, so a read returns rows only once
 * Supabase Auth has issued this client a session. The key that *would* matter,
 * `service_role`, is never here — it lives only in the Edge Function.
 */

import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
// PostgREST builds request URLs with `new URL()`, which Hermes does not fully
// implement. The polyfill must be imported before the client is created.
import "react-native-url-polyfill/auto";

// From `.env` — copy `.env.example` and fill it in. These must be read as
// static `process.env.EXPO_PUBLIC_*` expressions: Expo inlines them at build
// time by literal substitution, so pulling them from a variable key or
// destructuring `process.env` would leave them undefined in a release build.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly at startup rather than letting `createClient` build nonsense
  // URLs and surface as unexplained network errors on every screen.
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env, fill it in, and restart the dev server."
  );
}

/**
 * HomeVault logs in by username within a family, with no email — Supabase Auth
 * still does the actual authenticating, via a synthetic address derived from
 * (familyId, username). See `syntheticEmail` in `query.ts` and the `auth` Edge
 * Function for the whole picture.
 *
 * `storage: AsyncStorage` is what persists the session across restarts (the
 * default is web-only localStorage). `detectSessionInUrl` is off because the
 * app has no OAuth redirect to parse.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export default supabase;

/**
 * Calls the `auth` Edge Function — the only server-side code in the app, and
 * the only thing that can create members, stamp `app_metadata.family_id`, or
 * look a family up before sign-in.
 *
 * supabase-js attaches the current session's token automatically, so actions
 * that require an admin caller just work once signed in.
 */
export const callAuth = async <T,>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>("auth", {
    body: { action, ...body },
  });

  if (error) {
    // FunctionsHttpError carries the response; the function puts a
    // human-readable reason in `error`, which is worth surfacing over the
    // generic "non-2xx status code".
    const detail = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
};
