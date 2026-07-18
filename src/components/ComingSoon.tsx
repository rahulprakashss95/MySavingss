import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

/**
 * Temporary tab body for modules not yet migrated to Expo Router. Exists only
 * during the file-based-routing proof-of-concept — replaced by the real module
 * screens in the next phase.
 */
const ComingSoon = ({ module }: { module: string }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name="construct-outline" size={44} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{module}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Being migrated to the new navigation. Coming back shortly.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});

export default ComingSoon;
