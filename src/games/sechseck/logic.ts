// Rules of Sechseck, as the original sechseck.exe implements them (see docs/games/sechseck.md
// for the functions this follows). Pure and immutable: every call returns a new state, and the
// events (named after the game's sound events) that happened.
//
// Time is simulated in steps of 1 ms: a 100 ms StarView timer watches a stopwatch, and a skull
// takes a free cell when 5 seconds go by without a piece placed.

/** A piece: colour in the low 2 bits, shape in the next 2 (0-15). On the board, piece + 1. */
export const Cell = {
  Empty: 0,
  /** 1-16: a piece. */
  Skull: 17,
  /** 18-20: free cells that multiply the score of the piece placed there by 2, 3 or 4. */
  Times2: 18,
  Times3: 19,
  Times4: 20,
} as const;

/** Board sizes (Options › Board Size): Small, Medium, Large; the board is size × size. */
export const SIZES = [4, 6, 8] as const;

/** Points for the number of traits matched by the neighbours (0x4141ee): 0, then 1, 2, 4 … 2048. */
export const MATCH_POINTS = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

/** The slots of the pieces to place. */
export const SLOTS = 4;
export const TIMER_MS = 100;
/** A skull falls when the stopwatch reaches 5 s (checked on the timer: `elapsed / 1000 > 4`). */
export const PENALTY_MS = 5000;

/** The C runtime's rand(): an integer in 0..32767. Injected, so that tests are deterministic. */
export type Rand = () => number;

export const randomRand: Rand = () => Math.floor(Math.random() * 32768);

export type GameEvent = `Match ${number}` | 'Penalty' | 'Game Over';

export interface State {
  size: number;
  /** Row-major: `cells[row * size + col]`. */
  cells: readonly number[];
  /** The pieces offered (0-15). */
  slots: readonly number[];
  /** A 16-bit counter in the original. */
  score: number;
  playing: boolean;
  /** The timer and stopwatch run from the first piece placed until the game ends. */
  running: boolean;
  /** Stopwatch: running time since the last piece (or skull), in ms. */
  elapsed: number;
  /** Time since the timer last fired or started, in ms. */
  tick: number;
  /** The stopwatch as the time bar shows it, updated when the timer fires (0-5000). */
  bar: number;
}

export interface Result {
  state: State;
  events: GameEvent[];
}

const colour = (piece: number) => piece & 3;
const shape = (piece: number) => piece >> 2;

/** Whether a piece can be dropped on the cell: empty, or a multiplier. */
export const isFree = (cell: number): boolean => cell === Cell.Empty || cell >= Cell.Times2;

/**
 * The neighbour of (col, row) in direction 0-5, clockwise from the upper right (FUN_00409210),
 * or null outside the board. Odd rows are shifted right by half a cell.
 */
