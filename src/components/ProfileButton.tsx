import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { displayNameOf } from "../models/LoginUserModel";
import { tint } from "../utils/Color";

/**
 * Header avatar that opens the signed-in member's profile.
 *
 * Initials rather than a photo: accounts have no picture — an admin creates
 * members from a username, and there is nowhere to upload one. The same letter
 * the drawer header and the admin roster already show.
 */
const ProfileButton = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const initial = displayNameOf(user).trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open your profile"
      style={({ pressed }) => [
        styles.avatar,
        { backgroundColor: tint(colors.primary) },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.initial, { color: colors.primary }]}>{initial}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    // Mirrors MenuButton's inset on the other side, so the two sit level.
    marginRight: 12,
  },
  initial: {
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});

export default ProfileButton;
