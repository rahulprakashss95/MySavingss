import * as Crypto from "expo-crypto";

/**
 * Password storage for the custom (non-Firebase-Auth) login. Passwords are
 * never stored in cleartext: each account gets a random salt, and we store
 * SHA-256(salt + ":" + password). This is a pragmatic step up from the old
 * plaintext scheme — good enough for a trusted multi-family beta, and it is the
 * seam to swap for Firebase Auth later without touching call sites.
 *
 * The salt makes two accounts with the same password hash differently and
 * removes the old ability to look a user up by (username, password) in one
 * query — login now fetches by username, then verifies against the stored salt.
 */

export type PasswordCredential = {
  passwordSalt: string;
  passwordHash: string;
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** 16 random bytes, hex-encoded. Uses the platform CSPRNG (web + native). */
const randomSalt = () => toHex(Crypto.getRandomBytes(16));

export const hashPassword = (password: string, salt: string) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`
  );

/** Fresh salt + hash for a new or reset password. */
export const makeCredential = async (
  password: string
): Promise<PasswordCredential> => {
  const passwordSalt = randomSalt();
  const passwordHash = await hashPassword(password, passwordSalt);
  return { passwordSalt, passwordHash };
};

export const verifyPassword = async (
  password: string,
  credential: Pick<PasswordCredential, "passwordSalt" | "passwordHash">
): Promise<boolean> => {
  if (!credential.passwordSalt || !credential.passwordHash) {
    return false;
  }
  const computed = await hashPassword(password, credential.passwordSalt);
  return computed === credential.passwordHash;
};
