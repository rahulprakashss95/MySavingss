import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "../src/query/client";
import { bootstrapApp } from "../src/context/bootstrap";
import { useAuth } from "../src/context/AuthContext";
import { usePasscode } from "../src/context/PasscodeContext";
import { useTheme } from "../src/context/ThemeContext";
import { DarkColors, LightColors } from "../src/utils/Color";
import SideDrawer from "../src/components/SideDrawer";
import PasscodeLockScreen from "../src/components/PasscodeLockScreen";
import { installWebStyles } from "../src/utils/webStyles";

// Remove the browser's default focus outline from web inputs, app-wide.
installWebStyles();

// Keep the native splash up until the persisted theme + session are restored,
// so the app can mount the navigator immediately (Expo Router requires the root
// layout to always render one) without flashing the wrong theme or a login
// redirect. `index` returns null while restoring, so nothing paints under it.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Expo Router root layout. Client state lives in Zustand stores and server data
 * in React Query — the only wrapper left is `QueryClientProvider`; the former
 * Theme/Auth/Passcode/Drawer providers are gone. `bootstrapApp` rehydrates the
 * persisted stores once on mount. Tabs own module navigation; the `SideDrawer`
 * (opened from the header hamburger) is a secondary way to jump to any
 * sub-screen, Settings and Admin.
 */
export default function RootLayout() {
  return (
    // GestureHandlerRootView must wrap the app for react-native-gesture-handler
    // (used by React Navigation's gestures) to work on Android — without it,
    // swipe/press gestures silently no-op there.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { user, isRestoring: authRestoring } = useAuth();
  const { colors, isDark, isRestoring: themeRestoring } = useTheme();
  const {
    isEnabled: passcodeEnabled,
    isLocked,
    isRestoring: passcodeRestoring,
  } = usePasscode();

  // Rehydrate all persisted stores exactly once on cold start.
  useEffect(() => {
    bootstrapApp();
  }, []);

  // On web, paint html/body to match the active theme. The static CSS in
  // index.html only follows the OS scheme; this also covers a manual override
  // (e.g. forcing light while the OS is dark), so no white/black bleeds past the
  // app root in the installed PWA. Formerly lived in the ThemeProvider.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const background = (isDark ? DarkColors : LightColors).background;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
  }, [isDark]);

  // Once the session, theme and passcode state are known, drop the splash. The
  // navigator below stays mounted throughout — `index` holds on a blank frame
  // until auth resolves, so no route flickers and there's no unmounted-navigator
  // crash. Waiting on the passcode too means the lock is decided before the
  // splash lifts, so signed-in content never flashes behind it.
  const ready = !authRestoring && !themeRestoring && !passcodeRestoring;

  // Gate the whole app at launch, but only for a signed-in user — a logged-out
  // launch falls through to the login screen with no passcode.
  const showLock = !!user && passcodeEnabled && isLocked;
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      {/* Overlays the whole app (absolute-fill); mounts only while open. */}
      <SideDrawer />
      <Toast />
      {/* Launch lock: covers everything above until the passcode is entered. */}
      {showLock && <PasscodeLockScreen />}
    </View>
  );
}
