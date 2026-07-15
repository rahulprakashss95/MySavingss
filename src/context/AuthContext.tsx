import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { clearActiveScope, setActiveScope } from "../../database/firebaseQuery";
import type { ModuleKey } from "../models/common";
import type { UserRole } from "../models/LoginUserModel";

const SESSION_STORAGE_KEY = "@homevault/session";

export type SessionUser = {
  /** `loginUsers` doc id. */
  id: string;
  username: string;
  /** Display name, e.g. "Rahul Prakash". */
  name?: string;
  /** `families` doc id — scopes every read/write. */
  familyId: string;
  /** Display name of the family, for the home welcome header. */
  familyName: string;
  /** Editable family handle. */
  familyCode: string;
  role: UserRole;
  moduleAccess: ModuleKey[];
};

type AuthContextValue = {
  user: SessionUser | null;
  /** True while the persisted session is being read back from storage. */
  isRestoring: boolean;
  signIn: (user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
  /** Patch the in-memory + persisted session (e.g. after editing the family). */
  updateSession: (patch: Partial<SessionUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

/** A session is only usable if it can scope data — needs both ids. */
const isCompleteSession = (value: any): value is SessionUser =>
  value &&
  typeof value.id === "string" &&
  typeof value.familyId === "string" &&
  typeof value.username === "string";

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Rehydrate the session once on cold start. As long as this resolves to a
  // complete user, the app skips the login screen entirely. Sessions from
  // before the multi-family model (no familyId) are discarded so a stale login
  // can't run without a family scope.
  useEffect(() => {
    AsyncStorage.getItem(SESSION_STORAGE_KEY)
      .then((storedSession) => {
        if (!storedSession) {
          return;
        }
        const parsed = JSON.parse(storedSession);
        if (isCompleteSession(parsed)) {
          setActiveScope({ familyId: parsed.familyId, userId: parsed.id });
          setUser(parsed);
        } else {
          AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => {});
        }
      })
      .catch((error) => {
        console.log("Unable to restore session", error);
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const signIn = useCallback(async (nextUser: SessionUser) => {
    // Publish the data scope before flipping state, so the first screen's reads
    // are already family-scoped.
    setActiveScope({ familyId: nextUser.familyId, userId: nextUser.id });
    // Persist before flipping state so a crash mid-write can't leave the app
    // showing a logged-in UI that won't survive a restart.
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
    } catch (error) {
      console.log("Unable to persist session", error);
    }
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    clearActiveScope();
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.log("Unable to clear session", error);
    }
    setUser(null);
  }, []);

  const updateSession = useCallback(async (patch: Partial<SessionUser>) => {
    setUser((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, ...patch };
      AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next)).catch(
        (error) => console.log("Unable to persist session", error)
      );
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isRestoring, signIn, signOut, updateSession }),
    [user, isRestoring, signIn, signOut, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
