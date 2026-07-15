import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authenticate,
  getFamilyById,
} from "../../database/firebaseQuery";
import type { SessionUser } from "../context/AuthContext";
import type { FamilyModel } from "../models/FamilyModel";
import type { StoredLoginUser } from "../models/LoginUserModel";

/**
 * The last family signed into, remembered on the device so returning users
 * don't retype their Family ID. Survives logout; shared by the login and
 * recovery screens.
 */
export const LAST_FAMILY_KEY = "@homevault/lastFamily";

export const rememberFamily = (family: FamilyModel) =>
  AsyncStorage.setItem(LAST_FAMILY_KEY, JSON.stringify(family)).catch((error) =>
    console.log("SaveFamilyError", error)
  );

/** Assembles the persisted session from a stored user and its family. */
export const toSession = (
  stored: StoredLoginUser,
  family: FamilyModel
): SessionUser => ({
  id: stored.id,
  username: stored.username,
  name: stored.name,
  familyId: family.id,
  familyName: family.name,
  familyCode: family.code,
  role: stored.role ?? "member",
  moduleAccess: stored.moduleAccess ?? [],
});

/**
 * Verifies credentials against the chosen family and resolves a ready-to-persist
 * session, or null when the username/password is wrong or the family is missing.
 */
export const signInWithCredentials = async (
  familyId: string,
  username: string,
  password: string
): Promise<SessionUser | null> => {
  const stored = await authenticate(familyId, username, password);
  if (!stored) {
    return null;
  }
  const family = await getFamilyById(familyId);
  if (!family) {
    return null;
  }
  return toSession(stored, family);
};
