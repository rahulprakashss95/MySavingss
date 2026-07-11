import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

type IProgressBar = {
  /** 0–1. Clamped, so a rounding error can't overflow the track. */
  progress: number;
  color?: string;
};

const ProgressBar = ({ progress, color }: IProgressBar) => {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(progress, 1));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={[styles.track, { backgroundColor: colors.chartTrack }]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: color ?? colors.positive,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});

export default ProgressBar;
