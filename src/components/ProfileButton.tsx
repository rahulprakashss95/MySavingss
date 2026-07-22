import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

/**
 * Header avatar that opens the signed-in member's profile. Shows the member's
 * profile picture, or their initial when they haven't set one — see `Avatar`.
 */
const ProfileButton = () => {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open your profile"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Avatar user={user} size={32} fontSize={14} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    // Mirrors MenuButton's inset on the other side, so the two sit level.
    marginRight: 12,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default ProfileButton;
