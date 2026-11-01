// Rules of Core Meltdown and its computer player, as the original meltdown.exe implements them
// (see docs/games/meltdown.md for the functions this follows). Pure: every action returns a new
// board.

export const PLAYER = 0;
export const COMPUTER = 1;
export type Side = typeof PLAYER | typeof COMPUTER;

/**
 * N×N squares, row by row (index = y × N + x), as the original encodes them: 0 empty, 1-10 the
 * player's with that many units, 11-20 the computer's with (value − 10) units.
 */
export type Board = readonly number[];

/** MSVC's `rand()`: an integer in 0…32767. */
export type Rand = () => number;

export const sizeOf = (board: ArrayLike<number>): number => Math.round(Math.sqrt(board.length));
export const units = (v: number): number => (v > 10 ? v - 10 : v);
/** The side owning a square, or null if it is empty. */
export const ownerOf = (v: number): Side | null => (v === 0 ? null : v > 10 ? COMPUTER : PLAYER);

export const emptyBoard = (n: number): Board => new Array<number>(n * n).fill(0);

/** How many units make a square explode (`FUN_00402f00`): 2 in a corner, 3 on an edge, 4 inside. */
export function critical(n: number, i: number): number {
  const x = i % n;
  const y = Math.floor(i / n);
  const edges = (x === 0 || x === n - 1 ? 1 : 0) + (y === 0 || y === n - 1 ? 1 : 0);
  return 4 - edges;
}

/** The squares around `i`, up, right, down, left (the order explosions go in). */
function neighbours(n: number, i: number): number[] {
  const x = i % n;
  const y = Math.floor(i / n);
  const out: number[] = [];
  if (y > 0) out.push(i - n);
  if (x < n - 1) out.push(i + 1);
  if (y < n - 1) out.push(i + n);
  if (x > 0) out.push(i - 1);
  return out;
}

/** Total units of each side (the scores). */
export function totals(board: ArrayLike<number>): { player: number; computer: number } {
  let player = 0;
  let computer = 0;
  for (let i = 0; i < board.length; i++) {
    const v = board[i]!;
    if (v > 10) computer += v - 10;
    else player += v;
  }
  return { player, computer };
}

/** What a unit landing on a square did, for its sound. */
export type Event = 'Player Expands' | 'Player Captures' | 'Computer Expands' | 'Computer Captures';

/** A unit of `side` lands on square `i` (`FUN_00402c30`): it grows the square or takes it. */
function addUnit(b: number[], i: number, side: Side, events: Event[]): void {
  const v = b[i]!;
  if (side === PLAYER) {
    if (v < 10) {
      b[i] = v + 1;
      events.push('Player Expands');
    } else if (v > 10) {
      // The computer's n units become the player's n + 1.
      b[i] = v - 9;
      events.push('Player Captures');
    }
  } else if (v > 10) {
    b[i] = v + 1;
    events.push('Computer Expands');
  } else if (v === 0) {
    b[i] = 11;
    events.push('Computer Expands');
  } else {
    b[i] = v + 11;
    events.push('Computer Captures');
  }
}

/**
 * The chain reaction from square `i` (`FUN_004028b0`): a square with at least its critical mass
 * empties, a unit of its owner goes to each neighbour, which may explode in turn (depth first).
 * It stops as soon as exactly one side has no units left.
 */
function react(b: number[], n: number, i: number, events: Event[]): void {
  const side: Side = b[i]! > 10 ? COMPUTER : PLAYER;
  const { player, computer } = totals(b);
  if ((player === 0) !== (computer === 0)) return;
  if (units(b[i]!) < critical(n, i)) return;
  b[i] = 0;
  for (const j of neighbours(n, i)) {
    addUnit(b, j, side, events);
    react(b, n, j, events);
  }
}

/**
 * The player clicks square `i` (`FUN_00402180`): one more unit there (whoever owns it: the
 * original lets the player click the computer's first square, see `clickable`), then the chain
 * reaction.
 */
export function playerPlace(board: Board, i: number): { board: Board; events: Event[] } {
  const b = [...board];
  b[i] = b[i]! + 1;
  const events: Event[] = [];
  react(b, sizeOf(b), i, events);
  return { board: b, events };
}

/** The computer places a unit on square `i`, then the chain reaction. */
export function computerPlace(board: Board, i: number): { board: Board; events: Event[] } {
  const b = [...board];
  b[i] = b[i] === 0 ? 11 : b[i]! + 1;
  const events: Event[] = [];
  react(b, sizeOf(b), i, events);
  return { board: b, events };
}

