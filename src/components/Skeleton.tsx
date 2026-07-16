import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { currentOS } from "../utils/Utils";

type ISkeleton = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
};

/** Shared pulse so every placeholder on a screen breathes in step. */
const usePulse = () => {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          // react-native-web's Animated has no native driver.
          useNativeDriver: currentOS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: currentOS !== "web",
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return pulse;
};

export const Skeleton = ({ width, height = 14, radius = 6, style }: ISkeleton) => {
  const { colors } = useTheme();
  const pulse = usePulse();

  return (
    <Animated.View
      // Decorative only — screen readers should skip it and hear the busy state.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: (width as any) ?? "100%",
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

/** Mirrors the shape of an FDCard so the layout doesn't jump on load. */
export const DepositListSkeleton = ({ count = 3 }: { count?: number }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="Loading deposits">
      <View style={styles.summaryRow}>
        <Skeleton width={110} height={12} />
        <Skeleton width={90} height={16} />
      </View>

      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.rowBetween}>
            <Skeleton width={90} height={18} />
            <Skeleton width={110} height={22} radius={999} />
          </View>
          <Skeleton width={140} height={12} style={styles.mt8} />
          <Skeleton width={170} height={26} style={styles.mt14} />
          <Skeleton width={120} height={14} style={styles.mt6} />
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <View>
              <Skeleton width={70} height={11} />
              <Skeleton width={95} height={14} style={styles.mt6} />
            </View>
            <View style={styles.alignEnd}>
              <Skeleton width={60} height={11} />
              <Skeleton width={95} height={14} style={styles.mt6} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

/** Mirrors a bank row: initials avatar, name, contact line. */
export const BankListSkeleton = ({ count = 6 }: { count?: number }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="Loading banks">
      <View style={styles.summaryRow}>
        <Skeleton width={90} height={12} />
      </View>

      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.clientCard}>
          <View style={styles.clientRow}>
            <Skeleton width={46} height={46} radius={23} />
            <View style={styles.clientDetails}>
              <Skeleton width={120} height={16} />
              <Skeleton width={150} height={12} style={styles.mt8} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

/** Mirrors a grouped list: a section heading over a card of rows. */
export const GroupedListSkeleton = ({ groups = 2 }: { groups?: number }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityLabel="Loading documents">
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <View key={groupIndex}>
          <View style={styles.documentHeader}>
            <Skeleton width={110} height={12} />
            <Skeleton width={70} height={12} />
          </View>

          <View style={styles.documentGroup}>
            {[0, 1].map((rowIndex) => (
              <View key={rowIndex} style={styles.documentRow}>
                <Skeleton width={34} height={34} radius={11} />
                <View style={styles.clientDetails}>
                  <Skeleton width={80} height={11} />
                  <Skeleton width={160} height={18} style={styles.mt6} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

/** Hero figure, KPI row and two bar cards, matching OverviewScreen. */
export const OverviewSkeleton = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.overviewContainer} accessibilityLabel="Loading overview">
      <View style={styles.heroCard}>
        <Skeleton width={120} height={12} />
        <Skeleton width={220} height={40} radius={8} style={styles.mt10} />
        <Skeleton width={170} height={12} style={styles.mt8} />
      </View>

      <View style={styles.statRow}>
        {[0, 1].map((index) => (
          <View key={index} style={[styles.plainCard, styles.statCard]}>
            <Skeleton width={90} height={12} />
            <Skeleton width={110} height={20} style={styles.mt8} />
          </View>
        ))}
      </View>

      {[0, 1].map((cardIndex) => (
        <View key={cardIndex} style={styles.plainCard}>
          <Skeleton width={150} height={16} />
          <Skeleton width={80} height={12} style={styles.mt6} />
          <View style={styles.mt16}>
            {[0, 1, 2, 3].map((barIndex) => (
              <View key={barIndex} style={styles.barRow}>
                <View style={styles.rowBetween}>
                  <Skeleton width={70} height={12} />
                  <Skeleton width={80} height={12} />
                </View>
                <Skeleton height={8} radius={4} style={styles.mt6} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 14,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 14,
    },
    clientCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      // Matches BankScreen's card spacing, not the deposit list's.
      marginBottom: 12,
    },
    clientRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    documentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginBottom: 10,
    },
    documentGroup: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 26,
    },
    documentRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    clientDetails: {
      flex: 1,
      marginLeft: 14,
    },
    overviewContainer: {
      padding: 20,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 14,
    },
    plainCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statCard: {
      width: "48%",
    },
    barRow: {
      marginBottom: 14,
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    alignEnd: {
      alignItems: "flex-end",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    mt6: { marginTop: 6 },
    mt8: { marginTop: 8 },
    mt10: { marginTop: 10 },
    mt14: { marginTop: 14 },
    mt16: { marginTop: 16 },
  });

export default Skeleton;
