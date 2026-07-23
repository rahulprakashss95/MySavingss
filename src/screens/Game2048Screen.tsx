import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, tint } from "../utils/Color";
import { showToast } from "../utils/Utils";
import { commitSave, useAppDispatch, useCollectionState } from "../query/hooks";
import { submitGameScore } from "../../database/query";
import { GameScoreModel } from "../models/GameModel";
import Board from "../games/2048/Board";
import { FinishedGame, use2048 } from "../games/2048/use2048";

const GAME_KEY = "2048" as const;

const Game2048Screen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // The member's best score at 2048, from the cached leaderboard, for the HUD.
  const scores = useCollectionState<GameScoreModel>("gameScores");
  const personalBest = useMemo(() => {
    const own = scores.items.find(
      (row) => row.ownerId === user?.id && row.gameKey === GAME_KEY
    );
    return own?.score ?? 0;
  }, [scores.items, user?.id]);

  // Record a finished game on the family leaderboard, updating the cache in
  // place (submitGameScore keeps only the member's best, so a worse game is a
  // harmless no-op to the board).
  const onFinish = useCallback(
    (result: FinishedGame) => {
      dispatch(
        commitSave(
          "gameScores",
          submitGameScore({ gameKey: GAME_KEY, ...result })
        )
      ).catch((error) =>
        showToast("error", "Couldn't save your score", String(error), "bottom")
      );
    },
    [dispatch]
  );

  const game = use2048(user?.id, onFinish);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Stat label="Score" value={game.score} colors={colors} />
        <Stat label="Best tile" value={game.bestTile} colors={colors} />
        <Stat
          label="Your best"
          value={Math.max(personalBest, game.score)}
          colors={colors}
        />
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.hint}>Reach the {game.target} tile.</Text>
        <View style={styles.toolbarButtons}>
          <Pressable
            onPress={() => router.push(`/games/leaderboard?game=${GAME_KEY}`)}
            style={styles.ghostButton}
            accessibilityRole="button"
          >
            <Ionicons name="trophy-outline" size={16} color={colors.primary} />
            <Text style={styles.ghostButtonText}>Leaderboard</Text>
          </Pressable>
          <Pressable
            onPress={game.restart}
            style={styles.primaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>New Game</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.boardWrap}>
        <Board
          grid={game.grid}
          colors={colors}
          disabled={game.status === "lost"}
          onSwipe={game.swipe}
        />

        {game.status === "won" && (
          <Overlay colors={colors}>
            <Text style={styles.overlayTitle}>You made {game.target}! ðŸŽ‰</Text>
            <View style={styles.overlayButtons}>
              <Pressable onPress={game.continuePlaying} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Keep going</Text>
              </Pressable>
              <Pressable onPress={game.restart} style={styles.overlayGhost}>
                <Text style={styles.ghostButtonText}>New Game</Text>
              </Pressable>
            </View>
          </Overlay>
        )}

        {game.status === "lost" && (
          <Overlay colors={colors}>
            <Text style={styles.overlayTitle}>Game over</Text>
            <Text style={styles.overlaySubtitle}>
              Final score {game.score.toLocaleString()}
            </Text>
            <Pressable onPress={game.restart} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>New Game</Text>
            </Pressable>
          </Overlay>
        )}
      </View>

      <Text style={styles.footHint}>
        Swipe to move the tiles. Matching tiles merge into one.
      </Text>
    </View>
  );
};

const Stat = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: ThemeColors;
}) => {
  const styles = createStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    </View>
  );
};

const Overlay = ({
  colors,
  children,
}: {
  colors: ThemeColors;
  children: React.ReactNode;
}) => {
  const styles = createStyles(colors);
  return <View style={styles.overlay}>{children}</View>;
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
      gap: 14,
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
    },
    hud: {
      flexDirection: "row",
      gap: 10,
    },
    stat: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
    },
    statLabel: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: colors.textMuted,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      marginTop: 2,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
      flexShrink: 1,
    },
    toolbarButtons: {
      flexDirection: "row",
      gap: 8,
    },
    ghostButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: tint(colors.primary),
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    ghostButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.onPrimary,
    },
    boardWrap: {
      position: "relative",
      justifyContent: "center",
    },
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.overlay,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 20,
    },
    overlayTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    overlaySubtitle: {
      fontSize: 15,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    overlayButtons: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    overlayGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    footHint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default Game2048Screen;
