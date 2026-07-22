/**
 * The 2048 rules, as pure functions — no React, no React Native, no storage.
 * Everything the game screen needs to advance a board lives here, which keeps it
 * trivially reasoned about (and testable in isolation): a move takes a grid and
 * returns a new grid, never mutating the input.
 *
 * A grid is a 4×4 matrix of tile values, with 0 for an empty cell. Tiles slide
 * in the swiped direction, and two equal tiles that collide merge into their
 * sum — each tile merging at most once per move (so 2,2,2,2 → 4,4, never 8).
 */

export const SIZE = 4;

/** 0 = empty cell; any other value is a tile of that number. */
export type Grid = number[][];

export type Direction = "up" | "down" | "left" | "right";

/** Odds a freshly spawned tile is a 4 rather than a 2 — the classic 10%. */
const FOUR_SPAWN_CHANCE = 0.1;

const cloneGrid = (grid: Grid): Grid => grid.map((row) => [...row]);

export const emptyGrid = (): Grid =>
  Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

/** Every empty cell's [row, col], for choosing where to spawn. */
const emptyCells = (grid: Grid): [number, number][] => {
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
};

/**
 * Drops one new tile into a random empty cell (a 2, or a 4 one time in ten).
 * Returns a new grid; if the board is full it returns the grid unchanged, which
 * only happens transiently — a move that filled the last cell is a game over.
 */
export const spawnTile = (grid: Grid): Grid => {
  const cells = emptyCells(grid);
  if (cells.length === 0) return grid;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const next = cloneGrid(grid);
  next[r][c] = Math.random() < FOUR_SPAWN_CHANCE ? 4 : 2;
  return next;
};

/** A fresh board: empty, then seeded with the two starting tiles. */
export const newGame = (): { grid: Grid; score: number } => ({
  grid: spawnTile(spawnTile(emptyGrid())),
  score: 0,
});

/**
 * Slides a single line toward index 0, merging equal neighbours as it goes.
 * Both axes and both directions reduce to this one operation by reversing or
 * transposing first (see `move`). Returns the resulting line and the points the
 * merges scored (the sum of every merged tile, as in the real game).
 */
const slideLine = (line: number[]): { line: number[]; gained: number } => {
  const tiles = line.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const sum = tiles[i] * 2;
      merged.push(sum);
      gained += sum;
      i++; // consume the partner so it can't merge again this move
    } else {
      merged.push(tiles[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { line: merged, gained };
};

const transpose = (grid: Grid): Grid =>
  grid.map((_, c) => grid.map((row) => row[c]));

const gridsEqual = (a: Grid, b: Grid): boolean =>
  a.every((row, r) => row.every((v, c) => v === b[r][c]));

/**
 * Applies a swipe. Returns the new grid, the points gained, and whether
 * anything actually moved — a move that changes nothing must NOT spawn a tile
 * (that would gift a free tile for a no-op swipe), so the caller checks `moved`.
 */
export const move = (
  grid: Grid,
  direction: Direction
): { grid: Grid; gained: number; moved: boolean } => {
  // Normalise every direction to "slide left": right reverses each row, and the
  // vertical moves transpose so columns become rows, then undo it afterwards.
  const horizontal = direction === "left" || direction === "right";
  const reverse = direction === "right" || direction === "down";

  let working = horizontal ? cloneGrid(grid) : transpose(grid);
  let gained = 0;
  working = working.map((row) => {
    const oriented = reverse ? [...row].reverse() : row;
    const slid = slideLine(oriented);
    gained += slid.gained;
    return reverse ? slid.line.reverse() : slid.line;
  });
  const next = horizontal ? working : transpose(working);

  return { grid: next, gained, moved: !gridsEqual(grid, next) };
};

/** True while any legal move remains: an empty cell, or two equal neighbours. */
export const canMove = (grid: Grid): boolean => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
};

export const isGameOver = (grid: Grid): boolean => !canMove(grid);

/** The largest tile on the board — the leaderboard's "best tile" flavour. */
export const highestTile = (grid: Grid): number =>
  Math.max(0, ...grid.flat());

/** True once any tile reaches the target (2048), so the win banner can show. */
export const hasWon = (grid: Grid, target: number): boolean =>
  grid.some((row) => row.some((v) => v >= target));
