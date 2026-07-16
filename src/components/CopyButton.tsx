import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GestureResponderEvent, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { showToast } from "../utils/Utils";

type ICopyButton = {
  /** Copied verbatim — never the display-formatted string. */
  value: string;
  /** Names the thing being copied, e.g. "Account number". */
  label: string;
  size?: number;
};

const CONFIRMATION_MS = 1500;

const CopyButton = ({ value, label, size = 18 }: ICopyButton) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = (event: GestureResponderEvent) => {
    // The card behind this button navigates to the edit screen. Native lets the
    // inner press win, but react-native-web bubbles it, so stop it explicitly.
    event?.stopPropagation?.();

    Clipboard.setStringAsync(value)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
        showToast("success", "Copied", `${label} copied to clipboard.`, "bottom");
      })
      .catch((error) => {
        console.log(error);
        showToast("error", "Unable to copy", "The clipboard is unavailable.", "bottom");
      });
  };

  return (
    <Pressable
      onPress={handleCopy}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name={copied ? "checkmark" : "copy-outline"}
        size={size}
        color={copied ? colors.positive : colors.textMuted}
      />
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.inputBackground,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default CopyButton;
