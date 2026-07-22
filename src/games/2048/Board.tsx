import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { ThemeColors } from "../../utils/Color";
import { Direction, Grid } from "./engine";
import { tileColors, tileFontSize } from "./tiles";

/** Below this many pixels a drag is a tap, not a swipe. */
const SWIPE_THRESHOLD = 20;

type Props = {
  grid: Grid;
  colors: ThemeColors;
  /** Ignored once the game is over — a dead board takes no more moves. */
  disabled: boolean;
  onSwipe: (direction: Direction) => void;
};

/**
 * The 4×4 board. Swipes drive it on touch devices; on web, where there is no
 * swipe, the arrow keys (and WASD) do. Tiles pop when they appear or merge —
 * full slide animation would need stable per-tile identity, which is a
 * deliberate future step, not part of this first cut.
 */
const Board = ({ grid, colors, disabled, onSwipe }: Props) => {
  // Keep the latest handler/disabled for the web key listener, whose effect we
  // don't want to re-bind on every render.
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const keys: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const handler = (event: KeyboardEvent) => {
      const direction = keys[event.key];
      if (!direction || disabledRef.current) return;
      event.preventDefault(); // stop the arrow keys from scrolling the page
      onSwipeRef.current(direction);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onEnd((event) => {
      "worklet";
      const { translationX: dx, translationY: dy } = event;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
      const direction: Direction =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
      runOnJS(onSwipe)(direction);
    });

  const frame = [styles.frame, { backgroundColor: colors.border }];

  return (
    <GestureDetector gesture={pan}>
      <View style={frame}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((value, c) => (
              <View
                key={c}
                style={[styles.cell, { backgroundColor: colors.inputBackground }]}
              >
                {value > 0 && <Tile value={value} />}
              </View>
            ))}
          </View>
        ))}
      </View>
    </GestureDetector>
  );
};

/**
 * A single tile. Zooms in when it first appears (a spawn) and pulses when its
 * value changes (a merge landing on this cell), which is what gives the board
 * its feedback without per-tile slide tracking.
 */
const Tile = ({ value }: { value: number }) => {
  const scale = useSharedValue(1);
  const previous = useRef(value);

  useEffect(() => {
    if (value !== previous.current) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 80 }),
        withTiming(1, { duration: 80 })
      );
      previous.current = value;
    }
  }, [value, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const { bg, fg } = tileColors(value);

  return (
    <Animated.View
      entering={ZoomIn.duration(140)}
      style={[styles.tile, { backgroundColor: bg }, animatedStyle]}
    >
      <Text style={[styles.tileText, { color: fg, fontSize: tileFontSize(value) }]}>
        {value}
      </Text>
    </Animated.View>
  );
};

const GAP = 8;

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    maxWidth: 380,
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: 12,
    padding: GAP,
    gap: GAP,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: GAP,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
  },
  tile: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});

export default React.memo(Board);
