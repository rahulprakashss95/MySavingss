/**
 * HomeVault auth — the only server-side code in the app.
 *
 * Supabase Auth handles passwords, tokens and sessions. This function exists
 * for the things a client bundle cannot do, all of which need the service_role
 * key:
 *
 *  1. **Creating and removing members.** Admins create accounts for their
 *     family. A client calling `signUp()` would sign the *admin* out, and
 *     `auth.admin.*` needs service_role — which can never ship to a device.
 *  2. **Stamping `app_metadata.family_id`.** Every RLS policy trusts that claim
 *     precisely because only service_role can write it.
 *  3. **Registration and the login screen's family lookup**, which necessarily
 *     run signed-out, and which must not let anyone enumerate families.
 *  4. **"Forgot Family ID" recovery**, which must verify a password before
 *     revealing that a family exists.
 *
 * Deploy:
 *   supabase functions deploy auth --no-verify-jwt
 *
 * `--no-verify-jwt` is required: registration, login lookup and recovery are
 * unauthenticated by nature. Every action that needs a caller checks it below.
 */

// Fully-qualified on purpose: a bare specifier would depend on a deno.json
// being resolved at deploy time, which differs between the CLI and the
// dashboard editor. This resolves identically everywhere.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// service_role bypasses RLS. Safe only because this runs on Supabase's servers
// and the key is never shipped to a device.
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // supabase-js attaches headers of its own (`x-client-info`, and more as it
  // evolves). Listing them by hand means a browser preflight starts failing the
  // day the library adds one — so the OPTIONS handler below echoes back
  // whatever the browser actually asks for. This default only applies if a
  // preflight arrives without Access-Control-Request-Headers.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 400) => json({ error: message }, status);

/* ------------------------------------------------------------------ *
 * Synthetic emails
 *
 * Supabase Auth identifies users by email; HomeVault identifies them by
 * username within a family and has no email anywhere. The bridge is an address
 * derived from (family_id, username) that nobody ever sees or types.
 *
 * MUST match `syntheticEmail` in `database/query.ts` exactly — if these two
 * ever disagree, logins fail. The local part is a hash because usernames are
 * free text and may contain characters that are invalid in an address.
 * ------------------------------------------------------------------ */

const syntheticEmail = async (familyId: string, username: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(username.trim())
  );
  const local = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
  return `${local}@${familyId.toLowerCase()}.homevault.internal`;
};

/* ------------------------------------------------------------------ *
 * Shapes handed back to the client
 * ------------------------------------------------------------------ */

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Same shape of id the client mints (see `newId` in database/query.ts). */
const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length])
    .join("");

type UserRow = {
  id: string;
  family_id: string;
  username: string;
  data: Record<string, unknown>;
};

type FamilyRow = { id: string; code: string; data: Record<string, unknown> };

const toFamily = (row: FamilyRow) => ({ ...row.data, code: row.code, id: row.id });

const toUser = (row: UserRow) => ({
  ...row.data,
  id: row.id,
  familyId: row.family_id,
  username: row.username,
  role: row.data.role ?? "member",
  moduleAccess: row.data.moduleAccess ?? [],
});

const normalizeFamilyCode = (raw: string) =>
  raw.trim().toLowerCase().replace(/\s+/g, "_");

/* ------------------------------------------------------------------ *
 * Caller identity
 * ------------------------------------------------------------------ */

type Caller = { userId: string; familyId: string };

