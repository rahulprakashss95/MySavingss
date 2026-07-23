import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

/** Keeps `index` under deep links from other tabs — see the Settings stack. */
export const unstable_settings = { anchor: "index" };

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
      <Stack.Screen name="setup/index" options={{ title: "Setup" }} />
      <Stack.Screen name="clients/index" options={{ title: "Clients" }} />
      <Stack.Screen name="clients/[id]" options={{ title: "Client" }} />
      <Stack.Screen
        name="earning-types/[id]"
        options={{ title: "Earning Type" }}
      />
      <Stack.Screen name="expenses/index" options={{ title: "Expenses" }} />
      <Stack.Screen name="expenses/[id]" options={{ title: "Expense" }} />
      <Stack.Screen
        name="expense-types/index"
        options={{ title: "Expense Types" }}
      />
      <Stack.Screen
        name="expense-types/[id]"
        options={{ title: "Expense Type" }}
      />
      <Stack.Screen name="overview" options={{ title: "Overview" }} />
    </Stack>
  );
}
