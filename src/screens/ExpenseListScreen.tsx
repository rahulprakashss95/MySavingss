import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useTheme } from "../context/ThemeContext";
import { ExpenseModel } from "../models/ExpenseModel";
import { useCollectionState } from "../redux/hooks";
import { groupByMonth, sumAmount } from "../utils/ledger";
import { amountFormat } from "../utils/Utils";
import { useRouter } from "expo-router";

const ExpenseListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, ...list } = useCollectionState<ExpenseModel>("expenses");

  const sections = useMemo(() => groupByMonth(items), [items]);

  const navigateAddEdit = (data: ExpenseModel | null) => {
    router.push(data ? `/ledger/expenses/${data.id}` : "/ledger/expenses/new");
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      // The money matters more than the count, so each month's heading carries
      // its total instead.
      countLabel={(section) => `₹ ${amountFormat(sumAmount(section.data))}`}
      noun="expense"
      addLabel="Add expense"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="receipt-outline"
      emptyTitle="No expenses yet"
      emptyBody="Tap the + button to record what you spent."
      renderItem={(item, position) => (
        <GroupedRow
          icon="receipt-outline"
          accent={colors.accentAmber}
          title={item.typeName}
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

export default ExpenseListScreen;