export function neighbour(size: number, col: number, row: number, direction: number): [number, number] | null {
  const odd = row % 2 === 1;
  const steps: readonly [number, number][] = odd
    ? [
        [1, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]
    : [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
      ];
  const [dc, dr] = steps[direction]!;
  const c = col + dc;
  const r = row + dr;
  return c < 0 || r < 0 || c >= size || r >= size ? null : [c, r];
}

/**
 * A new game (FUN_0040a1f0): an empty board with a quarter of its cells made multipliers (×4 two
 * times in 13, ×3 three times, ×2 otherwise, at random places, possibly the same one twice),
 * and four random pieces. The timer waits for the first piece.
 */
export function newGame(size: number, rand: Rand): State {
  const cells = Array<number>(size * size).fill(Cell.Empty);
  for (let n = Math.floor((size * size) / 4); n > 0; n--) {
    const kind = rand() % 13;
    const tile = kind < 2 ? Cell.Times4 : kind < 5 ? Cell.Times3 : Cell.Times2;
    const row = rand() % size;
    cells[row * size + (rand() % size)] = tile;
  }
  const slots = Array.from({ length: SLOTS }, () => rand() % 16);
  return { size, cells, slots, score: 0, playing: true, running: false, elapsed: 0, tick: 0, bar: 0 };
}

/** The game ends when no cell is free (FUN_0040ab00): the timer stops, the bar empties. */
function checkOver(s: State, events: GameEvent[]): State | null {
  if (s.cells.some(isFree)) return null;
  events.push('Game Over');
  return { ...s, playing: false, running: false, elapsed: 0, tick: 0, bar: 0 };
}

/** A fresh stopwatch and timer (FUN_00409360 and Timer::Start). */
const restart = (s: State): State => ({ ...s, running: true, elapsed: 0, tick: 0, bar: 0 });

/**
 * A piece dropped on a free cell (FUN_0040a860): for each of the six neighbours holding a piece,
 * one match for the same colour and one for the same shape; the score grows by
 * MATCH_POINTS[matches] × the cell's multiplier. The slot gets a new random piece.
 */
export function place(s: State, slot: number, cell: number, rand: Rand): Result {
  const events: GameEvent[] = [];
  if (!s.playing || !isFree(s.cells[cell] ?? Cell.Skull)) return { state: s, events };
  const piece = s.slots[slot]!;
  const multiplier = s.cells[cell] === Cell.Empty ? 1 : s.cells[cell]! - 16;
  const cells = s.cells.slice();
  cells[cell] = piece + 1;
  const col = cell % s.size;
  const row = Math.floor(cell / s.size);
  let matches = 0;
  for (let d = 0; d < 6; d++) {
    const n = neighbour(s.size, col, row, d);
    const other = n ? cells[n[1] * s.size + n[0]]! - 1 : -1;
    if (other < 0 || other >= 16) continue;
    if (colour(other) === colour(piece)) matches++;
    if (shape(other) === shape(piece)) matches++;
  }
  events.push(`Match ${matches}`);
  const score = (s.score + MATCH_POINTS[matches]! * multiplier) & 0xffff;
  const slots = s.slots.slice();
  slots[slot] = rand() % 16;
  const state: State = { ...s, cells, slots, score };
  return { state: checkOver(state, events) ?? restart(state), events };
}

/** Too slow (FUN_0040afb0): a skull on a random free cell (multipliers included). */
function penalty(s: State, rand: Rand, events: GameEvent[]): State {
  events.push('Penalty');
  const free = s.cells.filter(isFree).length;
  if (free === 0) return s;
  let k = (rand() % free) + 1;
  const cells = s.cells.map((c) => (isFree(c) && --k === 0 ? Cell.Skull : c));
  return { ...s, cells };
}

/** The timer (FUN_00409430): the bar shows the stopwatch; at 5 s, a skull. */
function fire(s: State, rand: Rand, events: GameEvent[]): State {
  let state: State = { ...s, tick: 0, bar: Math.min(s.elapsed, PENALTY_MS) };
  if (Math.floor(state.elapsed / 1000) > 4) {
    state = penalty(state, rand, events);
    state = checkOver(state, events) ?? { ...state, elapsed: 0, bar: 0 };
  }
  return state;
}

/** The fixed-step simulation: 1 ms of time. */
export function step(s: State, rand: Rand): Result {
  const events: GameEvent[] = [];
  if (!s.running) return { state: s, events };
  const state = { ...s, elapsed: s.elapsed + 1, tick: s.tick + 1 };
  return { state: state.tick >= TIMER_MS ? fire(state, rand, events) : state, events };
}

/**
 * After a pause (a menu command, a dialog, the window minimised): the stopwatch goes on where it
 * stopped, the timer starts again and fires at once (FUN_0040bd00).
 */
export function resume(s: State, rand: Rand): Result {
  const events: GameEvent[] = [];
  if (!s.running) return { state: s, events };
  return { state: fire(s, rand, events), events };
}
