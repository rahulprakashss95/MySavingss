import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { FontAwesome, AntDesign, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import FeatureTile from "../components/FeatureTile";
import { ThemeColors } from "../utils/Color";
import { useTheme } from "../context/ThemeContext";

const DepositScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* No page title here: the stack header already reads "Deposits". */}
      <Text style={styles.lede}>
        Manage your fixed deposits and the banks holding them.
      </Text>

      <Text style={styles.sectionTitle}>Records</Text>

      <View style={styles.grid}>
        <FeatureTile
          title="Fixed Deposit"
          subtitle="View, add & edit deposits"
          accent={colors.accentBlue}
          renderIcon={(color) => (
            <FontAwesome name="credit-card" size={22} color={color} />
          )}
          onPress={() => router.push("/deposits/fixed-deposits")}
        />
        <FeatureTile
          title="Banks"
          subtitle="Banks holding deposits"
          accent={colors.accentViolet}
          renderIcon={(color) => (
            <AntDesign name="file" size={22} color={color} />
          )}
          onPress={() => router.push("/deposits/banks")}
        />
      </View>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Insights</Text>

      <FeatureTile
        wide
        title="Overview"
        subtitle="Totals & interest breakdown"
        accent={colors.accentAmber}
        renderIcon={(color) => (
          <Ionicons name="pie-chart-outline" size={24} color={color} />
        )}
        onPress={() => router.push("/deposits/overview")}
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

export default DepositScreen;
