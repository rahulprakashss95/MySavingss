import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { EarningModel } from "../../../../../src/models/LedgerModel";
import { useCollectionState } from "../../../../../src/redux/hooks";
import EarningAddEditScreen from "../../../../../src/screens/EarningAddEditScreen";

/**
 * Resolves the earning from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function EarningAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const earnings = useCollectionState<EarningModel>("earnings");

  const isNew = id === "new";
  const earning = isNew
    ? null
    : earnings.items.find((e) => e.id === id) ?? null;

  if (!isNew && !earning && !earnings.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <EarningAddEditScreen initial={earning} />;
}
