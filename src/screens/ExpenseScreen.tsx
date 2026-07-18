import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FeatureTile from "../components/FeatureTile";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { useRouter } from "expo-router";

const ExpenseScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lede}>
        Track what you spend, by type. Your expenses are private to your login.
      </Text>

      <Text style={styles.sectionTitle}>Records</Text>

      <View style={styles.grid}>
        <FeatureTile
          title="Expenses"
          subtitle="What you spent"
          accent={colors.accentAmber}
          renderIcon={(color) => (
            <Ionicons name="receipt-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/expenses/list")}
        />
        <FeatureTile
          title="Types"
          subtitle="Your categories"
          accent={colors.accentViolet}
          renderIcon={(color) => (
            <Ionicons name="pricetags-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/expenses/types")}
        />
      </View>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Insights</Text>

      <FeatureTile
        wide
        title="Overview"
        subtitle="Totals, by type & monthly trend"
        accent={colors.accentBlue}
        renderIcon={(color) => (
          <Ionicons name="stats-chart-outline" size={24} color={color} />
        )}
        onPress={() => router.push("/expenses/overview")}
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
    content: {
      padding: 20,
      paddingBottom: 32,
    },
    lede: {
      fontSize: 16,
      color: colors.textMuted,
      lineHeight: 23,
      marginTop: 4,
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 12,
    },
    sectionSpacing: {
      marginTop: 28,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
  });

export default ExpenseScreen;
