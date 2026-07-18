import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

type ILoader = {
  loading: boolean;
};

const Loader = (props: ILoader) => {
  const { loading } = props;
  const { colors } = useTheme();

  if (!loading) {
    return null;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});

export default Loader;
