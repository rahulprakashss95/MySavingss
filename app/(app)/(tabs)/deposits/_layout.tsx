import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

export default function DepositsStack() {
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
        options={{ title: "Deposits", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen name="banks/index" options={{ title: "Banks" }} />
      <Stack.Screen name="banks/[id]" options={{ title: "Bank" }} />
      <Stack.Screen
        name="fixed-deposits/index"
        options={{ title: "Fixed Deposits" }}
      />
      <Stack.Screen
        name="fixed-deposits/[id]"
        options={{ title: "Fixed Deposit" }}
      />
      <Stack.Screen name="overview" options={{ title: "Overview" }} />
    </Stack>
  );
}
