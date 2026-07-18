import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import LedgerClientForm from "../components/forms/LedgerClientForm";
import { useTheme } from "../context/ThemeContext";
import { LedgerClientModel } from "../models/LedgerModel";
import { useCollectionState } from "../redux/hooks";
import { ThemeColors } from "../utils/Color";

/**
 * Thin wrapper: fields, save, and delete all live in the shared LedgerClientForm.
 * The route carries just the id (`new` = create); the record is read from the
 * RTK cache, which hydrates on mount, so this works on a cold deep link too.
 */
const LedgerClientAddEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const clients = useCollectionState<LedgerClientModel>("ledgerClients");
  const isNew = id === "new";
  const client = isNew ? null : clients.items.find((c) => c.id === id) ?? null;

  if (!isNew && !client && !clients.hasLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LedgerClientForm
        initial={client}
        onSaved={() => router.back()}
        onDeleted={() => router.back()}
      />
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
  });

export default LedgerClientAddEditScreen;
