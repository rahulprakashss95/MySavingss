import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../../src/context/ThemeContext";
import { PropertyModel } from "../../../../../../src/models/AssetModel";
import { useCollectionState } from "../../../../../../src/query/hooks";
import PropertyAddEditScreen from "../../../../../../src/screens/PropertyAddEditScreen";

/**
 * Resolves the property from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function PropertyAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const properties = useCollectionState<PropertyModel>("properties");

  const isNew = id === "new";
  const property = isNew
    ? null
    : properties.items.find((p) => p.id === id) ?? null;

  if (!isNew && !property && !properties.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <PropertyAddEditScreen initial={property} />;
}
