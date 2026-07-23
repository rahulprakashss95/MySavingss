import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Card from "../components/Card";
import { usePasscode } from "../context/PasscodeContext";
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
  const { isEnabled: passcodeEnabled } = usePasscode();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Both turning it on and off route through the passcode screen: on collects a
  // new code, off confirms the current one before clearing it.
  const handleTogglePasscode = (next: boolean) => {
    router.push(
      next ? "/settings/passcode" : "/settings/passcode?mode=disable"
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.sectionTitle}>Security</Text>
      <Card customStyle={styles.card}>
        <View style={styles.row}>
          <Ionicons
            name="lock-closed-outline"
            size={22}
            color={passcodeEnabled ? colors.primary : colors.textMuted}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>App passcode</Text>
            <Text style={styles.rowDescription}>
              Require a 4-digit passcode when the app opens
            </Text>
          </View>
          <Switch
            value={passcodeEnabled}
            onValueChange={handleTogglePasscode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Home</Text>
      <Card customStyle={styles.card}>
        <Pressable
          onPress={() => router.push("/settings/dashboard")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <Ionicons
            name="reorder-three-outline"
            size={22}
            color={colors.textMuted}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Rearrange dashboard</Text>
            <Text style={styles.rowDescription}>
              Choose the order the Home sections appear in
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
      </Card>

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
