import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../utils/Color";
import FeatureTile from "../components/FeatureTile";
import QuoteCard from "../components/QuoteCard";
import { NavigationProp } from "../utils/Utils";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ModuleKey } from "../models/common";

type Props = {
  navigation: NavigationProp;
};

const greetingForHour = (hour: number) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

type Tile = {
  key: ModuleKey;
  title: string;
  subtitle: string;
  accent: string;
  renderIcon: (color: string) => React.ReactNode;
  screen: "Deposit" | "Documents" | "Assets" | "Ledger" | "Expenses";
};

const HomeScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const isAdmin = user?.role === "admin";

  const tiles = useMemo<Tile[]>(
    () => [
      {
        key: "deposits",
        title: "Deposits",
        subtitle: "Fixed deposits & clients",
        accent: colors.accentBlue,
        renderIcon: (color) => (
          <FontAwesome name="credit-card" size={22} color={color} />
        ),
        screen: "Deposit",
      },
      {
        key: "documents",
        title: "Documents",
        subtitle: "Government IDs & bank accounts",
        accent: colors.accentViolet,
        renderIcon: (color) => (
          <Ionicons name="document-text-outline" size={24} color={color} />
        ),
        screen: "Documents",
      },
      {
        key: "assets",
        title: "Assets",
        subtitle: "Ornaments & properties",
        accent: colors.accentAmber,
        renderIcon: (color) => (
          <Ionicons name="cube-outline" size={24} color={color} />
        ),
        screen: "Assets",
      },
      {
        key: "ledger",
        title: "Ledger",
        subtitle: "Earnings & savings",
        accent: colors.accentBlue,
        renderIcon: (color) => (
          <Ionicons name="book-outline" size={24} color={color} />
        ),
        screen: "Ledger",
      },
      {
        key: "expenses",
        title: "Expenses",
        subtitle: "What you spend, by type",
        accent: colors.accentAmber,
        renderIcon: (color) => (
          <Ionicons name="receipt-outline" size={24} color={color} />
        ),
        screen: "Expenses",
      },
    ],
    [colors]
  );

  // Admins see everything; members only see the modules granted to them.
  const visibleTiles = tiles.filter(
    (tile) => isAdmin || user?.moduleAccess?.includes(tile.key)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}</Text>
        {!!(user?.name || user?.username) && (
          <Text style={styles.name} numberOfLines={1}>
            {user?.name || user?.username}
          </Text>
        )}
      </View>

      <View style={styles.quoteSpacing}>
        <QuoteCard />
      </View>

      <Text style={styles.sectionTitle}>Manage</Text>

      {visibleTiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No modules assigned yet. Ask your family admin to grant access.
          </Text>
        </View>
      ) : (
        visibleTiles.map((tile, index) => (
          <View key={tile.key} style={index === 0 ? undefined : styles.tileSpacing}>
            <FeatureTile
              wide
              title={tile.title}
              subtitle={tile.subtitle}
              accent={tile.accent}
              renderIcon={tile.renderIcon}
              onPress={() => navigation.navigate(tile.screen)}
            />
          </View>
        ))
      )}

      {isAdmin && (
        <>
          <Text style={[styles.sectionTitle, styles.adminSection]}>Admin</Text>
          <FeatureTile
            wide
            title="Family Admin"
            subtitle="Members, access & family settings"
            accent={colors.accentViolet}
            renderIcon={(color) => (
              <Ionicons name="settings-outline" size={24} color={color} />
            )}
            onPress={() => navigation.navigate("Admin")}
          />
        </>
      )}
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
    header: {
      marginTop: 8,
      marginBottom: 28,
    },
    greeting: {
      fontSize: 15,
      color: colors.textMuted,
    },
    name: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
      textTransform: "capitalize",
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 12,
    },
    adminSection: {
      marginTop: 28,
    },
    tileSpacing: {
      marginTop: 14,
    },
    quoteSpacing: {
      marginBottom: 28,
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 24,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 20,
    },
  });

export default HomeScreen;
