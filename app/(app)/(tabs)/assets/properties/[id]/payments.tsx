import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../../src/context/ThemeContext";
import { PropertyModel } from "../../../../../../src/models/AssetModel";
import { useCollectionState } from "../../../../../../src/query/hooks";
import PropertyPaymentsScreen from "../../../../../../src/screens/PropertyPaymentsScreen";

/**
 * Payments belong to an existing property, so we resolve the full record from
 * the cache by id and hand it to the screen (which seeds its entries from it at
 * mount). Wait for the fetch on a cold deep link; if the id is unknown once
 * loaded, fall back to the property list.
 */
export default function PropertyPaymentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const properties = useCollectionState<PropertyModel>("properties");

  const property = properties.items.find((p) => p.id === id) ?? null;

  if (!property) {
    if (!properties.hasLoaded) {
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    return <Redirect href="/assets/properties" />;
  }

  return <PropertyPaymentsScreen property={property} />;
}
