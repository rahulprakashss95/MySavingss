import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";

type Props = {
  title: string;
  subtitle?: string;
  /** Shown in the error colour below the dots; also clears the entry. */
  error?: string | null;
  /** Called with the full code once `length` digits are entered. */
  onComplete: (code: string) => void;
  length?: number;
  /** Bump this to force the pad back to an empty state (e.g. next step). */
  resetSignal?: number;
  /** Disable input while a verification is in flight. */
  disabled?: boolean;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

const PasscodePad = ({
  title,
  subtitle,
  error,
  onComplete,
  length = 4,
  resetSignal = 0,
  disabled = false,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [entry, setEntry] = useState("");

  // A new error means the last attempt failed — start fresh.
  useEffect(() => {
    if (error) setEntry("");
  }, [error]);

  // Parent asked for a reset (e.g. moving from "enter" to "confirm").
  useEffect(() => {
    setEntry("");
  }, [resetSignal]);

  const press = (key: string) => {
    if (disabled) return;
    if (key === "del") {
      setEntry((current) => current.slice(0, -1));
      return;
    }
    if (key === "") return;
    setEntry((current) => {
      if (current.length >= length) return current;
      const next = current + key;
      if (next.length === length) {
        // Report the completed code, then clear so the next attempt/step starts
        // from empty regardless of the outcome.
        onComplete(next);
        return "";
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < entry.length && styles.dotFilled]}
          />
        ))}
      </View>

      <Text style={[styles.error, !error && styles.errorHidden]}>
        {error || " "}
      </Text>

      <View style={styles.keypad}>
        {KEYS.map((key, index) => {
          if (key === "") {
            return <View key={index} style={styles.key} />;
          }
          return (
            <Pressable
              key={index}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key === "del" ? "Delete" : key}
              style={({ pressed }) => [
                styles.key,
                styles.keyActive,
                pressed && styles.keyPressed,
              ]}
            >
              {key === "del" ? (
                <Ionicons
                  name="backspace-outline"
                  size={26}
                  color={colors.text}
                />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      width: "100%",
      maxWidth: 340,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },
    dots: {
      flexDirection: "row",
      gap: 18,
      marginTop: 28,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
    },
    dotFilled: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    error: {
      fontSize: 13,
      color: colors.negative,
      marginTop: 16,
      minHeight: 18,
      textAlign: "center",
    },
    errorHidden: {
      opacity: 0,
    },
    keypad: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: 12,
      width: 264,
    },
    key: {
      width: 76,
      height: 76,
      margin: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    keyActive: {
      borderRadius: 38,
      backgroundColor: colors.inputBackground,
    },
    keyPressed: {
      opacity: 0.6,
    },
    keyText: {
      fontSize: 28,
      fontWeight: "500",
      color: colors.text,
    },
  });

export default PasscodePad;
