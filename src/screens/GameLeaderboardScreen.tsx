import React, { useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import { useCollectionState, useOwnerName } from "../query/hooks";
import { GameScoreModel, gameByKey } from "../models/GameModel";

/** A rank medal for the top three; a plain number after that. */
const MEDALS = ["🥇", "🥈", "🥉"];

const GameLeaderboardScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ game?: string }>();
  const gameKey = params.game ?? "2048";
  const game = gameByKey(gameKey);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scores = useCollectionState<GameScoreModel>("gameScores");
  const nameOf = useOwnerName();

  // This game's rows, best first. A tie breaks toward the higher tile reached.
  const ranked = useMemo(
    () =>
      scores.items
        .filter((row) => row.gameKey === gameKey)
        .sort((a, b) => b.score - a.score || b.bestTile - a.bestTile),
    [scores.items, gameKey]
  );

  const renderEmpty = () => {
    if (!scores.hasLoaded) return null;
    return (
      <View style={styles.empty}>
        <Ionicons name="trophy-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No scores yet</Text>
        <Text style={styles.emptyBody}>
          Play a game of {game?.label ?? gameKey} to get on the board.
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={ranked}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={scores.isRefreshing}
          onRefresh={scores.onRefresh}
          tintColor={colors.textMuted}
        />
      }
      renderItem={({ item, index }) => {
        const isMe = item.ownerId === user?.id;
        return (
          <View style={[styles.row, isMe && styles.rowMe]}>
            <Text style={styles.rank}>{MEDALS[index] ?? index + 1}</Text>
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                {nameOf(item.ownerId) || "Member"}
                {isMe ? " (you)" : ""}
              </Text>
              <Text style={styles.meta}>
                Best tile {item.bestTile.toLocaleString()} ·{" "}
                {item.gamesPlayed} {item.gamesPlayed === 1 ? "game" : "games"}
              </Text>
            </View>
            <Text style={styles.score}>{item.score.toLocaleString()}</Text>
          </View>
        );
      }}
    />
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
      gap: 10,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    rowMe: {
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
    },
    rank: {
      width: 28,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    score: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.primary,
      fontVariant: ["tabular-nums"],
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingBottom: 60,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
      marginTop: 14,
    },
    emptyBody: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
  });

export default GameLeaderboardScreen;
