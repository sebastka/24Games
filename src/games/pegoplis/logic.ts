// Rules of Pegopolis, as the original pegoplis.exe implements them (see docs/games/pegoplis.md for
// the functions this follows). Pure and immutable: every action returns a new state.

/** A layout as extracted from the original (src/assets/pegoplis/layouts.json). */
export interface Layout {
  name: string;
  width: number;
  height: number;
  /** Unused, straight jumps allowed, diagonal jumps allowed, score layout (else a pattern to make). */
  flags: [boolean, boolean, boolean, boolean];
  start: string[];
  goal?: string[];
  text: string;
}

/**
 * A cell: no square (code 0), or a square of the set's second (codes 1, 3, 5) or first (2, 4, 6)
 * look, empty (1, 2), with a piece of the first type (3, 4) or of the second (5, 6).
 */
export interface Cell {
  square: 0 | 1 | null;
  piece: 0 | 1 | null;
}

export function cellOf(code: number): Cell {
  if (code < 1 || code > 6) return { square: null, piece: null };
  return {
    // The original's board takes codes 2, 4, 6 as its squares "1", drawn with the first picture.
    square: code % 2 === 0 ? 0 : 1,
    piece: code <= 2 ? null : code <= 4 ? 0 : 1,
  };
}

export interface State {
  width: number;
  height: number;
  /** Straight and diagonal jumps allowed. */
  straight: boolean;
  diagonal: boolean;
  /** Score layouts count the pieces left; the others have a goal pattern. */
  score: boolean;
  cells: readonly Cell[];
  /** The goal pattern's cells (pattern layouts). */
  goal: readonly Cell[] | null;
  /** False once over (matched, failed, or no jump left). */
  active: boolean;
  /** Whether a piece was moved (Game › New asks for confirmation then). */
  moved: boolean;
}

const parse = (rows: readonly string[]): Cell[] => rows.flatMap((r) => [...r].map((c) => cellOf(Number(c))));

/** A new game on `layout` (`FUN_004015a0`). */
export function start(layout: Layout): State {
  return {
    width: layout.width,
    height: layout.height,
    straight: layout.flags[1],
    diagonal: layout.flags[2],
    score: layout.flags[3],
    cells: parse(layout.start),
    goal: layout.goal ? parse(layout.goal) : null,
    active: true,
    moved: false,
  };
}

/** Directions 0-7 (`FUN_004028a0`): up, up-right, right, down-right, down, down-left, left, up-left. */
const DIRECTIONS = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;

export interface Point {
  x: number;
  y: number;
}

const index = (state: State, { x, y }: Point) => y * state.width + x;
const inside = (state: State, { x, y }: Point) => x >= 0 && y >= 0 && x < state.width && y < state.height;

/** Whether the piece at `from` can jump in `direction` (`FUN_00402a10`): over a piece, onto an empty square. */
function canJump(state: State, from: Point, direction: number): Point | null {
  const [dx, dy] = DIRECTIONS[direction]!;
  const over = { x: from.x + dx, y: from.y + dy };
  const to = { x: from.x + 2 * dx, y: from.y + 2 * dy };
  if (![from, over, to].every((p) => inside(state, p) && state.cells[index(state, p)]!.square !== null)) return null;
  const [a, b, c] = [from, over, to].map((p) => state.cells[index(state, p)]!.piece);
  return a !== null && b !== null && c === null ? to : null;
}

/** The directions allowed, straight ones first, as the original tries them. */
const directions = (state: State): number[] => [
  ...(state.straight ? [0, 2, 4, 6] : []),
  ...(state.diagonal ? [1, 3, 5, 7] : []),
];

/** Where the piece at `from` can go (the "drop zones", `FUN_00401d40`). */
export const targets = (state: State, from: Point): Point[] =>
  directions(state).flatMap((d) => canJump(state, from, d) ?? []);

/** The pieces that can move (the "drag zones", `FUN_00401a90`). */
export function movable(state: State): Point[] {
  const list: Point[] = [];
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) if (targets(state, { x, y }).length > 0) list.push({ x, y });
  }
  return list;
}

export const piecesLeft = (state: State): number => state.cells.filter((c) => c.piece !== null).length;

/** The goal pattern is matched (`FUN_00402cc0`): its pieces, of their type, and nothing else. */
export const matchesGoal = (state: State): boolean =>
  state.goal !== null && state.goal.every((g, i) => g.piece === state.cells[i]!.piece);

/**
 * Too many pieces gone for the goal (`FUN_00402bc0`): fewer pieces of a type left than the goal
 * has, or as many (but the pattern is not matched).
 */
function tooFew(state: State): boolean {
  const count = (cells: readonly Cell[], type: 0 | 1) => cells.filter((c) => c.piece === type).length;
  return ([0, 1] as const).some((t) => {
    const wanted = count(state.goal!, t);
    return wanted !== 0 && wanted >= count(state.cells, t);
  });
}

/** How a move ended the game, if it did. */
export type Outcome = 'matched' | 'tooMany' | 'failed' | 'stuck' | null;

/**
 * A jump from `from` to `to` (`FUN_00402140`): the piece jumped over goes. Then, on a pattern
 * layout, the match or "too many pieces removed"; then, if no piece can move, the game is over
 * ("failed" to match the pattern, or "stuck" with a score). Null if the jump is not allowed.
 */
export function jump(state: State, from: Point, to: Point): { state: State; outcome: Outcome } | null {
  if (!state.active || !targets(state, from).some((t) => t.x === to.x && t.y === to.y)) return null;
  const cells = [...state.cells];
  const over = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  cells[index(state, to)] = { ...cells[index(state, to)]!, piece: cells[index(state, from)]!.piece };
  cells[index(state, over)] = { ...cells[index(state, over)]!, piece: null };
  cells[index(state, from)] = { ...cells[index(state, from)]!, piece: null };
  const next: State = { ...state, cells, moved: true };
  if (!next.score) {
    if (matchesGoal(next)) return { state: { ...next, active: false }, outcome: 'matched' };
    if (tooFew(next)) return { state: { ...next, active: false }, outcome: 'tooMany' };
  }
  if (movable(next).length === 0) {
    return { state: { ...next, active: false }, outcome: next.score ? 'stuck' : 'failed' };
  }
  return { state: next, outcome: null };
}
