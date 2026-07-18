import type { ModuleKey } from "./common";

/**
 * A family member's account. This is the whole stored shape — credentials are
 * not here and never were: Supabase Auth owns them, keyed by a synthetic email
 * derived from (familyId, username). See `database/query.ts`.
 */
export type LoginUserModel = {
  /** Also the Supabase Auth user id, so `auth.uid()` identifies this row. */
  id: string;
  /** `families` row id this account belongs to. */
  familyId: string;
  /** The login handle — unique within the family, not globally. */
  username: string;
  /** Display name, e.g. "Rahul Prakash". Falls back to `username` when absent. */
  name?: string;
  /** Admins manage users and family settings; members only use their modules. */
  role: UserRole;
  /** Which modules this member may open. Admins implicitly see all. */
  moduleAccess: ModuleKey[];
};

export type UserRole = "admin" | "member";

export const displayNameOf = (user: Pick<LoginUserModel, "name" | "username">) =>
  user.name || user.username;

export const isAdminRole = (role: UserRole | undefined) => role === "admin";
