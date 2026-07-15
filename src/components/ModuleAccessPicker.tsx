import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MODULE_KEYS, MODULE_LABELS, ModuleKey } from "../models/common";
import { ThemeColors, tint } from "../utils/Color";

type Props = {
  value: ModuleKey[];
  onChange: (next: ModuleKey[]) => void;
  disabled?: boolean;
};

/** Multi-select chips for which modules a member can open. */
const ModuleAccessPicker = ({ value, onChange, disabled }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggle = (key: ModuleKey) => {
    if (disabled) return;
    onChange(
      value.includes(key)
        ? value.filter((k) => k !== key)
        : [...value, key]
    );
  };

  return (
    <View style={styles.row}>
      {MODULE_KEYS.map((key) => {
        const active = value.includes(key);
        return (
          <Pressable
            key={key}
            onPress={() => toggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active, disabled }}
            style={[
              styles.chip,
              active && styles.chipActive,
              disabled && styles.chipDisabled,
            ]}
          >
            <Ionicons
              name={active ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={active ? colors.primary : colors.textMuted}
              style={styles.chipIcon}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {MODULE_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    chipDisabled: {
      opacity: 0.5,
    },
    chipIcon: {
      marginRight: 6,
    },
    chipText: {
      fontSize: 13,
      color: colors.text,
    },
    chipTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

export default ModuleAccessPicker;
