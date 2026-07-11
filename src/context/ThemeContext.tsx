import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useColorScheme } from "react-native";
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
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (isThemeMode(storedMode)) {
          setModeState(storedMode);
        }
      })
      .catch((error) => {
        console.log("Unable to restore theme preference", error);
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    // Update immediately so the UI never waits on storage.
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((error) => {
      console.log("Unable to persist theme preference", error);
    });
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

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
