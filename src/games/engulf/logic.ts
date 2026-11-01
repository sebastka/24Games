// Rules of Engulf and its computer player, as the original engulf.exe implements them (see
// docs/games/engulf.md for the functions this follows). Pure: every action returns a new board.

export const SIZE = 7;

/** A square's content, as the computer's engine encodes it. */
export const EMPTY = 0;
export const PLAYER = 1;
export const COMPUTER = 2;
export const BLOCKED = 3;
export type Side = typeof PLAYER | typeof COMPUTER;

/** 49 squares, column by column (index = x × 7 + y), as the engine keeps them. */
export type Board = readonly number[];

/** MSVC's `rand()`: an integer in 0…32767. */
export type Rand = () => number;

export interface Move {
  from: number;
  to: number;
  /** Two squares away: the piece leaves its square (otherwise it is copied). */
  jump: boolean;
}

export const at = (x: number, y: number): number => x * SIZE + y;
export const xOf = (i: number): number => Math.floor(i / SIZE);
export const yOf = (i: number): number => i % SIZE;
export const other = (side: Side): Side => (side === PLAYER ? COMPUTER : PLAYER);

/**
 * A new game on a layout (7 rows of '#' for blocked squares and '.', `FUN_00401b30`): the
 * player's pieces in the top-left and bottom-right corners, the computer's in the others.
 */
export function startBoard(layout: readonly string[]): Board {
  const board = new Array<number>(SIZE * SIZE).fill(EMPTY);
  layout.forEach((row, y) => [...row].forEach((c, x) => c === '#' && (board[at(x, y)] = BLOCKED)));
  board[at(0, 0)] = PLAYER;
  board[at(6, 6)] = PLAYER;
  board[at(6, 0)] = COMPUTER;
  board[at(0, 6)] = COMPUTER;
  return board;
}

/**
 * The moves of `side` in the engine's order (`FUN_00405669`): pieces column by column, and for
 * each the empty squares at most two away, row by row.
 */
export function moves(board: ArrayLike<number>, side: number): Move[] {
  const out: Move[] = [];
  for (let a = 0; a < SIZE; a++) {
    for (let b = 0; b < SIZE; b++) {
      if (board[a * SIZE + b] !== side) continue;
      for (let b2 = b - 2; b2 <= b + 2; b2++) {
        for (let a2 = a - 2; a2 <= a + 2; a2++) {
          if (a2 < 0 || a2 >= SIZE || b2 < 0 || b2 >= SIZE || (a2 === a && b2 === b)) continue;
          if (board[a2 * SIZE + b2] !== EMPTY) continue;
          out.push({ from: a * SIZE + b, to: a2 * SIZE + b2, jump: Math.abs(a2 - a) === 2 || Math.abs(b2 - b) === 2 });
        }
      }
    }
  }
  return out;
}

/** Whether `side` can move (`FUN_004037c0`). */
export function hasMove(board: ArrayLike<number>, side: number): boolean {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] !== side) continue;
    const x = xOf(i);
    const y = yOf(i);
    for (let y2 = Math.max(0, y - 2); y2 <= Math.min(6, y + 2); y2++) {
      for (let x2 = Math.max(0, x - 2); x2 <= Math.min(6, x + 2); x2++) {
        if (board[x2 * SIZE + y2] === EMPTY) return true;
      }
    }
  }
  return false;
}

/** The opposing pieces around `to`, in the order the window turns them (rows, then columns). */
export function captures(board: Board, to: number, side: Side): number[] {
  const out: number[] = [];
  const x = xOf(to);
  const y = yOf(to);
  for (let y2 = y - 1; y2 <= y + 1; y2++) {
    for (let x2 = x - 1; x2 <= x + 1; x2++) {
      if (x2 >= 0 && x2 < SIZE && y2 >= 0 && y2 < SIZE && board[at(x2, y2)] === other(side)) out.push(at(x2, y2));
    }
  }
  return out;
}

