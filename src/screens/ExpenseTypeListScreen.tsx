import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useTheme } from "../context/ThemeContext";
import { ExpenseTypeModel } from "../models/ExpenseModel";
import { useCollectionState } from "../query/hooks";
import { byText } from "../utils/grouping";
import { useRouter } from "expo-router";

const ExpenseTypeListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, ...list } =
    useCollectionState<ExpenseTypeModel>("expenseTypes");

  // Usually a short, personal list, so a flat alphabetical list reads cleaner
  // than headings. Stay empty when there are none so the empty state shows (a
  // SectionList only renders ListEmptyComponent when there are zero sections).
  const sections = useMemo(
    () =>
      items.length
        ? [
            {
              key: "all",
              title: "",
              data: [...items].sort((a, b) => byText(a.name, b.name)),
            },
          ]
        : [],
    [items]
  );

  const navigateAddEdit = (data: ExpenseTypeModel | null) => {
    router.push(
      data ? `/ledger/expense-types/${data.id}` : "/ledger/expense-types/new"
    );
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      hideSectionHeaders
      keyOf={(item) => item.id}
      noun="type"
      addLabel="Add type"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="pricetags-outline"
      emptyTitle="No types yet"
      emptyBody="Tap the + button to add your first expense category."
      renderItem={(item, position) => (
        <GroupedRow
          icon="pricetag-outline"
          accent={colors.accentViolet}
          value={item.name}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default ExpenseTypeListScreen;
