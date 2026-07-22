import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { saveMetalRates } from "../../database/query";
import {
  useAppDispatch,
  useCollectionState,
  useMetalRates,
  useOwnerName,
} from "../redux/hooks";
import { metalRatesActions } from "../redux/metalRatesSlice";
import MetalRatesModal from "../components/MetalRatesModal";
import ProgressBar from "../components/ProgressBar";
import { OverviewSkeleton } from "../components/Skeleton";
import { useTheme } from "../context/ThemeContext";
import {
  EMPTY_METAL_RATES,
  MetalRates,
  OrnamentModel,
  PropertyModel,
} from "../models/AssetModel";
import {
  formatNumber,
  gramsToPawn,
  MetalTotal,
  ornamentsByHolder,
  ornamentTotals,
  propertyPortfolio,
} from "../utils/assets";
import { ThemeColors } from "../utils/Color";
import { amountFormat, showToast } from "../utils/Utils";
import { useAuth } from "../context/AuthContext";
import { hasFeature } from "../models/common";
import { AccountModel } from "../models/AccountModel";
import { buildAccountTotals } from "../utils/deposits";

const rupees = (value: number) => `₹ ${amountFormat(Math.round(value))}`;

const AssetOverviewScreen = () => {
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isSavingRates, setIsSavingRates] = useState(false);

  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Ornaments, properties and accounts come from the shared cache; metal rates
  // from their own cached doc — none of them re-read on focus.
  const ornamentState = useCollectionState<OrnamentModel>("ornaments");
  const propertyState = useCollectionState<PropertyModel>("properties");
  const accountState = useCollectionState<AccountModel>("accounts");
  const ratesState = useMetalRates();

  const ornaments = ornamentState.items;
  const properties = propertyState.items;
  const rates = ratesState.value ?? EMPTY_METAL_RATES;

  // Deposits/balances count toward net worth only for members who hold the
  // Accounts tile — the overview reflects the tiles you can see.
  const showAccounts = hasFeature(user, "accounts");
  const accountTotals = useMemo(
    () => buildAccountTotals(accountState.items),
    [accountState.items]
  );

  const hasLoaded =
    ornamentState.hasLoaded &&
    propertyState.hasLoaded &&
    accountState.hasLoaded &&
    ratesState.loaded;
  const isRefreshing =
    ornamentState.isRefreshing ||
    propertyState.isRefreshing ||
    accountState.isRefreshing ||
    ratesState.isRefreshing;
  const onRefresh = () => {
    ornamentState.onRefresh();
    propertyState.onRefresh();
    accountState.onRefresh();
    ratesState.onRefresh();
  };

  const ornamentSummary = useMemo(
    () => ornamentTotals(ornaments, rates),
    [ornaments, rates]
  );
  const nameOf = useOwnerName();
  const holders = useMemo(
    () => ornamentsByHolder(ornaments, rates, nameOf),
    [ornaments, rates, nameOf]
  );
  const portfolio = useMemo(() => propertyPortfolio(properties), [properties]);

  const netValue =
    ornamentSummary.totalValue +
    portfolio.total +
    (showAccounts ? accountTotals.balance : 0);
  const hasRates = !!rates.goldPerGram || !!rates.silverPerGram;

  const handleSaveRates = (next: MetalRates) => {
    setIsSavingRates(true);
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    saveMetalRates(stamped)
      .then(() => {
        dispatch(metalRatesActions.set(stamped));
        setIsRatesModalOpen(false);
        showToast("success", "Rates saved", "Saved for everyone.", "bottom");
      })
      .catch((error) => {
        showToast("error", "Unable to save rates", String(error), "bottom");
      })
      .finally(() => setIsSavingRates(false));
  };

  const renderMetalRow = (row: MetalTotal) => {
    const share =
      ornamentSummary.totalValue > 0 ? row.value / ornamentSummary.totalValue : 0;
    // Summed floats: 8.1 + 16.2 lands on 24.299999999999997 without this.
    const grams = formatNumber(row.grams);
    const pawn = gramsToPawn(grams);

    return (
      <View key={row.metal} style={styles.metalRow}>
        <View style={styles.metalTop}>
          <Text style={styles.metalName}>{row.metal}</Text>
          <Text style={styles.metalValue}>
            {row.valued ? rupees(row.value) : "Not valued"}
          </Text>
        </View>
        <View style={styles.metalTop}>
          <Text style={styles.metalMeta}>
            {grams} g{pawn ? ` · ${pawn} pawn` : ""} ·{" "}
            {row.pieces === 1 ? "1 piece" : `${row.pieces} pieces`}
          </Text>
        </View>
        <View style={styles.barWrap}>
          <ProgressBar progress={share} color={colors.chartAmount} />
        </View>

        {/* Gold splits by purity: 22K is worth 8% less per gram than 24K. */}
        {row.karats.length > 1 &&
          row.karats.map((karat) => (
            <View key={karat.karat} style={styles.karatRow}>
              <Text style={styles.karatName}>{karat.karat}</Text>
              <Text style={styles.karatGrams}>{formatNumber(karat.grams)} g</Text>
              <Text style={styles.karatValue}>{rupees(karat.value)}</Text>
            </View>
          ))}
      </View>
    );
  };

  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <OverviewSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MetalRatesModal
        visible={isRatesModalOpen}
        rates={rates}
        isSaving={isSavingRates}
        onClose={() => setIsRatesModalOpen(false)}
        onSave={handleSaveRates}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
        <Text style={styles.heroLabel}>Total asset value</Text>
        <Text style={styles.heroValue}>{rupees(netValue)}</Text>
        <Text style={styles.heroCaption}>
          Ornaments {rupees(ornamentSummary.totalValue)} · Properties{" "}
          {rupees(portfolio.total)} at cost
          {showAccounts ? ` · Accounts ${rupees(accountTotals.balance)}` : ""}
        </Text>
        {ornamentSummary.hasUnvalued && (
          <Text style={styles.heroWarning}>
            Diamond and platinum aren't priced, so the total is a floor.
          </Text>
        )}
        {ornamentSummary.hasAssumedKarat && (
          <Text style={styles.heroWarning}>
            Some gold has no purity set and is valued as 22K. Edit those pieces
            to correct the total.
          </Text>
        )}
      </View>

      {/* A summary, not an editor: tapping opens the rates modal. */}
      <Pressable
        onPress={() => setIsRatesModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Edit metal rates"
        style={({ pressed }) => [styles.ratesStrip, pressed && styles.pressed]}
      >
        <Ionicons
          name="pricetag-outline"
          size={18}
          color={colors.textMuted}
          style={styles.stripIcon}
        />
        <View style={styles.stripText}>
          {hasRates ? (
            <>
              <Text style={styles.stripValue}>
                Gold ₹{rates.goldPerGram}/g · Silver ₹{rates.silverPerGram}/g
              </Text>
              <Text style={styles.stripMeta}>
                {rates.updatedAt
                  ? `Updated ${moment(rates.updatedAt).fromNow()}`
                  : "Never updated"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.stripValue}>Set metal rates</Text>
              <Text style={styles.stripMeta}>
                Ornaments can't be valued without them.
              </Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ornaments</Text>
        {ornamentSummary.rows.length === 0 ? (
          <Text style={styles.emptyText}>No ornaments recorded yet.</Text>
        ) : (
          <>
            <Text style={styles.subTotal}>
              {formatNumber(ornamentSummary.totalGrams)} g in total
            </Text>
            {ornamentSummary.rows.map(renderMetalRow)}
          </>
        )}
      </View>

      {holders.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By holder</Text>
          {holders.map((holder) => (
            <View key={holder.name} style={styles.holderRow}>
              <Text style={styles.holderName} numberOfLines={1}>
                {holder.name}
              </Text>
              <View style={styles.holderRight}>
                <Text style={styles.holderValue}>{rupees(holder.value)}</Text>
                <Text style={styles.holderGrams}>
                  {formatNumber(holder.grams)} g
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Properties</Text>
        {portfolio.count === 0 ? (
          <Text style={styles.emptyText}>No properties recorded yet.</Text>
        ) : (
          <>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Total cost</Text>
                <Text style={styles.statValue}>{rupees(portfolio.total)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Still owed</Text>
                <Text style={[styles.statValue, styles.owed]}>
                  {rupees(portfolio.remaining)}
                </Text>
              </View>
            </View>

            <View style={styles.barWrap}>
              <ProgressBar progress={portfolio.progress} />
            </View>

            <Text style={styles.propertyCaption}>
              {rupees(portfolio.paid)} paid across{" "}
              {portfolio.count === 1 ? "1 property" : `${portfolio.count} properties`}
              {portfolio.outstandingCount > 0
                ? ` · ${portfolio.outstandingCount} still owing`
                : " · all settled"}
            </Text>
          </>
        )}
      </View>

      {showAccounts && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accounts & Deposits</Text>
          {accountTotals.accountCount === 0 ? (
            <Text style={styles.emptyText}>No accounts recorded yet.</Text>
          ) : (
            <>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Total balance</Text>
                  <Text style={styles.statValue}>
                    {rupees(accountTotals.balance)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Deposit interest</Text>
                  <Text style={styles.statValue}>
                    {rupees(accountTotals.interest)}
                  </Text>
                </View>
              </View>

              {accountTotals.balanceBySection.map((row) => (
                <View key={row.label} style={styles.holderRow}>
                  <Text style={styles.holderName} numberOfLines={1}>
                    {row.label}
                  </Text>
                  <Text style={styles.holderValue}>{rupees(row.value)}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
      </ScrollView>
    </View>
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
    heroCaption: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
      lineHeight: 19,
    },
    heroWarning: {
      fontSize: 12,
      color: colors.accentAmber,
      marginTop: 8,
      lineHeight: 17,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    ratesStrip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 14,
    },
    stripIcon: {
      marginRight: 12,
    },
    stripText: {
      flex: 1,
      marginRight: 12,
    },
    stripValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    stripMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 16,
    },
    pressed: {
      opacity: 0.6,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    subTotal: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: -8,
      marginBottom: 16,
    },
    metalRow: {
      marginBottom: 16,
    },
    metalTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    metalName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    metalValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    metalMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    barWrap: {
      marginTop: 8,
    },
    karatRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingLeft: 12,
    },
    karatName: {
      width: 46,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    karatGrams: {
      flex: 1,
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    karatValue: {
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    holderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    holderName: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      marginRight: 12,
      textTransform: "capitalize",
    },
    holderRight: {
      alignItems: "flex-end",
    },
    holderValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    holderGrams: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
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
    owed: {
      color: colors.accentAmber,
    },
    propertyCaption: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 10,
      lineHeight: 17,
    },
  });

export default AssetOverviewScreen;
