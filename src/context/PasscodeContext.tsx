import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

const PASSCODE_STORAGE_KEY = "@homevault/passcode";

/** What we keep on disk: never the passcode itself, only a salted digest. */
type StoredPasscode = { salt: string; hash: string };

type PasscodeContextValue = {
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
};

const PasscodeContext = createContext<PasscodeContextValue | undefined>(
  undefined
);

const isStoredPasscode = (value: unknown): value is StoredPasscode =>
  !!value &&
  typeof (value as StoredPasscode).salt === "string" &&
  typeof (value as StoredPasscode).hash === "string";

const digest = (salt: string, code: string) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${code}`
  );

type Props = {
  children: React.ReactNode;
};

export const PasscodeProvider = ({ children }: Props) => {
  // The lock only matters for a restored session, so we watch auth to decide
  // whether to arm it at cold start.
  const { user, isRestoring: authRestoring } = useAuth();

  const [stored, setStored] = useState<StoredPasscode | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Rehydrate the stored digest once on cold start.
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setIsRestoring(false);
      }
    };
    // The launch decision waits on this (splash stays up), so never let a
    // wedged read hang the app — continue as "no passcode" after a grace period.
    const timeout = setTimeout(() => {
      console.warn("Passcode restore timed out; continuing without a passcode.");
      finish();
    }, 3000);

    AsyncStorage.getItem(PASSCODE_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isStoredPasscode(parsed)) {
          setStored(parsed);
          setIsEnabled(true);
        }
      })
      .catch((error) => {
        console.log("Unable to restore passcode state", error);
      })
      .finally(() => {
        clearTimeout(timeout);
        finish();
      });
  }, []);

  // Arm the launch lock exactly once, the first time both auth and the passcode
  // state are known. Locking only a *restored* session is deliberate: a user who
  // just typed their credentials has already authenticated, and toggling the
  // passcode on later in Settings must not lock them out of the running app.
  const armedRef = useRef(false);
  useEffect(() => {
    if (authRestoring || isRestoring || armedRef.current) return;
    armedRef.current = true;
    if (user && isEnabled) {
      setIsLocked(true);
    }
  }, [authRestoring, isRestoring, user, isEnabled]);

  const enablePasscode = useCallback(async (code: string) => {
    const salt = Crypto.randomUUID();
    const hash = await digest(salt, code);
    const next: StoredPasscode = { salt, hash };
    try {
      await AsyncStorage.setItem(PASSCODE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.log("Unable to persist passcode", error);
      throw error;
    }
    setStored(next);
    setIsEnabled(true);
    // Setting a passcode inside a running session never locks it — the lock is
    // for the next launch.
    setIsLocked(false);
  }, []);

  const disablePasscode = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PASSCODE_STORAGE_KEY);
    } catch (error) {
      console.log("Unable to clear passcode", error);
      throw error;
    }
    setStored(null);
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  const verify = useCallback(
    async (code: string) => {
      if (!stored) return false;
      const hash = await digest(stored.salt, code);
      return hash === stored.hash;
    },
    [stored]
  );

  const unlock = useCallback(() => setIsLocked(false), []);

  const value = useMemo<PasscodeContextValue>(
    () => ({
      isEnabled,
      isLocked,
      isRestoring,
      enablePasscode,
      disablePasscode,
      verify,
      unlock,
    }),
    [
      isEnabled,
      isLocked,
      isRestoring,
      enablePasscode,
      disablePasscode,
      verify,
      unlock,
    ]
  );

  return (
    <PasscodeContext.Provider value={value}>
      {children}
    </PasscodeContext.Provider>
  );
};

export const usePasscode = () => {
  const context = useContext(PasscodeContext);
  if (!context) {
    throw new Error("usePasscode must be used within a PasscodeProvider");
  }
  return context;
};
