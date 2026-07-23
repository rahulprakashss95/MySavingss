import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import {
  commitSave,
  useAppDispatch,
  useCollectionState,
  useOwnerName,
} from "../query/hooks";
import {
  AccountModel,
  AccountType,
  isMaturingAccount,
  normalizeAccountType,
} from "../models/AccountModel";
import { canEdit } from "../models/common";
import { BankModel } from "../models/BankModel";
import { amountFormat, showToast } from "../utils/Utils";
import {
  accountInstitution,
  rdMonthly,
  rdWithPayment,
  sortByMaturity,
} from "../utils/deposits";
import { updateAccount } from "../../database/query";
import { useAuth } from "../context/AuthContext";
import { DepositListSkeleton } from "../components/Skeleton";
import AccountCard from "../components/AccountCard";
import FloatingButton from "../components/FAB";
import { useRouter } from "expo-router";

/** The list tabs, in the order they appear. `type` is the stored account type. */
const TABS: { type: AccountType; label: string }[] = [
  { type: "Account Balance", label: "Account Balance" },
  { type: "Cash", label: "Cash" },
  { type: "Fixed Deposit", label: "Fixed Deposit" },
  { type: "Recurring Deposit", label: "Recurring Deposit" },
];

const AccountListScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeType, setActiveType] = useState<AccountType>("Account Balance");

  // Both served from the store â€” fetched once, not on every focus. Banks feed
  // the institution label; accounts already carry their own name and balance.
  const accounts = useCollectionState<AccountModel>("accounts");
  const banks = useCollectionState<BankModel>("banks");
  const nameOf = useOwnerName();

  const hasLoaded = accounts.hasLoaded && banks.hasLoaded;
  const isRefreshing = accounts.isRefreshing || banks.isRefreshing;
  const onRefresh = () => {
    accounts.onRefresh();
    banks.onRefresh();
  };

  // The active tab's accounts: deposits sort by soonest maturity, the rest by
  // largest balance.
  const visible = useMemo(() => {
    const matches = accounts.items.filter(
      (a) => normalizeAccountType(a.accountType) === activeType
    );
    return isMaturingAccount(activeType)
      ? sortByMaturity(matches)
      : [...matches].sort(
          (a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0)
        );
  }, [accounts.items, activeType]);

  const subtotal = useMemo(
    () => visible.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [visible]
  );

  const navigateAddEdit = (data: AccountModel | null) => {
    router.push(
      data
        ? `/assets/accounts/${data.id}`
        : `/assets/accounts/new?type=${encodeURIComponent(activeType)}`
    );
  };

  // Marking an RD instalment paid rewrites its payments array and the balance
  // (paid so far), then upserts â€” the cache updates in place, no refetch.
  const handleToggleInstalment = (
    account: AccountModel,
    index: number,
    paid: boolean
  ) => {
    const payments = rdWithPayment(account, index, paid);
    const balance = String(payments.filter(Boolean).length * rdMonthly(account));
    dispatch(
      commitSave("accounts", updateAccount(account.id, { ...account, payments, balance }))
    ).catch((err) =>
      showToast("error", "Unable to update", String(err), "bottom")
    );
  };

  const renderTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScroll}
      contentContainerStyle={styles.tabBar}
    >
      {TABS.map(({ type, label }) => {
        const active = type === activeType;
        return (
          <Pressable
            key={type}
            onPress={() => setActiveType(type)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderSummary = () => {
    if (!visible.length) {
      return null;
    }
    return (
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {visible.length} {visible.length === 1 ? "entry" : "entries"}
        </Text>
        <Text style={styles.summaryValue}>â‚¹ {amountFormat(subtotal)}</Text>
      </View>
    );
  };

  const activeLabel = TABS.find((t) => t.type === activeType)?.label ?? "";

  const renderEmpty = () => {
    if (!hasLoaded) {
      return null;
    }
    return (
      <View style={styles.empty}>
        <Ionicons name="wallet-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No {activeLabel.toLowerCase()} yet</Text>
        <Text style={styles.emptyBody}>
          Tap the + button to add {activeType === "Cash" ? "cash" : "one"}.
        </Text>
      </View>
    );
  };

  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        {renderTabs()}
        <View style={styles.listContent}>
          <DepositListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabs()}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visible}
        keyExtractor={(item, index) => item.id ?? String(index)}
        ListHeaderComponent={renderSummary}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
          />
        }
        renderItem={({ item }) => (
          <AccountCard
            account={item}
            institution={accountInstitution(item, banks.items)}
            ownerName={nameOf(item.ownerId)}
            onClickCard={navigateAddEdit}
            editable={canEdit(item, user?.id)}
            onToggleInstalment={handleToggleInstalment}
          />
        )}
      />
      <FloatingButton
        accessibilityLabel={`Add ${activeLabel}`}
        onPress={() => navigateAddEdit(null)}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // A horizontal ScrollView otherwise stretches to fill the column's height,
    // pushing the list down â€” pin it to its content height.
    tabScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    tabBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 8,
    },
    tab: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      height: 36,
      justifyContent: "center",
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingTop: 14,
      paddingBottom: 90,
      // Fill the list's height so the empty state can center itself; items still
      // sit at the top (default flex-start).
      flexGrow: 1,
      // Keep the cards in a centered column instead of stretching edge-to-edge
      // on wide (web) screens â€” horizontally centered, still top-aligned.
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    summary: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginHorizontal: 16,
      marginBottom: 14,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    summaryValue: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingBottom: 60,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginTop: 14,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default AccountListScreen;
