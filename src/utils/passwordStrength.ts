/**
 * Lightweight password-strength gate for the custom login. Not a substitute for
 * a real breach list — just enough to stop the obviously guessable passwords
 * (admin@123, password1, the username itself) that people reach for first.
 */

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Tokens that make a password trivially guessable. Matched as substrings, so
 * "admin@123" is rejected via "admin" and "password1" via "password".
 */
const WEAK_SUBSTRINGS = [
  "password",
  "passw0rd",
  "admin",
  "qwerty",
  "welcome",
  "letmein",
  "iloveyou",
  "monkey",
  "dragon",
  "abc123",
  "123456",
  "12345",
  "111111",
  "000000",
  "0000",
  "1111",
];

type Options = {
  /** Reject passwords that contain the account's username. */
  username?: string;
  min?: number;
};

/** Returns an error message when the password is too weak, or null when it's ok. */
export const validatePassword = (
  password: string,
  { username, min = MIN_PASSWORD_LENGTH }: Options = {}
): string | null => {
  if (!password || password.length < min) {
    return `Use at least ${min} characters.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Include at least one letter.";
  }
  if (!/\d/.test(password)) {
    return "Include at least one number.";
  }
  if (/^(.)\1+$/.test(password)) {
    return "Don't repeat a single character.";
  }

  const lower = password.toLowerCase();
  if (WEAK_SUBSTRINGS.some((weak) => lower.includes(weak))) {
    return "That password is too easy to guess — avoid common words like “password” or “admin”.";
  }

  const uname = username?.trim().toLowerCase();
  if (uname && uname.length >= 3 && lower.includes(uname)) {
    return "Don't put the username in the password.";
  }

  return null;
};
