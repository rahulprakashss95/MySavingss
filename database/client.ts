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
import { AppState, Platform } from "react-native";
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

/* ------------------------------------------------------------------ *
 * 401 recovery
 *
 * supabase-js resolves the bearer token per request by calling `getSession()`,
 * and when that comes back empty it falls back to the publishable key above.
 * A `sb_publishable_*` key is not a JWT, so the API answers **401** instead of
 * quietly degrading to the anon role — and it comes back empty more often than
 * you'd hope on a cold start: the persisted access token has usually expired,
 * and the refresh behind it can lose a race with the first screen's reads or
 * land inside auth-js's 60s post-failure cooldown.
 *
 * One 401 used to be terminal. The query client runs with `retry: false` and
 * `staleTime: Infinity`, so a collection that failed once stayed failed for the
 * whole session — the "load the app, get nothing, relaunch and it's fine" bug.
 *
 * So every request gets exactly one second chance: on a 401 the session is
 * refreshed and the call is replayed with the new token. Concurrent 401s share
 * a single refresh rather than each firing their own. Requests to the auth
 * endpoint are exempt — refreshing in response to a failed refresh would spin.
 * ------------------------------------------------------------------ */

let refreshInFlight: Promise<string | null> | null = null;

/** Refreshes the session, collapsing concurrent callers onto one request. */
const refreshOnce = (): Promise<string | null> => {
  refreshInFlight ??= supabase.auth
    .refreshSession()
    .then(({ data }) => data.session?.access_token ?? null)
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

const retryingFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 401 || urlOf(input).includes("/auth/v1/")) {
    return response;
  }

  const token = await refreshOnce();
  if (!token) {
    // Genuinely signed out (or offline). Hand back the 401 so the caller's
    // error path runs, rather than masking it as something retryable.
    return response;
  }

  // `init.headers` still carries the token that just failed — supabase-js built
  // them before the call — so the replay has to carry the new one itself.
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

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
  global: { fetch: retryingFetch },
});

/**
 * `autoRefreshToken` drives a timer, and on native a timer stops being reliable
 * the moment the app leaves the foreground — so a token that should have been
 * renewed while backgrounded is instead stale on resume. Supabase's own React
 * Native guidance is to gate the refresh loop on AppState; web needs none of
 * this, since the tab either runs or is gone.
 */
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

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
