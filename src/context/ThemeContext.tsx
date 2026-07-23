import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import { DarkColors, LightColors, ThemeColors } from "../utils/Color";

export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "@homevault/theme-mode";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

type ThemeStore = {
  /** What the user picked. "system" follows the OS setting. */
  mode: ThemeMode;
  /** True until the stored theme preference has been read from storage. */
  isRestoring: boolean;
  setMode: (mode: ThemeMode) => void;
  /** Rehydrate the persisted preference once at cold start. */
  restore: () => Promise<void>;
};

/**
 * Theme preference, persisted to AsyncStorage. Was a React context + provider;
 * now a Zustand store. Only the raw `mode` lives here — the resolved palette
 * depends on the live OS colour scheme, so it's computed in the `useTheme` hook
 * below, which keeps the old return shape (`mode`, `setMode`, `colors`,
 * `isDark`, `isRestoring`) so no call site changed.
 */
export const useThemeStore = create<ThemeStore>((set) => ({
  mode: "system",
  isRestoring: true,
  setMode: (nextMode) => {
    // Update immediately so the UI never waits on storage.
    set({ mode: nextMode });
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((error) => {
      console.log("Unable to persist theme preference", error);
    });
  },
  restore: async () => {
    try {
      // The splash is held until this resolves, so never let a wedged storage
      // read blank the screen forever — fall back to the default after 3s.
      const storedMode = await Promise.race([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      if (isThemeMode(storedMode)) {
        set({ mode: storedMode });
      }
    } catch (error) {
      console.log("Unable to restore theme preference", error);
    } finally {
      set({ isRestoring: false });
    }
  },
}));

type ThemeValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved palette for the currently active scheme. */
  colors: ThemeColors;
  isDark: boolean;
  isRestoring: boolean;
};

export const useTheme = (): ThemeValue => {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const isRestoring = useThemeStore((state) => state.isRestoring);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  return {
    mode,
    setMode,
    isDark,
    colors: isDark ? DarkColors : LightColors,
    isRestoring,
  };
};
