import moment from "moment";
import React, { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MonthlyEarningsChart from "../components/MonthlyEarningsChart";
import ProgressBar from "../components/ProgressBar";
import { OverviewSkeleton } from "../components/Skeleton";
import { useTheme } from "../context/ThemeContext";
import { ExpenseModel } from "../models/ExpenseModel";
import { useCollectionState } from "../redux/hooks";
import { ThemeColors } from "../utils/Color";
import { DATE_FORMAT } from "../utils/deposits";
import { Bucket, monthKey, monthlyByType, sumAmount, totalsBy } from "../utils/ledger";
import { amountFormat } from "../utils/Utils";

const rupees = (value: number) => `₹ ${amountFormat(Math.round(value))}`;

const ExpenseOverviewScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Cached, so opening the overview reuses what the expense list already loaded.
  const expenseState = useCollectionState<ExpenseModel>("expenses");
  const expenses = expenseState.items;

  const totalSpent = useMemo(() => sumAmount(expenses), [expenses]);

  const thisMonthTotal = useMemo(() => {
    const current = monthKey(moment().format(DATE_FORMAT));
    return sumAmount(expenses.filter((e) => monthKey(e.date) === current));
  }, [expenses]);

  const byType = useMemo(
    () => totalsBy(expenses, (entry) => entry.typeName),
    [expenses]
  );

  // The monthly chart wants a `type` field; expenses carry `typeName`.
  const monthly = useMemo(
    () => monthlyByType(expenses.map((e) => ({ ...e, type: e.typeName }))),
    [expenses]
  );

  /** Bars are scaled against the biggest bucket, not the total — easier to read. */
  const renderBuckets = (buckets: Bucket[], color: string) => {
    const max = Math.max(...buckets.map((bucket) => bucket.total), 1);
    return buckets.map((bucket) => (
      <View key={bucket.label} style={styles.bucket}>
        <View style={styles.bucketTop}>
          <Text style={styles.bucketLabel} numberOfLines={1}>
            {bucket.label}
          </Text>
          <Text style={styles.bucketValue}>{rupees(bucket.total)}</Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar progress={bucket.total / max} color={color} />
        </View>
      </View>
    ));
  };

  if (!expenseState.hasLoaded) {
    return (
      <View style={styles.container}>
        <OverviewSkeleton />
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
          refreshing={expenseState.isRefreshing}
          onRefresh={expenseState.onRefresh}
          tintColor={colors.textMuted}
        />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total spent</Text>
        <Text style={styles.heroValue}>{rupees(totalSpent)}</Text>

        <View style={styles.heroSplit}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>This month</Text>
            <Text style={styles.statValue}>{rupees(thisMonthTotal)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Entries</Text>
            <Text style={styles.statValue}>{expenses.length}</Text>
          </View>
        </View>
      </View>

      {expenses.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nothing recorded yet. Add an expense and this page fills in.
          </Text>
        </View>
      )}

      {monthly.months.length > 0 && monthly.maxTotal > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spending by month</Text>
          <MonthlyEarningsChart data={monthly} />
        </View>
      )}

      {byType.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spending by type</Text>
          {renderBuckets(byType, colors.chartAmount)}
        </View>
      )}
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
      paddingBottom: 40,
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
      fontSize: 34,
      fontWeight: "700",
      color: colors.text,
      marginTop: 8,
      fontVariant: ["tabular-nums"],
    },
    heroSplit: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
    },
    stat: {
      flex: 1,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 4,
      fontVariant: ["tabular-nums"],
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    barWrap: {
      marginTop: 8,
    },
    bucket: {
      marginBottom: 14,
    },
    bucketTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    bucketLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      marginRight: 12,
    },
    bucketValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
  });

export default ExpenseOverviewScreen;
