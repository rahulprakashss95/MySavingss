import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { AccountModel } from "../../../../../src/models/AccountModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import AccountAddEditScreen from "../../../../../src/screens/AccountAddEditScreen";

/**
 * Resolves the account from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function AccountAddEditRoute() {
  // `type` is set when the + was tapped on a specific list tab, so the new
  // record opens with that account type preselected.
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const { colors } = useTheme();
  const accounts = useCollectionState<AccountModel>("accounts");

  const isNew = id === "new";
  const account = isNew ? null : accounts.items.find((a) => a.id === id) ?? null;

  const title = isNew ? "Add Holding" : "Edit Holding";

  if (!isNew && !account && !accounts.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <AccountAddEditScreen initial={account} presetType={type} />
    </>
  );
}
