import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { OrnamentModel } from "../../../../../src/models/AssetModel";
import { useCollectionState } from "../../../../../src/redux/hooks";
import OrnamentAddEditScreen from "../../../../../src/screens/OrnamentAddEditScreen";

/**
 * Resolves the ornament from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function OrnamentAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const ornaments = useCollectionState<OrnamentModel>("ornaments");

  const isNew = id === "new";
  const ornament = isNew
    ? null
    : ornaments.items.find((o) => o.id === id) ?? null;

  if (!isNew && !ornament && !ornaments.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <OrnamentAddEditScreen initial={ornament} />;
}
