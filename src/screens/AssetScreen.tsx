import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import FeatureTile from "../components/FeatureTile";
import { useTheme } from "../context/ThemeContext";
import { NavigationProp } from "../utils/Utils";

type Props = {
  navigation: NavigationProp;
};

// Proof-of-concept: this screen is styled with NativeWind (Tailwind) classes
// instead of StyleSheet. The colour tokens (bg-background, text-muted, …) resolve
// to the app's ThemeColors via src/utils/themeVars.ts, so it follows the same
// light/dark toggle. FeatureTile below is still StyleSheet-based — the two
// approaches coexist, so a migration can be incremental.
const AssetScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-5 pb-8"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mt-1 mb-7 text-base leading-[23px] text-muted">
        What the family owns — jewellery by metal, and property with its payments.
      </Text>

      <Text className="mb-3 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted">
        Records
      </Text>

      <View className="flex-row flex-wrap justify-between">
        <FeatureTile
          title="Ornaments"
          subtitle="Gold, silver & stones"
          accent={colors.accentAmber}
          renderIcon={(color) => (
            <Ionicons name="ribbon-outline" size={24} color={color} />
          )}
          onPress={() => navigation.navigate("OrnamentList")}
        />
        <FeatureTile
          title="Properties"
          subtitle="Land, homes & vehicles"
          accent={colors.accentBlue}
          renderIcon={(color) => (
            <Ionicons name="home-outline" size={24} color={color} />
          )}
          onPress={() => navigation.navigate("PropertyList")}
        />
      </View>

      <Text className="mt-7 mb-3 text-[13px] font-semibold uppercase tracking-[0.6px] text-muted">
        Insights
      </Text>

      <FeatureTile
        wide
        title="Overview"
        subtitle="Metal rates, totals & balances"
        accent={colors.accentViolet}
        renderIcon={(color) => (
          <Ionicons name="stats-chart-outline" size={24} color={color} />
        )}
        onPress={() => navigation.navigate("AssetOverview")}
      />
    </ScrollView>
  );
};

export default AssetScreen;
