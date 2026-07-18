import React, { useMemo } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BarList from "../components/BarList";
import { OverviewSkeleton } from "../components/Skeleton";
import { useCollectionState } from "../redux/hooks";
import { BankModel } from "../models/BankModel";
import { FixedDepositModel } from "../models/FixedDepositModel";
import { amountFormat } from "../utils/Utils";
import {
  buildTotals,
  mergeBankNames,
} from "../utils/deposits";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";

const rupees = (value: number) => `₹ ${amountFormat(value)}`;

const OverviewScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Same cached collections the deposits list uses, so opening the overview
  // after the list (or vice-versa) doesn't re-read the database.
  const fixedDeposits = useCollectionState<FixedDepositModel>("fixedDeposits");
  const banks = useCollectionState<BankModel>("banks");

  const hasLoaded = fixedDeposits.hasLoaded && banks.hasLoaded;
  const isRefreshing = fixedDeposits.isRefreshing || banks.isRefreshing;
  const onRefresh = () => {
    fixedDeposits.onRefresh();
    banks.onRefresh();
  };

  // The query layer already returns only the deposits this user may see, so the
  // hero figure always agrees with the list.
  const deposits = useMemo(
    () => mergeBankNames(fixedDeposits.items, banks.items),
    [fixedDeposits.items, banks.items]
  );

  const totals = useMemo(() => buildTotals(deposits), [deposits]);

  // Placeholders stand in for the hero, KPI row and bar cards until the first
  // fetch resolves; pull-to-refresh afterwards keeps the real numbers visible.
  if (!hasLoaded) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <OverviewSkeleton />
      </ScrollView>
    );
  }

  if (!deposits.length) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Ionicons name="pie-chart-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Nothing to summarise yet</Text>
        <Text style={styles.emptyBody}>
          Add a fixed deposit and its totals will show up here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total deposited</Text>
        <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>
          {rupees(totals.amount)}
        </Text>
        <Text style={styles.heroMeta}>
          {totals.depositCount}{" "}
          {totals.depositCount === 1 ? "deposit" : "deposits"} across{" "}
          {totals.bankCount} {totals.bankCount === 1 ? "bank" : "banks"}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={[styles.card, styles.statCard]}>
          <Text style={styles.statLabel}>Total interest</Text>
          <Text style={styles.statValue}>{rupees(totals.interest)}</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <Text style={styles.statLabel}>Largest deposit</Text>
          <Text style={styles.statValue}>{rupees(totals.largestDeposit)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deposited by bank</Text>
        <Text style={styles.cardSubtitle}>Highest first</Text>
        <BarList
          data={totals.amountByBank}
          color={colors.chartAmount}
          formatValue={rupees}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Interest by bank</Text>
        <Text style={styles.cardSubtitle}>Highest first</Text>
        <BarList
          data={totals.interestByBank}
          color={colors.chartInterest}
          formatValue={rupees}
        />
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      marginBottom: 14,
    },
    heroLabel: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    heroValue: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
      fontVariant: ["tabular-nums"],
    },
    heroMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statCard: {
      width: "48%",
    },
    statLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    statValue: {
      fontSize: 19,
      fontWeight: "700",
      color: colors.text,
      marginTop: 6,
      fontVariant: ["tabular-nums"],
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginTop: 14,
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default OverviewScreen;
