import React, { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCollectionState } from "../redux/hooks";
import MonthlyEarningsChart from "../components/MonthlyEarningsChart";
import ProgressBar from "../components/ProgressBar";
import { OverviewSkeleton } from "../components/Skeleton";
import { useTheme } from "../context/ThemeContext";
import { EarningModel, SavingModel } from "../models/LedgerModel";
import { ThemeColors } from "../utils/Color";
import {
  Bucket,
  monthlyByType,
  savingsRate,
  sumAmount,
  totalsBy,
} from "../utils/ledger";
import { amountFormat, NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const rupees = (value: number) => `₹ ${amountFormat(Math.round(value))}`;

const LedgerOverviewScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Cached, so opening the ledger overview reuses what the earning/saving
  // lists already loaded instead of re-reading both collections.
  const earningState = useCollectionState<EarningModel>("earnings");
  const savingState = useCollectionState<SavingModel>("savings");
  const earnings = earningState.items;
  const savings = savingState.items;

  const hasLoaded = earningState.hasLoaded && savingState.hasLoaded;
  const isRefreshing = earningState.isRefreshing || savingState.isRefreshing;
  const onRefresh = () => {
    earningState.onRefresh();
    savingState.onRefresh();
  };

  const totalEarned = useMemo(() => sumAmount(earnings), [earnings]);
  const totalSaved = useMemo(() => sumAmount(savings), [savings]);
  const rate = savingsRate(totalEarned, totalSaved);

  const byClient = useMemo(
    () => totalsBy(earnings, (entry) => entry.clientName),
    [earnings]
  );
  const savingsByClient = useMemo(
    () => totalsBy(savings, (entry) => entry.clientName),
    [savings]
  );
  // Bounded to the last 12 active months, so the section never grows unbounded
  // the way a per-month list would — older months scroll horizontally.
  const monthlyEarnings = useMemo(() => monthlyByType(earnings), [earnings]);

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

  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <OverviewSkeleton />
      </View>
    );
  }

  const isEmpty = earnings.length === 0 && savings.length === 0;

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
        <Text style={styles.heroLabel}>Total earned</Text>
        <Text style={styles.heroValue}>{rupees(totalEarned)}</Text>

        <View style={styles.heroSplit}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Saved</Text>
            <Text style={[styles.statValue, styles.saved]}>
              {rupees(totalSaved)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Savings rate</Text>
            <Text style={styles.statValue}>{Math.round(rate * 100)}%</Text>
          </View>
        </View>

        <View style={styles.barWrap}>
          <ProgressBar progress={rate} />
        </View>
      </View>

      {isEmpty && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Nothing recorded yet. Add an earning or a saving and this page fills
            in.
          </Text>
        </View>
      )}

      {monthlyEarnings.months.length > 0 && monthlyEarnings.maxTotal > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Earnings by month</Text>
          <MonthlyEarningsChart data={monthlyEarnings} />
        </View>
      )}

      {byClient.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Earnings by client</Text>
          {renderBuckets(byClient, colors.chartAmount)}
        </View>
      )}

      {savingsByClient.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Savings by client</Text>
          {renderBuckets(savingsByClient, colors.chartInterest)}
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
      marginBottom: 14,
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
    saved: {
      color: colors.positive,
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

export default LedgerOverviewScreen;
