import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Platform, useColorScheme } from "react-native";
import { DarkColors, LightColors, ThemeColors } from "../utils/Color";

export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "@homevault/theme-mode";

type ThemeContextValue = {
  /** What the user picked. "system" follows the OS setting. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved palette for the currently active scheme. */
  colors: ThemeColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

type Props = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: Props) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setIsRestoring(false);
      }
    };
    // The whole app is held back until this resolves (see the null return
    // below), so never let a wedged storage read blank the screen forever.
    const timeout = setTimeout(() => {
      console.warn("Theme restore timed out; using the default theme.");
      finish();
    }, 3000);

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (isThemeMode(storedMode)) {
          setModeState(storedMode);
        }
      })
      .catch((error) => {
        console.log("Unable to restore theme preference", error);
      })
      .finally(() => {
        clearTimeout(timeout);
        finish();
      });
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    // Update immediately so the UI never waits on storage.
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((error) => {
      console.log("Unable to persist theme preference", error);
    });
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  // On web, paint html/body to match the active theme. The static CSS in
  // index.html only follows the OS scheme; this also covers a manual override
  // (e.g. forcing light while the OS is dark), so no white/black bleeds past
  // the app root in the installed PWA.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const background = (isDark ? DarkColors : LightColors).background;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      colors: isDark ? DarkColors : LightColors,
      isDark,
    }),
    [mode, setMode, isDark]
  );

  // Hold rendering until the stored preference is known, otherwise the app
  // paints in light mode for a frame before flipping to dark.
  if (isRestoring) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
