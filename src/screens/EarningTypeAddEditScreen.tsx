import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import EarningTypeForm from "../components/forms/EarningTypeForm";
import { useTheme } from "../context/ThemeContext";
import { EarningTypeModel } from "../models/LedgerModel";
import { useCollectionState } from "../query/hooks";
import { ThemeColors } from "../utils/Color";

/**
 * Thin wrapper: fields, save, and delete all live in the shared EarningTypeForm.
 * The route carries just the id (`new` = create); the record is read from the
 * RTK cache, which hydrates on mount, so this works on a cold deep link too.
 */
const EarningTypeAddEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const types = useCollectionState<EarningTypeModel>("earningTypes");
  const isNew = id === "new";
  const type = isNew ? null : types.items.find((t) => t.id === id) ?? null;

  if (!isNew && !type && !types.hasLoaded) {
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
      <EarningTypeForm
        initial={type}
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

export default EarningTypeAddEditScreen;
