import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import { useCollectionState } from "../query/hooks";
import GroupedRow from "../components/GroupedRow";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { EarningModel } from "../models/LedgerModel";
import { groupByMonth, sumAmount } from "../utils/ledger";
import { amountFormat } from "../utils/Utils";
import { useRouter } from "expo-router";

const EarningListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items, ...list } = useCollectionState<EarningModel>("earnings");

  const sections = useMemo(() => groupByMonth(items), [items]);

  const navigateAddEdit = (data: EarningModel | null) => {
    router.push(data ? `/ledger/earnings/${data.id}` : "/ledger/earnings/new");
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      // The count of entries matters less than the money, so each month's
      // heading carries its total instead.
      countLabel={(section) => `₹ ${amountFormat(sumAmount(section.data))}`}
      noun="earning"
      addLabel="Add earning"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="trending-up-outline"
      emptyTitle="No earnings yet"
      emptyBody="Tap the + button to record what you were paid."
      renderItem={(item, position) => (
        <GroupedRow
          icon="trending-up-outline"
          accent={colors.accentBlue}
          title={item.type}
          value={`₹ ${amountFormat(item.amount)}`}
          subtitle={item.clientName}
          meta={item.date || undefined}
          description={item.comments}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default EarningListScreen;
