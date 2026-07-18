import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../../../../../src/context/ThemeContext";
import { FixedDepositModel } from "../../../../../src/models/FixedDepositModel";
import { useCollectionState } from "../../../../../src/redux/hooks";
import FixedDepositAddEditScreen from "../../../../../src/screens/FixedDepositAddEditScreen";

/**
 * Resolves the deposit from the cache before mounting the form — the form seeds
 * its fields from `initial` at mount, so on a cold deep link we wait for the
 * fetch rather than seeding an empty form. `new` = create.
 */
export default function FixedDepositAddEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const deposits = useCollectionState<FixedDepositModel>("fixedDeposits");

  const isNew = id === "new";
  const deposit = isNew ? null : deposits.items.find((d) => d.id === id) ?? null;

  if (!isNew && !deposit && !deposits.hasLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <FixedDepositAddEditScreen initial={deposit} />;
}
