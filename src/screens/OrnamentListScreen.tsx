import React, { useMemo } from "react";
import GroupedList from "../components/GroupedList";
import { useCollectionState, useOwnerName } from "../query/hooks";
import GroupedRow from "../components/GroupedRow";
import { useTheme } from "../context/ThemeContext";
import { ORNAMENT_TYPES, OrnamentModel } from "../models/AssetModel";
import { karatOf, weightSummary } from "../utils/assets";
import { ThemeColors } from "../utils/Color";
import { byFixedOrder, byText, groupBy, UNGROUPED } from "../utils/grouping";
import { useRouter } from "expo-router";

/** One hue per metal, so a section is recognisable before you read its heading. */
const accentFor = (ornamentType: string, colors: ThemeColors) => {
  switch (ornamentType) {
    case "Gold":
      return colors.accentAmber;
    case "Diamond":
      return colors.accentBlue;
    case "Platinum":
      return colors.accentViolet;
    default:
      return colors.textMuted;
  }
};

const pieceCount = (count: string) => {
  const parsed = Number(count) || 0;
  if (parsed <= 1) {
    return "";
  }
  return `${parsed} pieces`;
};

/** "22K Â· 3 pieces", or whichever half of that actually applies. */
const rowMeta = (ornament: OrnamentModel) =>
  [karatOf(ornament), pieceCount(ornament.count)].filter(Boolean).join(" Â· ");

const OrnamentListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { items, ...list } = useCollectionState<OrnamentModel>("ornaments");
  const nameOf = useOwnerName();

  // Grouped by metal in the order it's declared, then by owning member within a
  // group so one person's pieces stay together.
  const sections = useMemo(
    () =>
      groupBy(
        [...items].sort(
          (a, b) =>
            byText(nameOf(a.ownerId), nameOf(b.ownerId)) ||
            byText(a.name, b.name)
        ),
        (ornament) => ornament.ornamentType || UNGROUPED,
        (ornament) => ornament.ornamentType || UNGROUPED
      ).sort(byFixedOrder(ORNAMENT_TYPES)),
    [items, nameOf]
  );

  const navigateAddEdit = (data: OrnamentModel | null) => {
    router.push(data ? `/assets/ornaments/${data.id}` : "/assets/ornaments/new");
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      noun="ornament"
      addLabel="Add ornament"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="ribbon-outline"
      emptyTitle="No ornaments yet"
      emptyBody="Tap the + button to record the family's first piece."
      renderItem={(item, position) => (
        <GroupedRow
          icon="ribbon-outline"
          accent={accentFor(item.ornamentType, colors)}
          title={item.name}
          value={weightSummary(item.grams) || "â€”"}
          subtitle={nameOf(item.ownerId) || undefined}
          meta={rowMeta(item) || undefined}
          description={item.description}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

export default OrnamentListScreen;
