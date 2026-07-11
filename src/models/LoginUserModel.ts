/**
 * A family member's account. Deliberately narrow: the `loginUsers` collection
 * also holds credentials, and nothing outside the login flow should read them.
 */
export type LoginUserModel = {
  id: string;
  username: string;
  /** Display name, e.g. "Rahul Prakash". Falls back to `username` when absent. */
  name?: string;
};

export const displayNameOf = (user: LoginUserModel) => user.name || user.username;
