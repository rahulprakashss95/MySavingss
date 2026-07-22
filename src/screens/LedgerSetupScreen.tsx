import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import EarningTypeListScreen from "./EarningTypeListScreen";
import LedgerClientListScreen from "./LedgerClientListScreen";
import ExpenseTypeListScreen from "./ExpenseTypeListScreen";

const SEGMENTS = [
  { key: "earningTypes", label: "Earning Types" },
  { key: "clients", label: "Clients" },
  { key: "expenseTypes", label: "Expense Types" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

/**
 * The Ledger's reference-data home: one screen, a segmented switcher, and the
 * three managed lists behind it. Each segment renders an existing list screen
 * unchanged — they bring their own add button and routes — so this is only the
 * switcher plus the active list.
 */
const LedgerSetupScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [segment, setSegment] = useState<SegmentKey>("earningTypes");

  return (
    <View style={styles.container}>
      <View style={styles.segments}>
        {SEGMENTS.map((seg) => {
          const active = seg.key === segment;
          return (
            <Pressable
              key={seg.key}
              onPress={() => setSegment(seg.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
                numberOfLines={1}
              >
                {seg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Each list owns its own flex:1 container and FAB. */}
      <View style={styles.body}>
        {segment === "earningTypes" && <EarningTypeListScreen />}
        {segment === "clients" && <LedgerClientListScreen />}
        {segment === "expenseTypes" && <ExpenseTypeListScreen />}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    segments: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    segmentActive: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    segmentText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.primary,
    },
    body: {
      flex: 1,
    },
  });

export default LedgerSetupScreen;
