import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { create } from "zustand";
import { useAuthStore } from "./AuthContext";

const PASSCODE_STORAGE_KEY = "@homevault/passcode";

/** What we keep on disk: never the passcode itself, only a salted digest. */
type StoredPasscode = { salt: string; hash: string };

const isStoredPasscode = (value: unknown): value is StoredPasscode =>
  !!value &&
  typeof (value as StoredPasscode).salt === "string" &&
  typeof (value as StoredPasscode).hash === "string";

const digest = (salt: string, code: string) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${code}`
  );

type PasscodeStore = {
  stored: StoredPasscode | null;
  /** True when a passcode has been set and the app should lock on launch. */
  isEnabled: boolean;
  /**
   * True when the launch lock is armed and not yet cleared. The gate is only
   * shown when this is true *and* a user is signed in — a logged-out launch
   * goes straight to login (see the root navigator).
   */
  isLocked: boolean;
  /** True until the stored passcode state has been read from storage. */
  isRestoring: boolean;
  /** Set (or replace) the passcode and turn the feature on. */
  enablePasscode: (code: string) => Promise<void>;
  /** Forget the passcode and turn the feature off. */
  disablePasscode: () => Promise<void>;
  /** Check a candidate code against the stored digest. */
  verify: (code: string) => Promise<boolean>;
  /** Clear the launch lock after a successful entry. */
  unlock: () => void;
  /** Rehydrate the stored digest once at cold start. */
  restore: () => Promise<void>;
  /**
   * Arm the launch lock if a restored session has a passcode enabled. Called
   * once after auth + passcode have both rehydrated. Locking only a *restored*
   * session is deliberate: a user who just typed their credentials has already
   * authenticated, and toggling the passcode on later in Settings must not lock
   * them out of the running app.
   */
  arm: () => void;
};

/**
 * The launch passcode. Was a React context + provider (which watched auth to
 * decide arming); now a Zustand store. The arm step reads the auth store
 * directly, and the `usePasscode` hook name and shape are unchanged.
 */
export const usePasscodeStore = create<PasscodeStore>((set, get) => ({
  stored: null,
  isEnabled: false,
  isLocked: false,
  isRestoring: true,

  enablePasscode: async (code) => {
    const salt = Crypto.randomUUID();
    const hash = await digest(salt, code);
    const next: StoredPasscode = { salt, hash };
    try {
      await AsyncStorage.setItem(PASSCODE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Unable to persist passcode", error);
      throw error;
    }
    // Setting a passcode inside a running session never locks it — the lock is
    // for the next launch.
    set({ stored: next, isEnabled: true, isLocked: false });
  },

  disablePasscode: async () => {
    try {
      await AsyncStorage.removeItem(PASSCODE_STORAGE_KEY);
    } catch (error) {
      console.log("Unable to clear passcode", error);
      throw error;
    }
    set({ stored: null, isEnabled: false, isLocked: false });
  },

  verify: async (code) => {
    const { stored } = get();
    if (!stored) return false;
    const hash = await digest(stored.salt, code);
    return hash === stored.hash;
  },

  unlock: () => set({ isLocked: false }),

  restore: async () => {
    try {
      // The launch decision waits on this (splash stays up), so never let a
      // wedged read hang the app — continue as "no passcode" after a grace period.
      const raw = await Promise.race([
        AsyncStorage.getItem(PASSCODE_STORAGE_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isStoredPasscode(parsed)) {
          set({ stored: parsed, isEnabled: true });
        }
      }
    } catch (error) {
      console.log("Unable to restore passcode state", error);
    } finally {
      set({ isRestoring: false });
    }
  },

  arm: () => {
    const { user } = useAuthStore.getState();
    if (user && get().isEnabled) {
      set({ isLocked: true });
    }
  },
}));

export const usePasscode = () => usePasscodeStore();
