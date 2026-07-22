import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

/**
 * Signed-in area. The tab group lives here as a headerless entry; Profile,
 * Settings and Admin are pushed over it with their own headers.
 */
export default function AppLayout() {
  const { user, isRestoring } = useAuth();
  const { colors } = useTheme();

  // On a cold deep link straight into the signed-in area, wait for the session
  // to restore before deciding — otherwise we bounce to /login and back.
  if (isRestoring) {
    return null;
  }
  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="admin" options={{ title: "Family Admin" }} />
    </Stack>
  );
}
