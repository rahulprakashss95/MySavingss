import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import { useCollectionState } from "../query/hooks";
import { GAMES, GameScoreModel } from "../models/GameModel";

/**
 * The Games landing: a card per game in the `GAMES` registry. Open to every
 * signed-in member (no tile-gating — a game is a social, family-wide thing, not
 * a vault module), so it needs no access checks. Each card shows the member's
 * own best and offers Play / Leaderboard.
 */
const GamesScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scores = useCollectionState<GameScoreModel>("gameScores");
  const bestFor = (gameKey: string) =>
    scores.items.find(
      (row) => row.ownerId === user?.id && row.gameKey === gameKey
    )?.score ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {GAMES.map((game) => (
        <View key={game.key} style={styles.card}>
          <Pressable
            style={styles.cardMain}
            onPress={() => router.push(`/games/${game.key}`)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${game.label}`}
          >
            <View style={styles.iconChip}>
              <Ionicons name={game.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{game.label}</Text>
              <Text style={styles.cardTagline}>{game.tagline}</Text>
              <Text style={styles.cardBest}>
                Your best: {bestFor(game.key).toLocaleString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.leaderboardRow}
            onPress={() => router.push(`/games/leaderboard?game=${game.key}`)}
            accessibilityRole="button"
            accessibilityLabel={`${game.label} leaderboard`}
          >
            <Ionicons name="trophy-outline" size={15} color={colors.primary} />
            <Text style={styles.leaderboardText}>Family leaderboard</Text>
          </Pressable>
        </View>
      ))}
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
      padding: 16,
      gap: 14,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      overflow: "hidden",
    },
    cardMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
    },
    iconChip: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: tint(colors.primary),
      alignItems: "center",
      justifyContent: "center",
    },
    cardText: {
      flex: 1,
      gap: 3,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    cardTagline: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    cardBest: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
      marginTop: 2,
      fontVariant: ["tabular-nums"],
    },
    leaderboardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    leaderboardText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
  });

export default GamesScreen;
