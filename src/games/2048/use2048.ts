import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { gameByKey } from "../../models/GameModel";
import {
  Direction,
  Grid,
  emptyGrid,
  hasWon,
  highestTile,
  isGameOver,
  move,
  newGame,
  spawnTile,
} from "./engine";
import { clearGame, loadGame, saveGame, SavedGame } from "./storage";

/** The winning tile, sourced from the games registry so it stays single-source. */
const TARGET = gameByKey("2048")?.target ?? 2048;

/** What the screen renders around: a live game, a win banner, or game over. */
export type GameStatus = "playing" | "won" | "lost";

/** The best-of-this-game result handed to the leaderboard when a game finishes. */
export type FinishedGame = { score: number; bestTile: number };

type State = SavedGame;

type Action =
  | { type: "swipe"; direction: Direction }
  | { type: "new" }
  | { type: "continue" }
  | { type: "markSubmitted" }
  | { type: "restore"; state: State };

const freshState = (): State => ({
  ...newGame(),
  continued: false,
  submitted: false,
});

/**
 * Pure state transitions — the same discipline as the engine. A swipe that moves
 * nothing returns the state untouched (so it neither scores nor spawns a free
 * tile), and no move is possible once the board is over.
 */
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "swipe": {
      if (isGameOver(state.grid)) return state;
      const { grid, gained, moved } = move(state.grid, action.direction);
      if (!moved) return state;
      return { ...state, grid: spawnTile(grid), score: state.score + gained };
    }
    case "new":
      return freshState();
    case "continue":
      return { ...state, continued: true };
    case "markSubmitted":
      return { ...state, submitted: true };
    case "restore":
      return action.state;
  }
};

/**
 * Owns a 2048 game's whole lifecycle so the screen can stay presentational:
 * board state, the swipe/new/continue actions, resume-from-storage, and firing
 * `onFinish` exactly once per game for the leaderboard.
 *
 * `onFinish` runs the first time a game reaches 2048 *or* becomes unwinnable,
 * whichever comes first — guarded by the persisted `submitted` flag so a game is
 * counted once even if the player continues past 2048, leaves, and resumes it in
 * a later session.
 */
export const use2048 = (
  userId: string | undefined,
  onFinish: (result: FinishedGame) => void
) => {
  // Start empty; the hydrate effect immediately swaps in a restored or fresh
  // game. Starting empty (rather than a fresh game) avoids spawning two tiles we
  // might be about to throw away when a saved board loads.
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    grid: emptyGrid(),
    score: 0,
    continued: false,
    submitted: false,
  }));
  const [hydrated, setHydrated] = useState(false);

  // Latest callback without making the effects depend on its identity.
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Restore the member's saved board, or deal a fresh one. Re-runs if the signed
  // -in member changes (a shared device), so each plays their own game.
  useEffect(() => {
    let active = true;
    setHydrated(false);
    (async () => {
      const saved = userId ? await loadGame(userId) : null;
      if (!active) return;
      dispatch({ type: "restore", state: saved ?? freshState() });
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // Persist after every change: a live board is saved, an over one is cleared so
  // the next visit starts fresh. A won-but-continuing board is still "live", and
  // is saved with its `submitted` flag so resuming it never re-submits.
  useEffect(() => {
    if (!hydrated || !userId) return;
    if (isGameOver(state.grid)) {
      clearGame(userId);
    } else {
      saveGame(userId, state);
    }
  }, [state, hydrated, userId]);

  // Report the result once per game — on the win tile or on game over, first to
  // happen. The persisted `submitted` flag makes this idempotent across resumes.
  useEffect(() => {
    if (!hydrated || state.submitted) return;
    if (isGameOver(state.grid) || hasWon(state.grid, TARGET)) {
      dispatch({ type: "markSubmitted" });
      onFinishRef.current({
        score: state.score,
        bestTile: highestTile(state.grid),
      });
    }
  }, [state, hydrated]);

  const swipe = useCallback(
    (direction: Direction) => dispatch({ type: "swipe", direction }),
    []
  );
  const restart = useCallback(() => dispatch({ type: "new" }), []);
  const continuePlaying = useCallback(() => dispatch({ type: "continue" }), []);

  const status: GameStatus = useMemo(() => {
    if (isGameOver(state.grid)) return "lost";
    if (hasWon(state.grid, TARGET) && !state.continued) return "won";
    return "playing";
  }, [state.grid, state.continued]);

  return {
    grid: state.grid as Grid,
    score: state.score,
    bestTile: highestTile(state.grid),
    status,
    hydrated,
    target: TARGET,
    swipe,
    restart,
    continuePlaying,
  };
};
