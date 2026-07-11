import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import { QUOTES } from "../utils/quotes";
import { currentOS } from "../utils/Utils";

const ROTATE_MS = 12000;
const FADE_MS = 450;

/** A quote that cross-fades to the next one every ROTATE_MS; tap for another. */
const QuoteCard = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Start somewhere random so the app doesn't always open on the same line.
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * QUOTES.length)
  );
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setInterval>>();
  const isAnimating = useRef(false);

  // react-native-web's Animated has no native driver.
  const useNative = currentOS !== "web";

  const advance = () => {
    if (isAnimating.current) {
      return;
    }
    isAnimating.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: useNative,
    }).start(() => {
      setIndex((current) => (current + 1) % QUOTES.length);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: useNative,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  };

  const startTimer = () => {
    clearInterval(timer.current);
    timer.current = setInterval(advance, ROTATE_MS);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timer.current);
  }, []);

  // A manual tap advances and resets the clock, so the next auto-rotate is a
  // full interval away rather than firing a second later.
  const handlePress = () => {
    advance();
    startTimer();
  };

  const quote = QUOTES[index];

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Quote: ${quote.text} — ${quote.author}. Tap for another.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconChip}>
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
      </View>
      <Animated.View style={{ opacity }}>
        <Text style={styles.quote}>{quote.text}</Text>
        <Text style={styles.author}>— {quote.author}</Text>
      </Animated.View>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    pressed: {
      opacity: 0.75,
    },
    iconChip: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(colors.primary),
      marginBottom: 12,
    },
    quote: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
    author: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 10,
    },
  });

export default QuoteCard;
