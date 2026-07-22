import type { Creatable, Owned } from "./common";

/**
 * The games available in the Games tab. This is the single registry: the picker
 * lists these, the leaderboard keys off `key`, and adding a second game is a
 * matter of appending a row here plus its screen. 2048 is the first (and, for
 * now, only) game.
 *
 * `target` is the tile a player is chasing — 2048 shows it as the win threshold.
 */
export const GAMES = [
  {
    key: "2048",
    label: "2048",
    tagline: "Slide tiles, merge matching numbers, reach 2048.",
    /** Ionicons glyph for the picker card. */
    icon: "grid-outline",
    target: 2048,
  },
] as const;

export type GameKey = (typeof GAMES)[number]["key"];

export const gameByKey = (key: string) =>
  GAMES.find((g) => g.key === key) ?? null;

/**
 * A member's best result at one game — the unit the family leaderboard is built
 * from. There is exactly one row per (member, game): the id is deterministic
 * (`{ownerId}-{gameKey}`, minted in `database/query.ts`), so replaying a game
 * upserts the same row rather than piling up history. A row is always public —
 * a leaderboard everyone can see is the whole point — but stays owner-only to
 * write (RLS), so a member can only ever set their own score.
 *
 * `score` is promoted to a real column so the board sorts in SQL; the rest lives
 * in jsonb. An *in-progress* board is never stored here — that is device-local
 * (see `src/games/2048/storage.ts`); only a finished best score reaches here.
 */
export type GameScoreModel = Owned & {
  id: string;
  gameKey: GameKey;
  /** The member's best score at this game. The figure the board ranks on. */
  score: number;
  /** Highest tile reached in the best game (2048-specific flavour for the row). */
  bestTile: number;
  /** How many games of this one the member has finished. */
  gamesPlayed: number;
  /** When they last finished a game. DATE_FORMAT, display-only. */
  lastPlayedAt: string;
};

export type GameScoreInput = Creatable<GameScoreModel>;
