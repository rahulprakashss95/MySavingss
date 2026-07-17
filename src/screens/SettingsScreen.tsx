import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { ThemeMode, useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { NavigationProp } from "../utils/Utils";

const THEME_OPTIONS: {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    mode: "system",
    label: "System default",
    description: "Match your device appearance",
    icon: "phone-portrait-outline",
  },
  {
    mode: "light",
    label: "Light",
    description: "Always use the light theme",
    icon: "sunny-outline",
  },
  {
    mode: "dark",
    label: "Dark",
    description: "Always use the dark theme",
    icon: "moon-outline",
  },
];

type Props = {
  navigation: NavigationProp;
};

const SettingsScreen = ({ navigation }: Props) => {
  const { mode, setMode, colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.sectionTitle}>Appearance</Text>
      <Card customStyle={styles.card}>
        {THEME_OPTIONS.map((option, index) => {
          const isSelected = option.mode === mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => setMode(option.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={isSelected ? colors.primary : colors.textMuted}
              />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Text style={styles.rowDescription}>{option.description}</Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark" size={22} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </Card>

      {/* Account, family and log out live on the Profile screen. They were here
          too until Profile existed; keeping both would have meant two places
          showing the same identity, free to drift apart. */}
      <Text style={styles.sectionTitle}>Account</Text>
      <Card customStyle={styles.card}>
        <Pressable
          onPress={() => navigation.navigate("Profile")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <Ionicons
            name="person-circle-outline"
            size={22}
            color={colors.textMuted}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Profile</Text>
            <Text style={styles.rowDescription}>
              {user?.username
                ? `Signed in as ${user.username}`
                : "Your account and family"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginHorizontal: 32,
      marginTop: 12,
    },
    card: {
      paddingVertical: 4,
      paddingHorizontal: 0,
      marginVertical: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 16,
      color: colors.text,
    },
    rowDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
  });

export default SettingsScreen;
