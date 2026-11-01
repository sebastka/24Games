// Rules of Checker Connector and its computer player, as the original connect.exe implements them
// (see docs/games/connect.md for the functions this follows). Pure: every action returns a new
// position.
import type { Rand } from '../../shell/random.ts';

export const COLUMNS = 7;
export const ROWS = 6;
export const CELLS = COLUMNS * ROWS;

export const PLAYER = 1;
export const COMPUTER = -1;
export const EMPTY = 0;
export type Side = typeof PLAYER | typeof COMPUTER;

/**
 * The original's position (a 64-byte structure at 0x411000): cells column by column, bottom up
 * (index = column × 6 + row), the height of each column, the side to move, and a move count.
 */
export interface Position {
  cells: readonly number[];
  heights: readonly number[];
  side: Side;
  /**
   * Pieces dropped, as the original counts them: its opening move when the computer goes first
   * is not counted, which its search notices near the end (a full board then reads as lost).
   */
  count: number;
}

/**
 * A new game (`FUN_00402d00`, `FUN_004015c0`): an empty board, the player to move. When the
 * computer goes first, it has played column D without thinking.
 */
export function start(computerFirst: boolean): Position {
  const cells = new Array<number>(CELLS).fill(EMPTY);
  const heights = new Array<number>(COLUMNS).fill(0);
  if (computerFirst) {
    cells[3 * ROWS] = COMPUTER;
    heights[3] = 1;
  }
  return { cells, heights, side: PLAYER, count: 0 };
}

export const isFull = (p: Position, column: number): boolean => p.heights[column]! >= ROWS;
export const boardFull = (p: Position): boolean => p.heights.every((h) => h >= ROWS);

/** The side to move drops a piece in `column` (which must not be full). */
export function drop(p: Position, column: number): Position {
  const cells = [...p.cells];
  const heights = [...p.heights];
  cells[column * ROWS + heights[column]!] = p.side;
  heights[column]!++;
  return { cells, heights, side: -p.side as Side, count: p.count + 1 };
}

// Four in a row: from each piece, up, right, up-right, and (from column D on) up-left, as offsets
// in the column-major cells. The scan goes column by column, bottom up, stopping at the first
// empty cell of a column (`FUN_00402d50`, `FUN_00403110`).
function scan(cells: ArrayLike<number>): number[] | null {
  for (let col = 0; col < COLUMNS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const at = col * ROWS + row;
      const c = cells[at];
      if (c === EMPTY) break;
      const line = (step: number) =>
        cells[at + step] === c && cells[at + 2 * step] === c && cells[at + 3 * step] === c
          ? [at, at + step, at + 2 * step, at + 3 * step]
          : null;
      const four =
        (row < 3 && line(1)) ||
        (col < 4 && (line(ROWS) || (row < 3 && line(ROWS + 1)))) ||
        (col > 2 && row < 3 && line(1 - ROWS));
      if (four) return four;
    }
  }
  return null;
}

/** The side with four in a row (the first found), or EMPTY. */
export function winner(cells: ArrayLike<number>): number {
  const four = scan(cells);
  return four ? cells[four[0]!]! : EMPTY;
}

/** The cells of the four in a row that won, which the original lights up. */
export const winningFour = (p: Position): number[] => scan(p.cells) ?? [];

/** The search's position: cells, heights, side, count, mutated and restored in place. */
interface Work {
  cells: Int8Array;
  heights: Int8Array;
  side: number;
  count: number;
}

const work = (p: Position): Work => ({
  cells: Int8Array.from(p.cells),
  heights: Int8Array.from(p.heights),
  side: p.side,
  count: p.count,
});

function push(w: Work, column: number): void {
  w.cells[column * ROWS + w.heights[column]!] = w.side;
  w.heights[column]!++;
  w.count++;
  w.side = -w.side;
}

function pop(w: Work, column: number): void {
  w.side = -w.side;
  w.count--;
  w.heights[column]!--;
  w.cells[column * ROWS + w.heights[column]!] = EMPTY;
}

/**
 * Who wins with best play within `depth` moves (`FUN_00403350`): the winner if there is four in
 * a row; else, the side to move if one of its moves wins, a draw (0) if one does not lose, and
 * otherwise the other side. A board counted full (42) is a draw; out of depth, 0.
 */
function search(w: Work, depth: number): number {
  let result = winner(w.cells);
  if (depth === 0 || result !== EMPTY || w.count === CELLS) return result;
  result = -w.side;
  const side = w.side;
  for (let col = 0; col < COLUMNS; col++) {
    if (w.heights[col]! === ROWS) continue;
    push(w, col);
    const v = search(w, depth - 1);
    pop(w, col);
    if (v === side) return side;
    if (v === 0) result = 0;
  }
  return result;
}

/**
 * The computer's move (`FUN_00401ac0` and `FUN_00403410`), for the computer to move in `p`:
 *
 * - The depth is the skill level (1-4), one more 2 times in 5 (`rand() % 5` is 3 or 4), one more
 *   again once 29 pieces are counted.
 * - Each column is tried: a win (now or forced) is played at once; columns that lose are avoided
 *   if any does not.
 * - Among several neutral columns, it imagines the player dropping there and searches 4 deep: a
 *   column where that would let the player force a win is blocked first, then the others by
 *   distance to the centre (the leftmost on a tie).
 *
 * Also says whether the computer then threatens to win at its next move ("Check!"). The column
 * is -1 when the board is full.
 */
export function computerMove(p: Position, skill: number, rand: Rand): { column: number; check: boolean } {
  const depth = (rand() % 5 < 3 ? skill : skill + 1) + (p.count > 28 ? 1 : 0);
  const w = work(p);
  const scores: number[] = [];
  // 1 while every playable column loses, 0 once one does not.
  let allLose = 1;
  let choice = -1;
  let won = false;
  for (let col = 0; col < COLUMNS && !won; col++) {
    if (w.heights[col]! === ROWS) {
      scores.push(2);
      continue;
    }
    push(w, col);
    const v = search(w, depth) * 20;
    pop(w, col);
    scores.push(v);
    if (v === -20) {
      choice = col;
      won = true;
    } else if (v === 0) {
      allLose = 0;
      choice = col;
    } else if (allLose === 1) choice = col;
  }
  if (!won && scores.filter((s) => s === allLose).length > 1) {
    // The player's view: where would its own piece hurt the most?
    w.side = PLAYER;
    let best = allLose;
    scores.forEach((score, col) => {
      if (score !== allLose) return;
      push(w, col);
      const v = search(w, 4);
      pop(w, col);
      scores[col] = score + ((-2 - v) * 5 + Math.abs(col - 3)) * 2;
    });
    scores.forEach((score, col) => {
      if (score < best) {
        best = score;
        choice = col;
      }
    });
    w.side = COMPUTER;
  }
  if (choice < 0) return { column: -1, check: false };
  push(w, choice);
  let check = false;
  if (winner(w.cells) === EMPTY) {
    w.side = COMPUTER;
    for (let col = 0; col < COLUMNS && !check; col++) {
      if (w.heights[col]! === ROWS) continue;
      push(w, col);
      check = winner(w.cells) !== EMPTY;
      pop(w, col);
    }
  }
  return { column: choice, check };
}