/** `side` plays `move` (`FUN_004057e0`, `FUN_00402fc0`): the piece lands, its neighbours turn. */
export function play(board: Board, move: Move, side: Side): Board {
  const next = [...board];
  for (const c of captures(board, move.to, side)) next[c] = side;
  next[move.to] = side;
  if (move.jump) next[move.from] = EMPTY;
  return next;
}

export const count = (board: Board, side: Side): number => board.filter((c) => c === side).length;

// The computer (`FUN_00404f50`): a negamax `skill` plies deep.

const WIN = 10000;

function apply(board: Int8Array, side: number, m: Move): void {
  board[m.to] = side;
  if (m.jump) board[m.from] = EMPTY;
  const opp = side === PLAYER ? COMPUTER : PLAYER;
  const a = Math.floor(m.to / SIZE);
  const b = m.to % SIZE;
  for (let da = -1; da <= 1; da++) {
    for (let db = -1; db <= 1; db++) {
      const a2 = a + da;
      const b2 = b + db;
      if (a2 >= 0 && a2 < SIZE && b2 >= 0 && b2 < SIZE && board[a2 * SIZE + b2] === opp) board[a2 * SIZE + b2] = side;
    }
  }
}

/**
 * The value of a position for `side` (to move) once the depth is reached: a win (10000) when the
 * board is full and it leads, or when the other side has no piece left; a loss (−10000) without
 * pieces; otherwise the piece difference.
 */
function evaluate(board: Int8Array, side: number): number {
  let mine = 0;
  let theirs = 0;
  let empty = 0;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const c = board[i];
    if (c === side) mine++;
    else if (c === EMPTY) empty++;
    else if (c !== BLOCKED) theirs++;
  }
  if (empty === 0 && mine > theirs) return WIN;
  if (theirs === 0) return WIN;
  if (mine === 0) return -WIN;
  return mine - theirs;
}

/**
 * The search (`FUN_004058b0`): negamax, a reply at least as good as `beta` cuts the branch (no
 * other bound), a side without moves has lost (no passing inside the search).
 */
function search(board: Int8Array, side: number, depth: number, beta: number, maxDepth: number): number {
  if (depth === maxDepth) return evaluate(board, side);
  const list = moves(board, side);
  if (list.length === 0) return -WIN;
  const opp = side === PLAYER ? COMPUTER : PLAYER;
  let best = -WIN;
  for (const m of list) {
    const child = board.slice();
    apply(child, side, m);
    const v = -search(child, opp, depth + 1, -best, maxDepth);
    if (v > best) best = v;
    if (best >= beta) break;
  }
  return best;
}

/** Every move of the computer with its value, `skill` (1-4) plies deep. */
export function scoreMoves(board: Board, skill: number): Scored {
  const root = Int8Array.from(board);
  return moves(root, COMPUTER).map((move) => {
    const child = root.slice();
    apply(child, COMPUTER, move);
    return { move, score: -search(child, PLAYER, 1, WIN, skill) };
  });
}

export type Scored = { move: Move; score: number }[];

/**
 * The computer's choice among scored moves (`FUN_00404f50`), or null if it has none. Among the
 * best moves it draws, as the original: first `rand()` over the best moves in turn until an
 * even number comes up (the result is not used), then one of the best copies at random, or of
 * the best jumps if there is no copy.
 */
export function chooseMove(scored: Scored, rand: Rand): Move | null {
  if (scored.length === 0) return null;
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best).map((s) => s.move);
  // One draw per best move, in turn, until an even one: in effect, draws until an even one.
  while (rand() % 2 !== 0);
  const copies = top.filter((m) => !m.jump);
  const pool = copies.length > 0 ? copies : top;
  return pool[rand() % pool.length]!;
}

/** The computer's move, `skill` (1-4) plies deep, or null if it has none. */
export const computerMove = (board: Board, skill: number, rand: Rand): Move | null =>
  chooseMove(scoreMoves(board, skill), rand);
