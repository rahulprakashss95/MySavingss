import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

/** Keeps `index` under deep links from other tabs — see the Settings stack. */
export const unstable_settings = { anchor: "index" };

export default function DocumentsStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Documents", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen name="government/index" options={{ title: "Government" }} />
      <Stack.Screen name="government/[id]" options={{ title: "Document" }} />
      <Stack.Screen
        name="bank-accounts/index"
        options={{ title: "Bank Accounts" }}
      />
      <Stack.Screen
        name="bank-accounts/[id]"
        options={{ title: "Bank Account" }}
      />
    </Stack>
  );
}
