import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { VehicleModel } from "../../../../../src/models/AssetModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import VehicleAddEditScreen from "../../../../../src/screens/VehicleAddEditScreen";

/**
 * Resolves the vehicle from the cache before mounting the form â€” the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function VehicleAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const vehicles = useCollectionState<VehicleModel>("vehicles");

  const isNew = id === "new";
  const vehicle = isNew
    ? null
    : vehicles.items.find((v) => v.id === id) ?? null;

  if (!isNew && !vehicle && !vehicles.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <VehicleAddEditScreen initial={vehicle} />;
}
