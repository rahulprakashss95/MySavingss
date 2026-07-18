import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
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
    // The native-stack header already insets `headerLeft` from the edge on
    // Android/iOS, so no left margin is needed there. react-native-web's header
    // gives it none, so the icon would sit flush against the edge — add it back
    // on web only. The right margin is the gap before the title.
    marginLeft: Platform.OS === "web" ? 12 : 0,
    marginRight: 16,
  },
  pressed: {
    opacity: 0.5,
  },
});

export default MenuButton;
