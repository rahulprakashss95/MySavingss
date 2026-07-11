import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const SESSION_STORAGE_KEY = "@homevault/session";

export type SessionUser = {
  username: string;
  /** Firestore `loginUsers` doc id. */
  id?: string;
  /** Display name, e.g. "Rahul Prakash". */
  name?: string;
  [key: string]: any;
};

type AuthContextValue = {
  user: SessionUser | null;
  /** True while the persisted session is being read back from storage. */
  isRestoring: boolean;
  signIn: (user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Rehydrate the session once on cold start. As long as this resolves to a
  // user, the app skips the login screen entirely.
  useEffect(() => {
    AsyncStorage.getItem(SESSION_STORAGE_KEY)
      .then((storedSession) => {
        if (!storedSession) {
          return;
        }
        const parsed = JSON.parse(storedSession);
        if (parsed && typeof parsed.username === "string") {
          setUser(parsed);
        }
      })
      .catch((error) => {
        console.log("Unable to restore session", error);
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const signIn = useCallback(async (nextUser: SessionUser) => {
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
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.log("Unable to clear session", error);
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isRestoring, signIn, signOut }),
    [user, isRestoring, signIn, signOut]
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
