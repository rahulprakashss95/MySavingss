import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import FeatureTile from "../components/FeatureTile";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors } from "../utils/Color";
import { NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

const DocumentScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lede}>
        The family's identity and bank details in one place, grouped by person.
      </Text>

      <Text style={styles.sectionTitle}>Records</Text>

      <View style={styles.grid}>
        <FeatureTile
          title="Government"
          subtitle="Aadhaar, PAN & more"
          accent={colors.accentBlue}
          renderIcon={(color) => (
            <Ionicons name="shield-checkmark-outline" size={24} color={color} />
          )}
          onPress={() => navigation.navigate("GovernmentDocumentList")}
        />
        <FeatureTile
          title="Bank"
          subtitle="Accounts & IFSC codes"
          accent={colors.accentViolet}
          renderIcon={(color) => (
            <Ionicons name="business-outline" size={24} color={color} />
          )}
          onPress={() => navigation.navigate("BankDocumentList")}
        />
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
    },
    lede: {
      fontSize: 16,
      color: colors.textMuted,
      lineHeight: 23,
      marginTop: 4,
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
      marginBottom: 12,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
  });

export default DocumentScreen;
