import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useDrawer } from "../context/DrawerContext";

/** Header hamburger that opens the app-wide SideDrawer. */
const MenuButton = () => {
  const { colors } = useTheme();
  const { open } = useDrawer();

  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
    >
      <Ionicons name="menu" size={26} color={colors.text} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  icon: {
    padding: 2,
    marginRight: 4,
  },
  pressed: {
    opacity: 0.5,
  },
});

export default MenuButton;
