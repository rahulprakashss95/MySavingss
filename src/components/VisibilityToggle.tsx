import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Visibility } from "../models/common";
import { ThemeColors, tint } from "../utils/Color";

type Props = {
  value: Visibility;
  onChange: (next: Visibility) => void;
};

const OPTIONS: {
  key: Visibility;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  hint: string;
}[] = [
  {
    key: "private",
    label: "Private",
    icon: "lock-closed-outline",
    hint: "Only you can see this record.",
  },
  {
    key: "public",
    label: "Public",
    icon: "people-outline",
    hint: "Everyone in your family can see this record.",
  },
];

/**
 * Per-record visibility control shown at the top of every create/edit screen.
 * Defaults to private everywhere; making a record public shares it with the
 * whole family.
 */
const VisibilityToggle = ({ value, onChange }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const active = OPTIONS.find((o) => o.key === value) ?? OPTIONS[0];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Visibility</Text>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionActive]}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={selected ? colors.primary : colors.textMuted}
                style={styles.optionIcon}
              />
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{active.hint}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 4,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      gap: 4,
    },
    option: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 9,
      borderRadius: 7,
    },
    optionActive: {
      backgroundColor: tint(colors.primary),
    },
    optionIcon: {
      marginRight: 6,
    },
    optionText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    optionTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
  });

export default VisibilityToggle;
