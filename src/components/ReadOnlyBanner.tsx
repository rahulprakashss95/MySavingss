import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";

type Props = {
  /** When false the banner renders nothing, so callers can inline it freely. */
  show: boolean;
};

/**
 * Shown at the top of an edit screen when the current user isn't the record's
 * owner. A public record is visible to the whole family but only its creator
 * can change it, so the save/delete actions are hidden and this explains why.
 */
const ReadOnlyBanner = ({ show }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!show) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
      <Text style={styles.text}>
        Shared by another member — you can view this record but not edit it.
      </Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: tint(colors.textMuted),
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    text: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });

export default ReadOnlyBanner;
