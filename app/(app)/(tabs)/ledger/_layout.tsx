import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

export default function LedgerStack() {
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
        options={{ title: "Ledger", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen name="earnings/index" options={{ title: "Earnings" }} />
      <Stack.Screen name="earnings/[id]" options={{ title: "Earning" }} />
      <Stack.Screen name="savings/index" options={{ title: "Savings" }} />
      <Stack.Screen name="savings/[id]" options={{ title: "Saving" }} />
      <Stack.Screen name="clients/index" options={{ title: "Clients" }} />
      <Stack.Screen name="clients/[id]" options={{ title: "Client" }} />
      <Stack.Screen name="overview" options={{ title: "Overview" }} />
    </Stack>
  );
}
