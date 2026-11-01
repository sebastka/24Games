// Rules of Quinto, as the original quinto.exe implements them (see docs/games/quinto.md for the
// functions this follows). Pure and immutable: every action returns a new state.

export const MIN_SIZE = 5;
export const MAX_SIZE = 8;

export interface State {
  width: number;
  height: number;
  /** Row-major: true for a piece still of the first type (to be changed), false once changed. */
  pieces: readonly boolean[];
  moves: number;
  /** False once solved: clicks beep. */
  active: boolean;
}

/** A new game (`FUN_004087b0`): every piece of the first type. */
export const start = (width: number, height: number): State => ({
  width,
  height,
  pieces: new Array<boolean>(width * height).fill(true),
  moves: 0,
  active: true,
});

export const isSolved = (state: State): boolean => state.pieces.every((p) => !p);

/** A click on (`x`, `y`) (`FUN_00408a30`): that piece and the four next to it change; one move more. */
export function flip(state: State, x: number, y: number): State {
  const pieces = [...state.pieces];
  for (const [dx, dy] of [
    [0, 0],
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ] as const) {
    const [px, py] = [x + dx, y + dy];
    if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
      pieces[py * state.width + px] = !pieces[py * state.width + px];
    }
  }
  const next = { ...state, pieces, moves: state.moves + 1 };
  return isSolved(next) ? { ...next, active: false } : next;
}

/** The board's top-left corner (`FUN_004087b0`): centred in the 342-pixel square on the left. */
export const origin = (state: Pick<State, 'width' | 'height'>) => ({
  x: 171 - 20 * state.width,
  y: 171 - 20 * state.height,
});

/** The square at (`x`, `y`) of the window (`FUN_00407c80`), or null. */
export function squareAt(state: Pick<State, 'width' | 'height'>, x: number, y: number) {
  const o = origin(state);
  const [col, row] = [Math.floor((x - o.x) / 40), Math.floor((y - o.y) / 40)];
  return x >= o.x && y >= o.y && col < state.width && row < state.height ? { col, row } : null;
}

/** The fewest moves for each board (by its number of squares), as the original knows them. */
const PERFECT: Record<number, number> = {
  25: 15,
  30: 14,
  35: 13,
  36: 28,
  40: 21,
  42: 26,
  48: 26,
  49: 33,
  56: 32,
  64: 40,
};

export const perfectScore = (width: number, height: number): number => PERFECT[width * height] ?? 0;

/** The second line of the victory dialog: "Perfect Score!" when the moves are no more than the fewest. */
export const perfectText = (state: State): string => {
  const perfect = perfectScore(state.width, state.height);
  return state.moves > perfect ? `Perfect Score : ${perfect}` : 'Perfect Score!';
};

/**
 * The high score table of a board (`FUN_00408f00`): one per number of squares, so 5×8 and 8×5
 * share theirs.
 */
const TABLES: Record<number, number> = { 25: 0, 30: 1, 35: 2, 40: 3, 36: 4, 42: 5, 48: 6, 49: 7, 56: 8, 64: 9 };

export const tableOf = (width: number, height: number): number => TABLES[width * height] ?? 0;

/** The squares to click to solve a board from the start (for tests): Gaussian elimination mod 2. */
export function solve(width: number, height: number): boolean[] | null {
  const n = width * height;
  // Row i: which presses change square i, then the right-hand side (every square must change).
  const rows = Array.from({ length: n }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    const [x, y] = [i % width, Math.floor(i / width)];
    for (const [dx, dy] of [
      [0, 0],
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const [px, py] = [x + dx!, y + dy!];
      if (px >= 0 && px < width && py >= 0 && py < height) row[py * width + px] = 1;
    }
    row[n] = 1;
    return row;
  });
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < n; c++) {
    const p = rows.findIndex((row, i) => i >= r && row[c] === 1);
    if (p < 0) continue;
    [rows[r], rows[p]] = [rows[p]!, rows[r]!];
    for (let i = 0; i < n; i++) {
      if (i !== r && rows[i]![c] === 1) rows[i] = rows[i]!.map((v, j) => v ^ rows[r]![j]!);
    }
    pivots.push(c);
    r++;
  }
  if (rows.slice(r).some((row) => row[n] === 1)) return null;
  const presses = new Array<boolean>(n).fill(false);
  pivots.forEach((c, i) => (presses[c] = rows[i]![n] === 1));
  return presses;
}
