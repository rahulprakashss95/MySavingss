import type { ModuleKey } from "./common";

/**
 * A family member's account, as projected to the UI (pickers, admin list).
 * Deliberately narrow: the `loginUsers` collection also holds credentials, and
 * nothing outside the login/admin flow should read the hash.
 */
export type LoginUserModel = {
  id: string;
  /** `families` doc id this account belongs to. */
  familyId: string;
  /** Globally unique across all families — the login handle. */
  username: string;
  /** Display name, e.g. "Rahul Prakash". Falls back to `username` when absent. */
  name?: string;
  /** Admins manage users and family settings; members only use their modules. */
  role: UserRole;
  /** Which modules this member may open. Admins implicitly see all. */
  moduleAccess: ModuleKey[];
};

export type UserRole = "admin" | "member";

/**
 * The full stored shape, including credentials. Only the login and admin data
 * layers touch this; the rest of the app uses `LoginUserModel`.
 */
export type StoredLoginUser = LoginUserModel & {
  passwordHash: string;
  passwordSalt: string;
};

export const displayNameOf = (user: Pick<LoginUserModel, "name" | "username">) =>
  user.name || user.username;

export const isAdminRole = (role: UserRole | undefined) => role === "admin";
