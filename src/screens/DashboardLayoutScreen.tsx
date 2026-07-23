import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import {
  DashboardSection,
  DEFAULT_DASHBOARD_ORDER,
  useDashboardLayoutStore,
} from "../context/DashboardLayoutContext";
import { useTheme } from "../context/ThemeContext";
import {
  canUseQuickAccess,
  MAX_QUICK_ACCESS,
  QUICK_ACCESS_ITEMS,
  QuickAccessItem,
  resolveQuickAccess,
} from "../models/quickAccess";
import { ThemeColors, tint } from "../utils/Color";

const SECTION_META: Record<
  DashboardSection,
  { label: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  attention: {
    label: "Needs attention",
    description: "Maturing deposits and payments coming due",
    icon: "alert-circle-outline",
  },
  month: {
    label: "This month",
    description: "Earnings, spending and the six-month trend",
    icon: "trending-up-outline",
  },
  worth: {
    label: "Total worth",
    description: "Cash, savings, gold and property",
    icon: "wallet-outline",
  },
  quick: {
    label: "Quick access",
    description: "The shortcuts you pick below",
    icon: "grid-outline",
  },
};

/**
 * Customises the Home dashboard: the order of its sections, and which shortcuts
 * the Quick access row holds. Up/down controls rather than drag-and-drop — the
 * arrows are quicker over a handful of rows, they work the same on web as on a
 * phone, and they stay operable by a screen reader, where a drag target would
 * need a gesture library and an accessible fallback anyway.
 *
 * The two halves treat access differently, deliberately. A section a member
 * can't see (no ledger tile, say) still appears in the order list, so the order
 * stays theirs if that access is granted later. A shortcut they can't open is
 * hidden from both shortcut lists instead — offering it would only produce a
 * chip that goes nowhere — but it is left untouched in storage, so it comes
 * back with the access rather than having been quietly deleted.
 */
const DashboardLayoutScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const order = useDashboardLayoutStore((state) => state.order);
  const move = useDashboardLayoutStore((state) => state.move);
  const reset = useDashboardLayoutStore((state) => state.reset);
  const quick = useDashboardLayoutStore((state) => state.quick);
  const setQuick = useDashboardLayoutStore((state) => state.setQuick);
  const resetQuick = useDashboardLayoutStore((state) => state.resetQuick);

  const isDefault =
    order.length === DEFAULT_DASHBOARD_ORDER.length &&
    order.every((key, index) => key === DEFAULT_DASHBOARD_ORDER[index]);

  // Both lists are filtered by access, so a shortcut is only ever offered if
  // tapping it would land somewhere the member can open.
  const chosen = useMemo(() => resolveQuickAccess(quick, user), [quick, user]);
  const available = useMemo(() => {
    const taken = new Set(chosen.map((item) => item.id));
    const groups: { group: string; items: QuickAccessItem[] }[] = [];
    QUICK_ACCESS_ITEMS.forEach((item) => {
      if (taken.has(item.id) || !canUseQuickAccess(user, item)) return;
      const bucket = groups.find((g) => g.group === item.group);
      if (bucket) bucket.items.push(item);
      else groups.push({ group: item.group, items: [item] });
    });
    return groups;
  }, [chosen, user]);

  const isFull = chosen.length >= MAX_QUICK_ACCESS;

  // Every edit is expressed as "the new visible list", which is what the store
  // wants — see `setQuick`. `chosen` is already in display order, so these are
  // plain array operations on its ids.
  const chosenIds = chosen.map((item) => item.id);
  const addQuick = (id: string) => setQuick([...chosenIds, id]);
  const removeQuick = (id: string) =>
    setQuick(chosenIds.filter((key) => key !== id));
  const moveQuick = (index: number, direction: -1 | 1) => {
    const next = [...chosenIds];
    const to = index + direction;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setQuick(next);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.heading}>Sections</Text>
      <Text style={styles.intro}>
        Move the sections into the order you want to read them on Home.
      </Text>

      <Card customStyle={styles.card}>
        {order.map((key, index) => {
          const meta = SECTION_META[key];
          const isFirst = index === 0;
          const isLast = index === order.length - 1;

          return (
            <View
              key={key}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <Ionicons name={meta.icon} size={22} color={colors.textMuted} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{meta.label}</Text>
                <Text style={styles.rowDescription}>{meta.description}</Text>
              </View>

              <View style={styles.moveGroup}>
                <Pressable
                  onPress={() => move(key, -1)}
                  disabled={isFirst}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${meta.label} up`}
                  accessibilityState={{ disabled: isFirst }}
                  // Arrows are small; a hit slop keeps them thumb-sized.
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && !isFirst && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={isFirst ? colors.border : colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => move(key, 1)}
                  disabled={isLast}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${meta.label} down`}
                  accessibilityState={{ disabled: isLast }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && !isLast && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={isLast ? colors.border : colors.text}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </Card>

      <Pressable
        onPress={reset}
        disabled={isDefault}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDefault }}
        style={({ pressed }) => [
          styles.reset,
          pressed && !isDefault && styles.rowPressed,
        ]}
      >
        <Text
          style={[styles.resetText, isDefault && styles.resetTextDisabled]}
        >
          Reset to default order
        </Text>
      </Pressable>

      <Text style={styles.heading}>Quick access</Text>
      <Text style={styles.intro}>
        The shortcuts on Home. Pick the ones you use — adding an earning or an
        expense straight from the dashboard, or jumping to a list.
      </Text>

      <Card customStyle={styles.card}>
        {chosen.length === 0 && (
          <Text style={styles.empty}>
            No shortcuts yet. Add some from the list below.
          </Text>
        )}
        {chosen.map((item, index) => {
          const accent = colors[item.accent] as string;
          const isFirst = index === 0;
          const isLast = index === chosen.length - 1;

          return (
            <View
              key={item.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <View style={[styles.chipIcon, { backgroundColor: tint(accent) }]}>
                <Ionicons name={item.icon} size={18} color={accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDescription}>{item.group}</Text>
              </View>

              <View style={styles.moveGroup}>
                <Pressable
                  onPress={() => moveQuick(index, -1)}
                  disabled={isFirst}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.label} up`}
                  accessibilityState={{ disabled: isFirst }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && !isFirst && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={isFirst ? colors.border : colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => moveQuick(index, 1)}
                  disabled={isLast}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.label} down`}
                  accessibilityState={{ disabled: isLast }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && !isLast && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={isLast ? colors.border : colors.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => removeQuick(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.label}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.moveButton,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={20}
                    color={colors.negative}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </Card>

      {isFull && (
        <Text style={styles.note}>
          That&rsquo;s the maximum of {MAX_QUICK_ACCESS}. Remove one to add
          another.
        </Text>
      )}

      {available.map(({ group, items }) => (
        <View key={group}>
          <Text style={styles.groupHeading}>{group}</Text>
          <Card customStyle={styles.card}>
            {items.map((item, index) => {
              const accent = colors[item.accent] as string;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => addQuick(item.id)}
                  disabled={isFull}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.label} to Quick access`}
                  accessibilityState={{ disabled: isFull }}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.rowDivider,
                    pressed && !isFull && styles.rowPressed,
                    isFull && styles.rowDisabled,
                  ]}
                >
                  <View
                    style={[styles.chipIcon, { backgroundColor: tint(accent) }]}
                  >
                    <Ionicons name={item.icon} size={18} color={accent} />
                  </View>
                  <Text style={[styles.rowLabel, styles.rowText]}>
                    {item.label}
                  </Text>
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={isFull ? colors.border : colors.primary}
                  />
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}

      <Pressable
        onPress={resetQuick}
        disabled={quick === null}
        accessibilityRole="button"
        accessibilityState={{ disabled: quick === null }}
        style={({ pressed }) => [
          styles.reset,
          pressed && quick !== null && styles.rowPressed,
        ]}
      >
        <Text
          style={[styles.resetText, quick === null && styles.resetTextDisabled]}
        >
          Reset to default shortcuts
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingVertical: 12,
    },
    heading: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginHorizontal: 32,
      marginTop: 20,
    },
    groupHeading: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginHorizontal: 32,
      marginTop: 16,
    },
    intro: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      marginHorizontal: 32,
      marginTop: 8,
    },
    note: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginHorizontal: 32,
    },
    empty: {
      fontSize: 14,
      color: colors.textMuted,
      paddingVertical: 18,
      paddingHorizontal: 16,
      textAlign: "center",
    },
    chipIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    rowDisabled: {
      opacity: 0.45,
    },
    card: {
      paddingVertical: 4,
      paddingHorizontal: 0,
      marginVertical: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    rowDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    moveGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    moveButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputBackground,
    },
    reset: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 4,
    },
    resetText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.primary,
    },
    resetTextDisabled: {
      color: colors.textMuted,
    },
  });

export default DashboardLayoutScreen;
