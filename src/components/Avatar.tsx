import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { avatarUrl } from "../../database/query";
import { useTheme } from "../context/ThemeContext";
import type { Avatar as AvatarData } from "../models/common";
import { displayNameOf } from "../models/LoginUserModel";
import { tint } from "../utils/Color";

/**
 * A member's avatar: their uploaded picture, or the first letter of their name
 * in a tinted circle when they haven't set one. The single place that decides
 * photo-vs-initials, so the header, drawer, profile and admin roster all agree.
 */
type Props = {
  user: { name?: string; username: string; avatar?: AvatarData };
  /** Diameter in px. */
  size: number;
  /** Initial font size. Defaults to ~42% of the diameter. */
  fontSize?: number;
  style?: ViewStyle;
};

const Avatar = ({ user, size, fontSize, style }: Props) => {
  const { colors } = useTheme();
  const shape: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: tint(colors.primary),
  };

  if (user.avatar) {
    return (
      <Image
        source={{ uri: avatarUrl(user.avatar.path) }}
        // width/height/borderRadius/margins are valid on both; the cast just
        // reconciles ViewStyle's wider `overflow` union with ImageStyle's.
        style={[shape, style] as StyleProp<ImageStyle>}
        accessibilityRole="image"
        accessibilityLabel={`${displayNameOf(user)}'s profile picture`}
      />
    );
  }

  const initial = displayNameOf(user).trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={[styles.center, shape, style]}>
      <Text
        style={{
          color: colors.primary,
          fontWeight: "700",
          fontSize: fontSize ?? Math.round(size * 0.42),
        }}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Avatar;
