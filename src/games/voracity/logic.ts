// Rules of Voracity, as voracity.exe implements them (see docs/games/voracity.md for the
// functions this follows). A board of digits and a target: the target moves towards one of
// its eight neighbours as many squares as that neighbour's digit, eating the squares it crosses;
// it cannot leave the board nor cross an eaten square. One point per square. Pure and immutable.

/** Board sizes (Options › Board Size): 15, 19, 22 or 25 squares a side. */
export const SIZES = [15, 19, 22, 25];

export interface State {
  size: number;
  /** Column by column (`x * size + y`), the digits; 0 for an eaten square. */
  cells: readonly number[];
  /** The target's square. */
  x: number;
  y: number;
  score: number;
}

/** The largest digit of a board: a third of its side, rounded up (`FUN_004083c0`). */
export const maxDigit = (size: number): number => Math.ceil(size / 3);

/**
 * A new board (`FUN_004083c0`): digits 1 to `maxDigit`, drawn row by row (`rand() % max + 1`),
 * then the target's row and column, its square eaten.
 */
export function newGame(size: number, random: () => number): State {
  const max = maxDigit(size);
  const cells = Array<number>(size * size).fill(0);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cells[x * size + y] = Math.floor(random() * max) + 1;
  const y = Math.floor(random() * size);
  const x = Math.floor(random() * size);
  cells[x * size + y] = 0;
  return { size, cells, x, y, score: 0 };
}

export const cell = (s: State, x: number, y: number): number =>
  x >= 0 && y >= 0 && x < s.size && y < s.size ? s.cells[x * s.size + y]! : 0;

/** The eight directions, as the original tries them (`FUN_00408b80`): rows above, the row, below. */
export const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * Whether the target can go towards (dx, dy) (`FUN_00408740`): the neighbour holds a digit n, and
 * the n squares from it on that line are all on the board and not eaten.
 */
export function canMove(s: State, dx: number, dy: number): boolean {
  const n = cell(s, s.x + dx, s.y + dy);
  if (n === 0) return false;
  for (let i = 1; i <= n; i++) if (cell(s, s.x + i * dx, s.y + i * dy) === 0) return false;
  return true;
}

/**
 * The move (`FUN_00409150`): the target's square and the next n − 1 on the line are eaten, the
 * target lands on the n-th (its digit is eaten by the next move), and n points are scored.
 */
export function move(s: State, dx: number, dy: number): State {
  const n = cell(s, s.x + dx, s.y + dy);
  const cells = [...s.cells];
  for (let i = 0; i < n; i++) cells[(s.x + i * dx) * s.size + (s.y + i * dy)] = 0;
  return { ...s, cells, x: s.x + n * dx, y: s.y + n * dy, score: s.score + n };
}

export const isOver = (s: State): boolean => !DIRECTIONS.some(([dx, dy]) => canMove(s, dx, dy));

/** The keys (`FUN_00408740`): the digits as on a numeric keypad, and the arrows. */
export const KEYS: Record<string, readonly [number, number]> = {
  '1': [-1, 1],
  '2': [0, 1],
  '3': [1, 1],
  '4': [-1, 0],
  '6': [1, 0],
  '7': [-1, -1],
  '8': [0, -1],
  '9': [1, -1],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};
