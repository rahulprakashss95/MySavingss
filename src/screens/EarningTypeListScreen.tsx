import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import GroupedRow from "../components/GroupedRow";
import { useTheme } from "../context/ThemeContext";
import { EarningTypeModel } from "../models/LedgerModel";
import { useCollectionState } from "../redux/hooks";
import { byText } from "../utils/grouping";
import { useRouter } from "expo-router";

const EarningTypeListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, ...list } =
    useCollectionState<EarningTypeModel>("earningTypes");

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

  const navigateAddEdit = (data: EarningTypeModel | null) => {
    router.push(
      data ? `/ledger/earning-types/${data.id}` : "/ledger/earning-types/new"
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
      emptyBody="Tap the + button to add your first earning type."
      renderItem={(item, position) => (
        <GroupedRow
          icon="pricetag-outline"
          accent={colors.accentBlue}
          value={item.name}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default EarningTypeListScreen;
