import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { QUOTES } from "../utils/quotes";
import { currentOS } from "../utils/Utils";

const ROTATE_MS = 12000;
const FADE_MS = 450;

/**
 * A quiet one-line-ish strip that cross-fades to the next quote every ROTATE_MS;
 * tap for another. Deliberately chrome-less (no card/shadow) so it reads as a
 * subtle touch rather than a content block competing with the feature tiles.
 */
const QuoteCard = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Start somewhere random so the app doesn't always open on the same line.
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * QUOTES.length)
  );
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons
        name="sparkles-outline"
        size={14}
        color={colors.textMuted}
        style={styles.icon}
      />
      <Animated.View style={[styles.textWrap, { opacity }]}>
        <Text style={styles.text} numberOfLines={2}>
          <Text style={styles.quote}>{quote.text}</Text>
          <Text style={styles.author}>{`  — ${quote.author}`}</Text>
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 2,
    },
    pressed: {
      opacity: 0.6,
    },
    icon: {
      marginRight: 8,
      marginTop: 2,
    },
    textWrap: {
      flex: 1,
      // Always reserve two lines so short and long quotes occupy the same
      // height — otherwise the strip (and the tiles below) jump on each rotate.
      minHeight: 38,
    },
    text: {
      fontSize: 13,
      lineHeight: 19,
    },
    quote: {
      color: colors.text,
      fontStyle: "italic",
    },
    author: {
      color: colors.textMuted,
      fontWeight: "600",
    },
  });

export default QuoteCard;
