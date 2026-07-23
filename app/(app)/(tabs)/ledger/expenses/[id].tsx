import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { ExpenseModel } from "../../../../../src/models/ExpenseModel";
import { useCollectionState } from "../../../../../src/query/hooks";
import ExpenseAddEditScreen from "../../../../../src/screens/ExpenseAddEditScreen";

/**
 * Resolves the expense from the cache before mounting the form â€” the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function ExpenseAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const expenses = useCollectionState<ExpenseModel>("expenses");

  const isNew = id === "new";
  const expense = isNew
    ? null
    : expenses.items.find((e) => e.id === id) ?? null;

  if (!isNew && !expense && !expenses.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <ExpenseAddEditScreen initial={expense} />;
}
