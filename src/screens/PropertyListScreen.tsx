import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import GroupedList from "../components/GroupedList";
import { useCollectionState, useOwnerName } from "../query/hooks";
import GroupedRow from "../components/GroupedRow";
import { useTheme } from "../context/ThemeContext";
import { PROPERTY_TYPES, PropertyModel } from "../models/AssetModel";
import { areaSummary, paymentTotals } from "../utils/assets";
import { ThemeColors } from "../utils/Color";
import { byFixedOrder, byText, groupBy, UNGROUPED } from "../utils/grouping";
import { amountFormat } from "../utils/Utils";
import { useRouter } from "expo-router";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, IconName> = {
  Home: "home-outline",
  Land: "map-outline",
  "Farm Land": "leaf-outline",
  Car: "car-outline",
  Bike: "bicycle-outline",
};

/** Area for land, nothing for vehicles â€” a car has no cents. */
const metaFor = (property: PropertyModel) => areaSummary(property.cents ?? "");

const PropertyListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { items, ...list } = useCollectionState<PropertyModel>("properties");
  const nameOf = useOwnerName();

  const sections = useMemo(
    () =>
      groupBy(
        [...items].sort(
          (a, b) =>
            byText(nameOf(a.ownerId), nameOf(b.ownerId)) ||
            byText(a.name, b.name)
        ),
        (property) => property.propertyType || UNGROUPED,
        (property) => property.propertyType || UNGROUPED
      ).sort(byFixedOrder(PROPERTY_TYPES)),
    [items, nameOf]
  );

  const navigateAddEdit = (data: PropertyModel | null) => {
    router.push(data ? `/assets/properties/${data.id}` : "/assets/properties/new");
  };

  /** The one number you want at a glance: what's still owed. */
  const renderTrailing = (property: PropertyModel) => {
    const totals = paymentTotals(property);
    if (property.paymentMode === "full" || totals.total <= 0) {
      return null;
    }
    const settled = totals.remaining <= 0;
    return (
      <View style={styles.trailing}>
        <Text style={[styles.trailingValue, settled && styles.settled]}>
          {settled ? "Settled" : `â‚¹ ${amountFormat(totals.remaining)}`}
        </Text>
        {!settled && <Text style={styles.trailingLabel}>left</Text>}
        {property.paymentMode === "installments" && totals.entryCount > 0 && (
          <Text style={styles.trailingLabel}>
            {totals.paidCount}/{totals.entryCount} paid
          </Text>
        )}
      </View>
    );
  };

  return (
    <GroupedList
      {...list}
      sections={sections}
      keyOf={(item) => item.id}
      noun="property"
      addLabel="Add property"
      onAdd={() => navigateAddEdit(null)}
      emptyIcon="home-outline"
      emptyTitle="No properties yet"
      emptyBody="Tap the + button to record the family's first property."
      renderItem={(item, position) => (
        <GroupedRow
          icon={ICONS[item.propertyType] ?? "home-outline"}
          accent={colors.accentBlue}
          title={item.propertyType}
          value={item.name}
          subtitle={nameOf(item.ownerId) || undefined}
          meta={metaFor(item) || undefined}
          description={item.description}
          trailing={renderTrailing(item)}
          onPress={() => navigateAddEdit(item)}
          position={position}
        />
      )}
    />
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    trailing: {
      alignItems: "flex-end",
      maxWidth: 120,
    },
    trailingValue: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    settled: {
      color: colors.positive,
    },
    trailingLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
  });

export default PropertyListScreen;
