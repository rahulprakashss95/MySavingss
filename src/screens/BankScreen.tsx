import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FloatingButton from "../components/FAB";
import { BankListSkeleton } from "../components/Skeleton";
import { BankModel, bankMobileNumbers } from "../models/BankModel";
import { useCollectionState } from "../redux/hooks";
import { useTheme } from "../context/ThemeContext";
import { useRouter } from "expo-router";
import { ThemeColors, tint } from "../utils/Color";

/** "KVB Capital" -> "KC", "HDFC" -> "HD". */
const initialsOf = (name: string) => {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return "?";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const BankScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Served from the store: fetched once and kept in sync as banks are
  // added/edited/deleted, so returning here doesn't re-read the database.
  const banks = useCollectionState<BankModel>("banks");
  const { hasLoaded, isRefreshing, onRefresh } = banks;

  const bankList = useMemo(
    () => [...banks.items].sort((a, b) => a.name.localeCompare(b.name)),
    [banks.items]
  );

  const openBank = (bank: BankModel | null) =>
    router.push(bank ? `/deposits/banks/${bank.id}` : "/deposits/banks/new");

  const renderHeader = () => {
    if (!bankList.length) {
      return null;
    }
    return (
      <Text style={styles.summary}>
        {bankList.length} {bankList.length === 1 ? "bank" : "banks"}
      </Text>
    );
  };

  // Only reached once the first fetch has resolved — see the skeleton guard below.
  const renderEmpty = () => {
    return (
      <View style={styles.empty}>
        <Ionicons name="business-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No banks yet</Text>
        <Text style={styles.emptyBody}>
          Banks you add will appear here and in the deposit form.
        </Text>
      </View>
    );
  };

  const renderBank = ({ item }: { item: BankModel }) => {
    const numbers = bankMobileNumbers(item.mobile);

    return (
      <Pressable
        onPress={() => openBank(item)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.row}>
          <View
            style={[styles.avatar, { backgroundColor: tint(colors.primary) }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {initialsOf(item.name)}
            </Text>
          </View>

          <View style={styles.details}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            {numbers.length ? (
              numbers.map((number) => (
                <View key={number} style={styles.mobileRow}>
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color={colors.textMuted}
                  />
                  <Text style={styles.mobileText}>{number}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noMobile}>No contact number</Text>
            )}
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
    );
  };

  // Only the first fetch gets a skeleton; pull-to-refresh keeps the list on
  // screen rather than flashing placeholders over data we already have.
  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          <BankListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={bankList}
        keyExtractor={(item, index) => item.id ?? String(index)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
          />
        }
        renderItem={renderBank}
      />
      <FloatingButton
        accessibilityLabel="Add bank"
        onPress={() => openBank(null)}
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
    listContent: {
      paddingTop: 16,
      paddingBottom: 90,
      flexGrow: 1,
    },
    summary: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
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
      marginBottom: 12,
    },
    cardPressed: {
      opacity: 0.7,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    avatarText: {
      fontSize: 15,
      fontWeight: "700",
    },
    details: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    mobileRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    mobileText: {
      fontSize: 13,
      color: colors.textMuted,
      marginLeft: 6,
    },
    noMobile: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
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
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default BankScreen;