/** Resolves the bearer token to a member, or null. Supabase Auth verifies it. */
const callerOf = async (request: Request): Promise<Caller | null> => {
  const header = request.headers.get("Authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7)
    : null;
  // The publishable key is a valid bearer token to GoTrue but identifies no
  // user, so an anon token resolves to null here rather than an error.
  if (!token || token === ANON_KEY) return null;

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  const familyId = (data.user.app_metadata as { family_id?: string })?.family_id;
  return familyId ? { userId: data.user.id, familyId } : null;
};

const isAdminOf = async (caller: Caller, familyId: string) => {
  if (caller.familyId !== familyId) return false;
  const { data } = await db
    .from("login_users")
    .select("data")
    .eq("id", caller.userId)
    .maybeSingle();
  return (data?.data as { role?: string } | undefined)?.role === "admin";
};

/** Resolves the caller and asserts they administer `familyId`. */
const requireAdmin = async (
  request: Request,
  familyId: string
): Promise<Caller | Response> => {
  const caller = await callerOf(request);
  if (!caller) return fail("Not signed in.", 401);
  if (!(await isAdminOf(caller, familyId))) {
    return fail("Only a family admin can do that.", 403);
  }
  return caller;
};

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

const actions: Record<
  string,
  (body: any, request: Request) => Promise<Response>
> = {
  /**
   * Login resolves a family by its handle, so this is necessarily public. It
   * returns one family by exact code and never a list — the app deliberately
   * does not let anyone enumerate registered families.
   */
  "family-by-code": async ({ code }) => {
    if (typeof code !== "string") return fail("code is required");
    const { data, error } = await db
      .from("families")
      .select("*")
      .eq("code", normalizeFamilyCode(code))
      .maybeSingle();
    if (error) return fail(error.message, 500);
    return json({ family: data ? toFamily(data) : null });
  },

  "code-available": async ({ code, exceptId }) => {
    if (typeof code !== "string") return fail("code is required");
    const { data, error } = await db
      .from("families")
      .select("id")
      .eq("code", normalizeFamilyCode(code));
    if (error) return fail(error.message, 500);
    return json({ available: data.every((row) => row.id === exceptId) });
  },

  /** Public: this is registration. The founding admin is created separately. */
  "create-family": async ({ name, code, createdAt }) => {
    if (typeof name !== "string" || typeof code !== "string") {
      return fail("name and code are required");
    }
    const family = {
      id: newId(),
      code: normalizeFamilyCode(code),
      data: { name, createdAt: createdAt ?? new Date().toISOString() },
    };
    const { error } = await db.from("families").insert(family);
    // The unique index on `code` is the real arbiter; the availability check is
    // only a friendlier pre-flight.
    if (error) {
      return error.code === "23505"
        ? fail("That Family ID is already taken.", 409)
        : fail(error.message, 500);
    }
    return json({ family: toFamily(family) });
  },

  /**
   * Admin-only, unlike `code-available`. Only the admin panel asks this, and
   * leaving it open would hand anyone with the publishable key an oracle for
   * enumerating a family's usernames.
   */
  "username-available": async ({ familyId, username, exceptId }, request) => {
    if (typeof familyId !== "string" || typeof username !== "string") {
      return fail("familyId and username are required");
    }
    const caller = await requireAdmin(request, familyId);
    if (caller instanceof Response) return caller;

    const { data, error } = await db
      .from("login_users")
      .select("id")
      .eq("family_id", familyId)
      .eq("username", username.trim());
    if (error) return fail(error.message, 500);
    return json({ available: data.every((row) => row.id === exceptId) });
  },

  /**
   * Creating a member is an admin action — except for the very first user in a
   * family, which is the founding admin created moments after `create-family`
   * and so cannot present a token yet. The empty-family check bounds that
   * bootstrap: once any user exists, a valid admin token is required.
   */
  "create-member": async (body, request) => {
    const { familyId, username, name, role, moduleAccess, password } = body;
    if (typeof familyId !== "string" || typeof username !== "string") {
      return fail("familyId and username are required");
    }
    if (typeof password !== "string" || password.length < 8) {
      return fail("A password of at least 8 characters is required");
    }

    const { count, error: countError } = await db
      .from("login_users")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId);
    if (countError) return fail(countError.message, 500);

    if ((count ?? 0) > 0) {
      const caller = await requireAdmin(request, familyId);
      if (caller instanceof Response) return caller;
    } else {
      // Bootstrap: only for a family that exists and has no members yet.
      const { data: family } = await db
        .from("families")
        .select("id")
        .eq("id", familyId)
        .maybeSingle();
      if (!family) return fail("Family not found.", 404);
    }

    const { data: created, error: createError } = await db.auth.admin.createUser({
      email: await syntheticEmail(familyId, username),
      password,
      // There is no mailbox behind a synthetic address, so nothing could ever
      // confirm it.
      email_confirm: true,
      // Only service_role can write app_metadata, which is exactly why the RLS
      // policies are allowed to trust family_id.
      app_metadata: { family_id: familyId },
    });
    if (createError || !created.user) {
      const message = createError?.message ?? "Unable to create the member.";
      return fail(
        /already/i.test(message) ? "That username is already taken." : message,
        /already/i.test(message) ? 409 : 500
      );
    }

    const { error } = await db.from("login_users").insert({
      id: created.user.id,
      family_id: familyId,
      username: username.trim(),
      // An absent display name is stored empty, not omitted; the app falls back
      // to the username.
      data: {
        name: name ?? "",
        role: role ?? "member",
        moduleAccess: moduleAccess ?? [],
      },
    });
    if (error) {
      // Never leave an auth account with no profile behind it.
      await db.auth.admin.deleteUser(created.user.id);
      return error.code === "23505"
        ? fail("That username is already taken.", 409)
        : fail(error.message, 500);
    }

    return json({ userId: created.user.id });
  },

  /**
   * Profile/access edits. Renaming a member has to re-derive their synthetic
   * email, since it is a function of the username — which is why this cannot be
   * a plain table update from the client.
   */
  "update-member": async ({ userId, patch }, request) => {
    if (typeof userId !== "string" || typeof patch !== "object" || !patch) {
      return fail("userId and patch are required");
    }
    const { data: target, error: findError } = await db
      .from("login_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (findError) return fail(findError.message, 500);
    if (!target) return fail("User not found.", 404);

    const caller = await requireAdmin(request, target.family_id);
    if (caller instanceof Response) return caller;

    const { username, ...rest } = patch as Record<string, unknown>;
    const next: Record<string, unknown> = {
      // A patch touches only the keys it carries, so merge rather than replace.
      data: { ...target.data, ...rest },
    };
    if (typeof username === "string" && username.trim() !== target.username) {
      next.username = username.trim();
      const { error: emailError } = await db.auth.admin.updateUserById(userId, {
        email: await syntheticEmail(target.family_id, username),
        // Confirm it outright. With "Secure email change" enabled the address
        // would otherwise sit pending a confirmation link that can never
        // arrive — there is no mailbox behind a synthetic address — and the
        // member would be locked out under their new username.
        email_confirm: true,
      });
      if (emailError) return fail(emailError.message, 500);
    }

    const { error } = await db.from("login_users").update(next).eq("id", userId);
    if (error) {
      return error.code === "23505"
        ? fail("That username is already taken.", 409)
        : fail(error.message, 500);
    }
    return json({ ok: true });
  },

  /**
   * A member setting (or clearing, with a null avatar) their OWN profile
   * picture. Self-only — unlike `update-member` this needs no admin, because it
   * touches nothing but the caller's own picture. It exists as an Edge Function
   * purely because `login_users` has no client write policy; the image bytes
   * were already uploaded straight to the public `avatars` bucket by the client.
   */
  "update-avatar": async ({ userId, avatar }, request) => {
    if (typeof userId !== "string") return fail("userId is required");

    const caller = await callerOf(request);
    if (!caller) return fail("Not signed in.", 401);
    if (caller.userId !== userId) {
      return fail("You can only change your own picture.", 403);
    }

    const { data: target, error: findError } = await db
      .from("login_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (findError) return fail(findError.message, 500);
    if (!target) return fail("User not found.", 404);

    let nextAvatar: { path: string } | null = null;
    if (avatar && typeof avatar === "object") {
      const path = (avatar as { path?: unknown }).path;
      // Avatars live under the member's own uid folder; reject anything else so
      // a member can't point their row at someone else's object.
      if (typeof path !== "string" || !path.startsWith(`${userId}/`)) {
        return fail("Invalid avatar path.", 400);
      }
      nextAvatar = { path };
    }

    const data = { ...target.data };
    if (nextAvatar) data.avatar = nextAvatar;
    else delete data.avatar;

    const { error } = await db
      .from("login_users")
      .update({ data })
      .eq("id", userId);
    if (error) return fail(error.message, 500);
    return json({ ok: true });
  },

  "delete-member": async ({ userId }, request) => {
    if (typeof userId !== "string") return fail("userId is required");
    const { data: target, error: findError } = await db
      .from("login_users")
      .select("family_id")
      .eq("id", userId)
      .maybeSingle();
    if (findError) return fail(findError.message, 500);
    if (!target) return json({ ok: true });

    const caller = await requireAdmin(request, target.family_id);
    if (caller instanceof Response) return caller;

    // The records this member owned deliberately survive them — see the
    // `owner_id` note in schema.sql. Only the account goes.
    await db.from("login_users").delete().eq("id", userId);
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) return fail(error.message, 500);
    return json({ ok: true });
  },

  /** An admin resetting a member's password, or a user resetting their own. */
  "reset-password": async ({ userId, password }, request) => {
    if (typeof userId !== "string") return fail("userId is required");
    if (typeof password !== "string" || password.length < 8) {
      return fail("A password of at least 8 characters is required");
    }
    const caller = await callerOf(request);
    if (!caller) return fail("Not signed in.", 401);

    const { data: target, error } = await db
      .from("login_users")
      .select("family_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) return fail(error.message, 500);
    if (!target) return fail("User not found.", 404);

    const isSelf = caller.userId === userId;
    if (!isSelf && !(await isAdminOf(caller, target.family_id))) {
      return fail("Only a family admin can reset another member's password.", 403);
    }

    const { error: updateError } = await db.auth.admin.updateUserById(userId, {
      password,
    });
    if (updateError) return fail(updateError.message, 500);
    return json({ ok: true });
  },

  /**
   * "Forgot Family ID": given a username + password, reveal every family where
   * those credentials work. Public by necessity — the user cannot name their
   * family, that is what they've lost — but it discloses a family only to
   * someone who already holds a working account in it, because each candidate
   * is confirmed by an actual sign-in attempt before being returned.
   */
  recover: async ({ username, password }) => {
    if (typeof username !== "string" || typeof password !== "string") {
      return fail("username and password are required");
    }
    const { data: users, error } = await db
      .from("login_users")
      .select("*")
      .eq("username", username.trim());
    if (error) return fail(error.message, 500);

    // A throwaway anon client: signing in on `db` would mutate service_role
    // state, and we only want the yes/no.
    const probe = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const matches = [];
    for (const user of users) {
      const { error: signInError } = await probe.auth.signInWithPassword({
        email: await syntheticEmail(user.family_id, user.username),
        password,
      });
      if (signInError) continue;
      await probe.auth.signOut();

      const { data: family } = await db
        .from("families")
        .select("*")
        .eq("id", user.family_id)
        .maybeSingle();
      if (family) {
        matches.push({ family: toFamily(family), user: toUser(user) });
      }
    }
    return json({ matches });
  },
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...cors,
        // Approve exactly what this browser intends to send.
        "Access-Control-Allow-Headers":
          request.headers.get("Access-Control-Request-Headers") ??
          cors["Access-Control-Allow-Headers"],
      },
    });
  }
  if (request.method !== "POST") return fail("Use POST.", 405);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Expected a JSON body.");
  }

  const action = actions[String(body.action)];
  if (!action) return fail(`Unknown action: ${body.action}`, 404);

  try {
    return await action(body, request);
  } catch (error) {
    // Never leak an internal message to the client; the details stay in logs.
    console.error(`action=${body.action}`, error);
    return fail("Something went wrong.", 500);
  }
});
