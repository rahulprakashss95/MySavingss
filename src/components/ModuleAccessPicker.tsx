import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FeatureKey, MODULES } from "../models/common";
import { ThemeColors } from "../utils/Color";

type Props = {
  /** The leaf feature keys currently granted. */
  value: FeatureKey[];
  onChange: (next: FeatureKey[]) => void;
  disabled?: boolean;
};

/**
 * Two-level access picker: a checkbox per module (ticks/unticks all its tiles)
 * with the individual tiles beneath it. Access is stored as the leaf feature
 * keys the tiles map to — see the access model in `common.ts`.
 */
const ModuleAccessPicker = ({ value, onChange, disabled }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const selected = useMemo(() => new Set(value), [value]);

  const setFeatures = (keys: FeatureKey[], on: boolean) => {
    const next = new Set(selected);
    keys.forEach((key) => (on ? next.add(key) : next.delete(key)));
    // Keep a stable, deduped order.
    onChange(
      MODULES.flatMap((m) => m.features.map((f) => f.key)).filter((k) =>
        next.has(k)
      )
    );
  };

  return (
    <View>
      {MODULES.map((module) => {
        const features = module.features.map((f) => f.key);
        const onCount = features.filter((f) => selected.has(f)).length;
        const allOn = onCount === features.length;
        const someOn = onCount > 0 && !allOn;

        return (
          <View key={module.key} style={styles.group}>
            <Pressable
              onPress={() => !disabled && setFeatures(features, !allOn)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allOn, disabled }}
              style={[styles.moduleRow, disabled && styles.disabled]}
            >
              <Ionicons
                name={
                  allOn
                    ? "checkbox"
                    : someOn
                    ? "remove-circle"
                    : "square-outline"
                }
                size={20}
                color={onCount > 0 ? colors.primary : colors.textMuted}
                style={styles.icon}
              />
              <Text style={styles.moduleLabel}>{module.label}</Text>
            </Pressable>

            <View style={styles.tiles}>
              {module.features.map((feature) => {
                const active = selected.has(feature.key);
                return (
                  <Pressable
                    key={feature.key}
                    onPress={() =>
                      !disabled && setFeatures([feature.key], !active)
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active, disabled }}
                    style={[styles.tileRow, disabled && styles.disabled]}
                  >
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={18}
                      color={active ? colors.primary : colors.textMuted}
                      style={styles.icon}
                    />
                    <Text
                      style={[
                        styles.tileLabel,
                        active && styles.tileLabelActive,
                      ]}
                    >
                      {feature.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      padding: 12,
      marginBottom: 10,
    },
    moduleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    moduleLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    tiles: {
      paddingTop: 6,
      paddingLeft: 6,
    },
    tileRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: 8,
    },
    tileLabel: {
      fontSize: 14,
      color: colors.text,
    },
    tileLabelActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    icon: {
      marginRight: 10,
    },
    disabled: {
      opacity: 0.5,
    },
  });

export default ModuleAccessPicker;
