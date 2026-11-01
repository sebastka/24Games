// Rules of Reversi Plus and its computer player, as the original reversi.exe implements them (see
// docs/games/reversi.md for the functions this follows). Pure: every action returns a new board.

/** A square's content: the player's piece, the computer's, or nothing (the AI's own encoding). */
export const PLAYER = 1;
export const COMPUTER = -1;
export const EMPTY = 0;
export type Side = typeof PLAYER | typeof COMPUTER;

/** 64 squares, row by row (index = y * 8 + x). */
export type Board = readonly number[];

/** MSVC's `rand()`: an integer in 0…32767. Injected so that games and tests can be replayed. */
export type Rand = () => number;

/** The C runtime's `rand()`, seeded like `srand(seed)`: what the original draws its numbers from. */
export function msvcRand(seed: number): Rand {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 0x343fd) + 0x269ec3) >>> 0;
    return (state >>> 16) & 0x7fff;
  };
}

/**
 * The start position (`FUN_0040a3d0`): the four centre squares, crossed (the default: the computer
 * on d4 and e5) or side by side (the player's pieces in column d, the computer's in column e).
 */
export function startBoard(crossed: boolean): Board {
  const board = new Array<number>(64).fill(EMPTY);
  for (const [x, y] of [
    [3, 3],
    [4, 3],
    [3, 4],
    [4, 4],
  ] as const) {
    board[y * 8 + x] = crossed ? ((x + y) % 2 === 0 ? COMPUTER : PLAYER) : x === 3 ? PLAYER : COMPUTER;
  }
  return board;
}

// The eight directions as index steps, in the AI's order (`FUN_0040cb60` is called with each).
const DIRECTIONS = [-9, -8, -7, -1, 1, 7, 8, 9];

/**
 * The squares `side` flips in direction `dir` by playing on `square` (`FUN_0040cb60`): a run of
 * opposing pieces closed by one of its own. The number of squares available that way is the
 * smaller of the rows and the columns left, which keeps runs from wrapping around the edges.
 */
function run(board: ArrayLike<number>, square: number, dir: number, side: number): number {
  if (board[square + dir] !== -side) return 0;
  const row = square >> 3;
  const col = square & 7;
  const rows = dir < -1 ? row : dir <= 1 ? 8 : 7 - row;
  const cols = (dir & 4) !== 0 ? col : (dir & 1) !== 0 ? 7 - col : 8;
  let steps = Math.min(rows, cols);
  if (steps < 2) return 0;
  let count = 1;
  let at = square + dir;
  while (--steps !== 0) {
    at += dir;
    const piece = board[at];
    if (piece === EMPTY) return 0;
    if (piece === side) return count;
    count++;
  }
  return 0;
}

/** Whether `side` may play on `square`: an empty square that flips at least one piece. */
export function isLegal(board: ArrayLike<number>, square: number, side: number): boolean {
  return board[square] === EMPTY && DIRECTIONS.some((dir) => run(board, square, dir, side) > 0);
}

/** The squares `side` may play on, in board order. */
export const legalMoves = (board: Board, side: Side): number[] =>
  board.flatMap((_, square) => (isLegal(board, square, side) ? [square] : []));

export const hasMove = (board: ArrayLike<number>, side: number): boolean =>
  ORDER.some((square) => isLegal(board, square, side));

/**
 * The pieces a move flips, in the order the game window turns them over (`FUN_0040b1c0`): its
 * directions go clockwise from up, each run from the new piece outwards.
 */
export function flips(board: Board, square: number, side: Side): number[] {
  const out: number[] = [];
  for (const dir of [-8, -7, 1, 9, 8, 7, -1, -9]) {
    const n = run(board, square, dir, side);
    for (let i = 1; i <= n; i++) out.push(square + i * dir);
  }
  return out;
}

/** `side` plays on `square`: the new board. */
export function play(board: Board, square: number, side: Side): Board {
  const next = [...board];
  next[square] = side;
  for (const f of flips(board, square, side)) next[f] = side;
  return next;
}

export const count = (board: Board, side: Side): number => board.filter((p) => p === side).length;

// The computer player (`FUN_0040c530`, behind the window's "string in, string out" engine object).

/** Search depth per skill level (Easy, Moderate, Difficult, Expert), at 0x414334. */
export const DEPTHS = [1, 2, 4, 5];

/** The order in which the search tries the squares (a linked list at 0x415230): corners first. */
export const ORDER = [
  0, 7, 56, 63, 2, 5, 16, 23, 40, 47, 58, 61, 3, 4, 24, 31, 32, 39, 59, 60, 18, 21, 42, 45, 19, 20, 26, 29, 34, 37, 43,
  44, 27, 28, 35, 36, 10, 13, 17, 22, 41, 46, 50, 53, 11, 12, 25, 30, 33, 38, 51, 52, 1, 6, 8, 15, 48, 55, 57, 62, 9,
  14, 49, 54,
];

/** The value of each square (at 0x415338). */
export const WEIGHTS = [
  100, -30, 20, 20, 20, 20, -30, 100, -30, -50, -7, -7, -7, -7, -50, -30, 20, -7, 1, 1, 1, 1, -7, 20, 20, -7, 1, 1, 1,
  1, -7, 20, 20, -7, 1, 1, 1, 1, -7, 20, 20, -7, 1, 1, 1, 1, -7, 20, -30, -50, -7, -7, -7, -7, -50, -30, 100, -30, 20,
  20, 20, 20, -30, 100,
];

/** A won (lost) game is worth this much plus (minus) the piece difference. */
const WIN = 9936;
/** Beyond any evaluation: the search's "cut this branch" value. */
const INFINITE = 10000;

/** The AI's board: 64 squares, then the number of empty squares (as the original keeps it). */
type Position = Int8Array;

