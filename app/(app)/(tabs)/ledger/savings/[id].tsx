import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { SavingModel } from "../../../../../src/models/LedgerModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import SavingAddEditScreen from "../../../../../src/screens/SavingAddEditScreen";

/**
 * Resolves the saving from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function SavingAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const savings = useCollectionState<SavingModel>("savings");

  const isNew = id === "new";
  const saving = isNew ? null : savings.items.find((s) => s.id === id) ?? null;

  if (!isNew && !saving && !savings.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <SavingAddEditScreen initial={saving} />;
}
