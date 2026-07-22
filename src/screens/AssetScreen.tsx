import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FeatureTile from "../components/FeatureTile";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { hasFeature } from "../models/common";
import { ThemeColors } from "../utils/Color";

const AssetScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Each tile gates on its own feature key — a member granted only Accounts
  // sees Accounts and the Overview, and nothing else.
  const show = (feature: Parameters<typeof hasFeature>[1]) =>
    hasFeature(user, feature);
  const holdings = show("ornaments") || show("properties") || show("vehicles");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* <Text style={styles.lede}>
        What the family owns — jewellery, property and vehicles, plus the bank
        balances and deposits that make up net worth.
      </Text> */}

      {show("accounts") && (
        <>
          <Text style={styles.sectionTitle}>Banking</Text>
          <FeatureTile
            wide
            title="Accounts & Deposits"
            subtitle="Balances, fixed & recurring deposits, and cash"
            accent={colors.positive}
            renderIcon={(color) => (
              <Ionicons name="card-outline" size={24} color={color} />
            )}
            onPress={() => router.push("/assets/accounts")}
          />
        </>
      )}

      {holdings && (
        <Text
          style={[styles.sectionTitle, show("accounts") && styles.sectionSpacing]}
        >
          Holdings
        </Text>
      )}

      <View style={styles.grid}>
        {show("ornaments") && (
          <FeatureTile
            title="Ornaments"
            subtitle="Gold, silver & stones"
            accent={colors.accentAmber}
            renderIcon={(color) => (
              <Ionicons name="ribbon-outline" size={24} color={color} />
            )}
            onPress={() => router.push("/assets/ornaments")}
          />
        )}
        {show("properties") && (
          <FeatureTile
            title="Properties"
            subtitle="Land & homes"
            accent={colors.accentBlue}
            renderIcon={(color) => (
              <Ionicons name="home-outline" size={24} color={color} />
            )}
            onPress={() => router.push("/assets/properties")}
          />
        )}
      </View>

      {show("vehicles") && (
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
      )}

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