function position(board: Board): Position {
  const p = new Int8Array(65);
  p.set(board);
  p[64] = board.filter((s) => s === EMPTY).length;
  return p;
}

function child(p: Position, square: number, side: number): Position {
  const next = p.slice();
  next[square] = side;
  for (const dir of DIRECTIONS) {
    const n = run(p, square, dir, side);
    for (let i = 1; i <= n; i++) next[square + i * dir] = side;
  }
  next[64] = p[64]! - 1;
  return next;
}

/** The next square after position `from` of ORDER that `side` may play on, or -1 (at the end). */
function nextMove(p: Position, from: number, side: number): number {
  for (let i = from + 1; i < ORDER.length; i++) if (isLegal(p, ORDER[i]!, side)) return i;
  return -1;
}

const isOver = (p: Position): boolean => p[64] === 0 || (!hasMove(p, COMPUTER) && !hasMove(p, PLAYER));

/**
 * The pieces that can no longer be taken, roughly (`FUN_0040d3b0`): from each corner, the run of
 * its colour along the edge, row by row towards the middle, each row no longer than the one before.
 * They are worth 50 (the corner 100) for their owner instead of the square's weight.
 */
function anchored(p: Position): Int32Array {
  const out = new Int32Array(64);
  const corner = (start: number, rowStep: number, colStep: number) => {
    const side = p[start]!;
    if (side === EMPTY) return;
    let limit = 7;
    for (let r = 0; r < 7; r++) {
      const first = start + r * rowStep;
      if (p[first] !== side) break;
      out[first] = side * 50;
      let c = 1;
      while (c < limit && p[first + c * colStep] === side) {
        out[first + c * colStep] = side * 50;
        c++;
      }
      if (c < limit) limit = c;
    }
    out[start] = side * 100;
  };
  corner(0, 8, 1);
  corner(7, 8, -1);
  corner(56, -8, 1);
  corner(63, -8, -1);
  return out;
}

/**
 * The value of a position for the player, positive when the player leads (`FUN_0040d150`): at the
 * end of the game the piece difference ± 9936, otherwise the weights of the squares held.
 */
function evaluate(p: Position): number {
  let sum = 0;
  if (isOver(p)) {
    for (let i = 0; i < 64; i++) sum += p[i]!;
    return sum > 0 ? sum + WIN : sum < 0 ? sum - WIN : 0;
  }
  const fixed = anchored(p);
  for (let i = 0; i < 64; i++) sum += fixed[i] !== 0 ? fixed[i]! : WEIGHTS[i]! * p[i]!;
  return sum;
}

interface Context {
  rand: Rand;
  /** The evaluation of the position the computer is thinking about. */
  root: number;
  /** A tenth of it: a move this much better than the start is taken without looking further. */
  margin: number;
}

/**
 * The search (`FUN_0040cc70`): a minimax in which a reply at least as good for its side as the
 * parent's best so far cuts the parent's branch (returning ±10000), a move clearly better than
 * the root's value is taken at once, and equal moves replace each other on a coin toss
 * (`rand() & 0x10`). Values are from the player's side; `side` is the one to move.
 * `best.move` receives the index in ORDER of the move chosen.
 */
function search(p: Position, depth: number, bound: number, side: number, best: { move: number }, ctx: Context): number {
  if (depth === 0 || isOver(p)) {
    const v = evaluate(p);
    best.move = -1;
    return side * v > side * bound ? side * INFINITE : v;
  }
  let value = -side * INFINITE;
  const reply = { move: -1 };
  let at = -1;
  let next: Position;
  let nextDepth: number;
  // Good enough to stop looking: at depth 1 and 2 only a win, otherwise 10 % above the root.
  let enough = 0;
  if (hasMove(p, side)) {
    enough = depth < 3 ? WIN : ctx.margin + side * ctx.root;
    at = nextMove(p, -1, side);
    next = child(p, ORDER[at]!, side);
    nextDepth = depth - 1;
  } else {
    // A pass: the other side moves on the same position, at the same depth.
    next = p;
    nextDepth = depth;
  }
  for (;;) {
    const v = search(next, nextDepth, value, -side, reply, ctx);
    const mine = v * side;
    if (side * bound <= mine) return side * INFINITE;
    if (enough < mine) {
      best.move = at;
      return v;
    }
    if (side * value < mine) {
      best.move = at;
      value = v;
    }
    if (v === value && (ctx.rand() & 0x10) !== 0) best.move = at;
    if (at < 0) return value;
    at = nextMove(p, at, side);
    if (at < 0) return value;
    next = child(p, ORDER[at]!, side);
    nextDepth = depth - 1;
  }
}

/**
 * The computer's move (`FUN_0040ace0` then `FUN_0040c530`), or -1 if it has none. The depth of
 * its skill level gets one more ply 2 times in 10 and two more 1 time in 10; near the end
 * (fewer than 11 empty squares, at most three times the depth) it searches to the end.
 */
export function computerMove(board: Board, skill: number, rand: Rand): number {
  const roll = rand() % 10;
  let depth = DEPTHS[skill - 1]! + (roll > 8 ? 2 : roll > 6 ? 1 : 0);
  const p = position(board);
  const first = nextMove(p, -1, COMPUTER);
  if (first < 0) return -1;
  // A single move is played without thinking.
  if (nextMove(p, first, COMPUTER) < 0) return ORDER[first]!;
  const empty = p[64]!;
  if (empty < 11 && empty <= depth * 3) depth = empty;
  const root = evaluate(p);
  const best = { move: first };
  search(p, depth, -INFINITE, COMPUTER, best, { rand, root, margin: Math.abs(Math.trunc(root / 10)) });
  return ORDER[best.move]!;
}
