import { useAuthStore } from "./AuthContext";
import { useDashboardLayoutStore } from "./DashboardLayoutContext";
import { usePasscodeStore } from "./PasscodeContext";
import { useThemeStore } from "./ThemeContext";

/**
 * Rehydrate every persisted client-state store at cold start, then arm the
 * passcode launch lock once both auth and passcode are known. Runs once from
 * the root layout; the splash stays up until it resolves (each store flips its
 * own `isRestoring` to false). Replaces the rehydration effects that used to
 * live in the Theme/Auth/Passcode providers.
 */
export const bootstrapApp = async () => {
  await Promise.all([
    useThemeStore.getState().restore(),
    useAuthStore.getState().bootstrap(),
    usePasscodeStore.getState().restore(),
    useDashboardLayoutStore.getState().restore(),
  ]);
  usePasscodeStore.getState().arm();
};
