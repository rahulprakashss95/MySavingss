import { Stack } from "expo-router";
import MenuButton from "../../../../src/components/MenuButton";
import ProfileButton from "../../../../src/components/ProfileButton";
import { useTheme } from "../../../../src/context/ThemeContext";

export default function AssetsStack() {
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
        options={{ title: "Assets", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen name="ornaments/index" options={{ title: "Ornaments" }} />
      <Stack.Screen name="ornaments/[id]" options={{ title: "Ornament" }} />
      <Stack.Screen name="properties/index" options={{ title: "Properties" }} />
      <Stack.Screen
        name="properties/[id]/index"
        options={{ title: "Property" }}
      />
      <Stack.Screen
        name="properties/[id]/payments"
        options={{ title: "Payments" }}
      />
      <Stack.Screen name="overview" options={{ title: "Overview" }} />
    </Stack>
  );
}
