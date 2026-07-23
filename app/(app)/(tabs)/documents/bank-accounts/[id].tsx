import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { BankDocumentModel } from "../../../../../src/models/DocumentModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import BankDocumentAddEditScreen from "../../../../../src/screens/BankDocumentAddEditScreen";

/**
 * Resolves the account from the cache before mounting the form â€” the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function BankDocumentAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const documents = useCollectionState<BankDocumentModel>("bankDocuments");

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

  return <BankDocumentAddEditScreen initial={document} />;
}
