import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import { ThemeMode, useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";

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

const SettingsScreen = () => {
  const { mode, setMode, colors } = useTheme();
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
