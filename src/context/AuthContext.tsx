import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
  clearActiveScope,
  hasActiveSession,
  setActiveScope,
  signOut as endDatabaseSession,
} from "../../database/query";
import { store } from "../redux/store";
import { resetAll } from "../redux/resetAll";
import type { Avatar, FeatureKey } from "../models/common";
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
  /** Leaf feature keys the member holds (see the access model in `common.ts`). */
  moduleAccess: FeatureKey[];
  /** The member's profile picture, if set. Absent shows initials. */
  avatar?: Avatar;
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
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setIsRestoring(false);
      }
    };
    // Never let a wedged storage read hang the app on the loading screen — after
    // a short grace period, continue as signed-out (the user can still log in).
    const timeout = setTimeout(() => {
      console.warn("Session restore timed out; continuing without a stored session.");
      finish();
    }, 3000);

    AsyncStorage.getItem(SESSION_STORAGE_KEY)
      .then(async (storedSession) => {
        if (!storedSession) {
          return;
        }
        const parsed = JSON.parse(storedSession);
        // A stored login is only good if the database session behind it is
        // still alive — otherwise the app would look signed in while every
        // read came back empty.
        if (isCompleteSession(parsed) && (await hasActiveSession())) {
          setActiveScope({ familyId: parsed.familyId, userId: parsed.id });
          setUser(parsed);
        } else {
          AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => {});
        }
      })
      .catch((error) => {
        console.log("Unable to restore session", error);
      })
      .finally(() => {
        clearTimeout(timeout);
        finish();
      });
  }, []);

  const signIn = useCallback(async (nextUser: SessionUser) => {
    // Publish the data scope before flipping state, so the first screen's reads
    // are already family-scoped.
    setActiveScope({ familyId: nextUser.familyId, userId: nextUser.id });
    // Start from an empty cache in case a different family is being entered.
    store.dispatch(resetAll());
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
    // Drop every cached collection so one session's data can't leak into the next.
    store.dispatch(resetAll());
    try {
      // Ends the database session too. Without this the tokens would outlive
      // the logout in storage, and the next user on this device would start
      // with the previous one's read access.
      await endDatabaseSession();
    } catch (error) {
      console.log("Unable to end the database session", error);
    }
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
