import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { GovernmentDocumentModel } from "../../../../../src/models/DocumentModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import GovernmentDocumentAddEditScreen from "../../../../../src/screens/GovernmentDocumentAddEditScreen";

/**
 * Resolves the document from the cache before mounting the form â€” the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function GovernmentDocumentAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const documents =
    useCollectionState<GovernmentDocumentModel>("governmentDocuments");

  const isNew = id === "new";
  const document = isNew
    ? null
    : documents.items.find((d) => d.id === id) ?? null;

  if (!isNew && !document && !documents.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <GovernmentDocumentAddEditScreen initial={document} />;
}
