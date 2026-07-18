import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import { useCollectionState } from "../redux/hooks";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { SavingModel } from "../models/LedgerModel";
import { groupByMonth, sumAmount } from "../utils/ledger";
import { amountFormat } from "../utils/Utils";
import { useRouter } from "expo-router";

const SavingListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollectionState<SavingModel>("savings");

  const sections = useMemo(() => groupByMonth(items), [items]);

  const navigateAddEdit = (data: SavingModel | null) => {
    router.push(data ? `/ledger/savings/${data.id}` : "/ledger/savings/new");
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
