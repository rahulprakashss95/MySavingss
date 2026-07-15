import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { getClients, getFixedDeposit } from "../../database/firebaseQuery";
import { FixedDepositModel } from "../models/FixedDepositModel";
import { ClientModel } from "../models/ClientModel";
import { amountFormat, NavigationProp, showToast } from "../utils/Utils";
import {
  mergeClientNames,
  sortByMaturity,
  visibleDeposits,
} from "../utils/deposits";
import { useAuth } from "../context/AuthContext";
import { DepositListSkeleton } from "../components/Skeleton";
import FDCard from "../components/FDCard";
import FloatingButton from "../components/FAB";

type Props = {
  navigation: NavigationProp;
};

const FixedDepositListScreen = ({ navigation }: Props) => {
  const [fixedDeposits, setFixedDeposits] = useState<FixedDepositModel[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      getFDData();
    });

    return unsubscribe;
  }, [navigation, user]);

  const getFDData = () => {
    // Deposits only carry a clientId, so the bank names come from `clients`.
    // Both are independent reads — fetch them together.
    Promise.all([getFixedDeposit(), getClients()])
      .then(([deposits, clients]: any[]) => {
        // The query layer already scopes to the family and the current user's
        // visible records; this only drops completed/hidden ones.
        const visible = visibleDeposits(deposits as FixedDepositModel[]);
        setFixedDeposits(
          sortByMaturity(mergeClientNames(visible, clients as ClientModel[]))
        );
      })
      .catch((error) => {
        console.log(error);
        showToast(
          "error",
          "Unable to load deposits",
          "Check your connection and pull down to retry.",
          "bottom"
        );
      })
      .finally(() => {
        setIsRefreshing(false);
        setHasLoaded(true);
      });
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    getFDData();
  };

  const navigateFDAddEdit = (data: any) => {
    navigation.navigate("FixedDepositAddEdit", {
      fixedDepositData: data,
    });
  };

  const totalAmount = useMemo(
    () => fixedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [fixedDeposits]
  );

  const renderSummary = () => {
    if (!fixedDeposits.length) {
      return null;
    }
    return (
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>
          {fixedDeposits.length}{" "}
          {fixedDeposits.length === 1 ? "deposit" : "deposits"}
        </Text>
        <Text style={styles.summaryValue}>₹ {amountFormat(totalAmount)}</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    // Never show "nothing here" before the first fetch has actually resolved.
    if (!hasLoaded) {
      return null;
    }
    return (
      <View style={styles.empty}>
        <Ionicons name="file-tray-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No fixed deposits yet</Text>
        <Text style={styles.emptyBody}>
          Tap the + button to add your first deposit.
        </Text>
      </View>
    );
  };

  // Only the very first fetch gets a skeleton. Re-fetching on focus keeps the
  // list on screen rather than flashing placeholders over data we already have.
  if (!hasLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          <DepositListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={fixedDeposits}
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
          <FDCard fixedDeposit={item} onClickCard={navigateFDAddEdit} />
        )}
      />
      <FloatingButton
        accessibilityLabel="Add deposit"
        onPress={() => navigateFDAddEdit(null)}
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
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default FixedDepositListScreen;
