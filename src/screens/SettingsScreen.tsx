import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Card from "../components/Card";
import { confirmSignOut } from "../components/HeaderActions";
import { useAuth } from "../context/AuthContext";
import { ThemeMode, useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { showToast } from "../utils/Utils";

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
  const { user, signOut } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const copyFamilyId = async () => {
    if (!user?.familyCode) return;
    await Clipboard.setStringAsync(user.familyCode);
    showToast("success", "Copied", `Family ID "${user.familyCode}" copied.`, "bottom");
  };

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

      {!!user?.familyCode && (
        <>
          <Text style={styles.sectionTitle}>Family</Text>
          <Card customStyle={styles.card}>
            <View style={[styles.row, styles.accountRow]}>
              <Ionicons name="home-outline" size={22} color={colors.textMuted} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>
                  {user.familyName || "Your family"}
                </Text>
                <Text style={styles.rowDescription}>Your family</Text>
              </View>
            </View>
            <Pressable
              onPress={copyFamilyId}
              accessibilityRole="button"
              accessibilityLabel="Copy Family ID"
              style={({ pressed }) => [
                styles.row,
                styles.rowDivider,
                pressed && styles.rowPressed,
              ]}
            >
              <Ionicons name="key-outline" size={22} color={colors.textMuted} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Family ID</Text>
                <Text style={styles.rowDescription}>{user.familyCode}</Text>
              </View>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
            </Pressable>
          </Card>
        </>
      )}

      <Text style={styles.sectionTitle}>Account</Text>
      <Card customStyle={styles.card}>
        {user?.username && (
          <View style={[styles.row, styles.accountRow]}>
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={colors.textMuted}
            />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Signed in</Text>
              <Text style={styles.rowDescription}>{user.username}</Text>
            </View>
          </View>
        )}
        <Pressable
          onPress={() => confirmSignOut(signOut)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            user?.username ? styles.rowDivider : null,
            pressed && styles.rowPressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.negative} />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, styles.signOutLabel]}>Log out</Text>
          </View>
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
    accountRow: {
      paddingVertical: 14,
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
    signOutLabel: {
      color: colors.negative,
      fontWeight: "500",
    },
  });

export default SettingsScreen;