/** The squares the player may click (`FUN_00401dd0`): empty or its own. */
export const clickable = (board: Board): boolean[] => board.map((v) => v < 11);

// The computer (`FUN_004045e0`, behind the window's "string in, string out" engine object).

const WIN = 10000;

interface Engine {
  n: number;
  depth: number;
  crit: number[];
}

/** The engine's moves (`FUN_00404d10`): empty squares and the side's own, row by row. */
function engineMoves(b: ArrayLike<number>, side: Side): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.length; i++) {
    const v = b[i]!;
    if (v === 0 || (side === PLAYER ? v < 11 : v > 10)) out.push(i);
  }
  return out;
}

/** The engine's unit (`FUN_00404e40`): grows or takes the square, without sound or cap. */
function engineAdd(b: number[], i: number, side: Side): void {
  const v = b[i]!;
  b[i] = v < 11 ? v + (side === COMPUTER ? 11 : 1) : v + (side === COMPUTER ? 1 : -9);
}

/** Whether a side is wiped out (`FUN_00404ef0`), counting squares: one side none, the other two or more. */
function wiped(b: ArrayLike<number>): boolean {
  let pc = 0;
  let cc = 0;
  for (let i = 0; i < b.length; i++) {
    const v = b[i]!;
    if (v > 10) cc++;
    else if (v > 0) pc++;
  }
  if (pc !== 0 && cc !== 0) return false;
  return pc >= 2 || cc >= 2;
}

/** The engine's chain reaction (`FUN_00405010`). */
function engineExplode(e: Engine, b: number[], side: Side, i: number): void {
  if (wiped(b)) return;
  if (e.crit[i]! > units(b[i]!)) return;
  b[i] = 0;
  for (const j of neighbours(e.n, i)) {
    engineAdd(b, j, side);
    engineExplode(e, b, side, j);
  }
}

/**
 * The evaluation for `side` (in `FUN_00405370`, at 0x40555e-0x405a2e): for each square with
 * units, k = (4 − its critical mass) + its units, counted twice for its owner (A for `side`, B
 * for the other); and for each neighbour not of `side`'s class (an empty square counts as the
 * player's), k, less that neighbour's own k when it has units (E). A side without units has lost.
 */
function evaluate(e: Engine, b: ArrayLike<number>, side: Side): number {
  const { n, crit } = e;
  let a = 0;
  let bb = 0;
  let edge = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const v = b[i]!;
      const u = units(v);
      if (u === 0) continue;
      const k = 4 - crit[i]! + u;
      if ((v > 10 ? 1 : 0) === side) a += k + u;
      else bb += k + u;
      const around = [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1];
      for (const j of around) {
        if (j < 0) continue;
        const nv = b[j]!;
        if ((nv > 10 ? 1 : 0) === side) continue;
        const nu = units(nv);
        edge += nu === 0 ? k : k - (4 - crit[j]! + nu);
      }
    }
  }
  if (a === 0) return -WIN;
  if (bb === 0) return WIN;
  return 2 * a + edge - 2 * bb;
}

/**
 * The search (`FUN_00405370`): negamax to the skill level's depth, a reply at least as good as
 * `beta` cutting the branch. Inside the search a move only sets off the square's reaction
 * without adding the unit (as the original: a square below its critical mass is left as it is).
 */
function search(e: Engine, b: number[], side: Side, depth: number, beta: number): number {
  if (depth === e.depth) return evaluate(e, b, side);
  let best = -WIN;
  for (const m of engineMoves(b, side)) {
    const s = [...b];
    engineExplode(e, s, side, m);
    const v = -search(e, s, side === PLAYER ? COMPUTER : PLAYER, depth + 1, -best);
    if (v > best) best = v;
    if (best >= beta) return best;
  }
  return best;
}

/**
 * The computer's square (`FUN_004045e0`), searching `skill` (1-4) plies: each of its moves is
 * played (unit and reaction) and searched; one of the best is drawn with a single `rand()`.
 * -1 without a move.
 */
export function computerMove(board: Board, skill: number, rand: Rand): number {
  const n = sizeOf(board);
  const e: Engine = { n, depth: skill, crit: board.map((_, i) => critical(n, i)) };
  const list = engineMoves(board, COMPUTER);
  const scores = list.map((m) => {
    const s = [...board];
    engineAdd(s, m, COMPUTER);
    engineExplode(e, s, COMPUTER, m);
    return -search(e, s, PLAYER, 1, WIN);
  });
  if (list.length === 0) return -1;
  const best = Math.max(-WIN, ...scores);
  const top = list.filter((_, k) => scores[k] === best);
  return top[rand() % top.length]!;
}
