import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import BankForm from "../components/forms/BankForm";
import { useTheme } from "../context/ThemeContext";
import { BankModel } from "../models/BankModel";
import { useCollectionState } from "../query/hooks";
import { ThemeColors } from "../utils/Color";

/**
 * Add/edit an institution (a `banks` row). The route carries just the id
 * (`new` = create); the record itself is read from the RTK cache — which
 * `useCollectionState` hydrates on mount, so this works on a cold deep link,
 * not only when reached from the list. Fields, save and delete live in the
 * shared BankForm.
 */
const InstitutionAddEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const banks = useCollectionState<BankModel>("banks");
  const isNew = id === "new";
  const bank = isNew ? null : banks.items.find((b) => b.id === id) ?? null;

  // Deep-link/refresh: the record may not be in the cache on first paint. Wait
  // for the fetch before deciding; once loaded, an unknown id falls through to
  // create so the screen is still usable.
  if (!isNew && !bank && !banks.hasLoaded) {
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
      <BankForm
        initial={bank}
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

export default InstitutionAddEditScreen;
