import React, { useMemo } from "react";
import { getSavings } from "../../database/firebaseQuery";
import GroupedList, { useCollection } from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { SavingModel } from "../models/LedgerModel";
import { groupByMonth, sumAmount } from "../utils/ledger";
import { amountFormat, NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const SavingListScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollection<SavingModel>(
    () => getSavings(user?.id ?? ""),
    navigation,
    "Unable to load savings"
  );

  const sections = useMemo(() => groupByMonth(items), [items]);

  const navigateAddEdit = (data: SavingModel | null) => {
    navigation.navigate("SavingAddEdit", { savingData: data });
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      countLabel={(section) => `₹ ${amountFormat(sumAmount(section.data))}`}
      noun="saving"
      addLabel="Add saving"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="wallet-outline"
      emptyTitle="No savings yet"
      emptyBody="Tap the + button to record what you set aside."
      renderItem={(item, position) => (
        <GroupedRow
          icon="wallet-outline"
          accent={colors.accentAmber}
          title={item.clientName || "Saving"}
          value={`₹ ${amountFormat(item.amount)}`}
          meta={item.date || undefined}
          description={item.comments}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default SavingListScreen;
