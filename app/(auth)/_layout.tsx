import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

/** Signed-out routes. A signed-in user has no business here — bounce to tabs. */
export default function AuthLayout() {
  const { user } = useAuth();
  const { colors } = useTheme();

  if (user) {
    return <Redirect href="/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
