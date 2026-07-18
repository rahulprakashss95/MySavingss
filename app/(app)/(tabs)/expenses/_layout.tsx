import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

export default function ExpensesStack() {
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
        options={{ title: "Expenses", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen name="list/index" options={{ title: "Expenses" }} />
      <Stack.Screen name="list/[id]" options={{ title: "Expense" }} />
      <Stack.Screen name="types/index" options={{ title: "Expense Types" }} />
      <Stack.Screen name="types/[id]" options={{ title: "Expense Type" }} />
      <Stack.Screen name="overview" options={{ title: "Overview" }} />
    </Stack>
  );
}
