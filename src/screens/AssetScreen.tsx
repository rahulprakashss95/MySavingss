import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import FeatureTile from "../components/FeatureTile";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";

const AssetScreen = () => {
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
        What the family owns — jewellery by metal, property with its payments,
        and vehicles with their papers.
      </Text>

      <Text style={styles.sectionTitle}>Records</Text>

      <View style={styles.grid}>
        <FeatureTile
          title="Ornaments"
          subtitle="Gold, silver & stones"
          accent={colors.accentAmber}
          renderIcon={(color) => (
            <Ionicons name="ribbon-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/assets/ornaments")}
        />
        <FeatureTile
          title="Properties"
          subtitle="Land & homes"
          accent={colors.accentBlue}
          renderIcon={(color) => (
            <Ionicons name="home-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/assets/properties")}
        />
      </View>

      <View style={styles.tileSpacing}>
        <FeatureTile
          wide
          title="Vehicles"
          subtitle="Cars, bikes & insurance"
          accent={colors.positive}
          renderIcon={(color) => (
            <Ionicons name="car-outline" size={24} color={color} />
          )}
          onPress={() => router.push("/assets/vehicles")}
        />
      </View>

      <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Insights</Text>

      <FeatureTile
        wide
        title="Overview"
        subtitle="Metal rates, totals & balances"
        accent={colors.accentViolet}
        renderIcon={(color) => (
          <Ionicons name="stats-chart-outline" size={24} color={color} />
        )}
        onPress={() => router.push("/assets/overview")}
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
    tileSpacing: {
      marginTop: 14,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
  });

export default AssetScreen;
