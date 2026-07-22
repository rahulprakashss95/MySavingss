import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Grid } from "./engine";

/**
 * Device-local persistence for an *in-progress* 2048 board, so a member can
 * leave the tab (or close the app) mid-game and pick the exact same board back
 * up later. 2048 is a long sit-down game; losing the board on a tab switch would
 * be maddening.
 *
 * This is the only thing kept locally — a finished *best score* goes to the
 * cloud leaderboard (see `submitGameScore`), never here. The two never overlap:
 * this holds the live grid, that holds the high score.
 *
 * Keyed by the member's id because a phone or tablet in a family is often
 * shared — each member resumes their own board, never inherits another's. Uses
 * the same AsyncStorage + namespaced-key idiom as the theme/session stores, so
 * it works identically on web (localStorage) and native.
 */

/** Persisted alongside the grid so a resumed game keeps its win/submit state. */
export type SavedGame = {
  grid: Grid;
  score: number;
  /** True once the player chose to keep going past 2048 (hides the win banner). */
  continued: boolean;
  /** True once this game's result has been sent to the leaderboard, so resuming
   * it can never double-count the same game. */
  submitted: boolean;
};

const key = (userId: string) => `@homevault/game-2048/${userId}`;

/** The saved board for a member, or null if there is none / it's unreadable. */
export const loadGame = async (userId: string): Promise<SavedGame | null> => {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGame>;
    // A corrupt or half-written blob must start a fresh game, not crash.
    if (!Array.isArray(parsed.grid) || typeof parsed.score !== "number") {
      return null;
    }
    return {
      grid: parsed.grid as Grid,
      score: parsed.score,
      continued: !!parsed.continued,
      submitted: !!parsed.submitted,
    };
  } catch {
    return null;
  }
};

/** Fire-and-forget save; last write wins (there's no concurrency to guard). */
export const saveGame = (userId: string, game: SavedGame): void => {
  AsyncStorage.setItem(key(userId), JSON.stringify(game)).catch(() => {});
};

/** Drops the saved board — called once a game ends, so the next visit is fresh. */
export const clearGame = (userId: string): void => {
  AsyncStorage.removeItem(key(userId)).catch(() => {});
};
