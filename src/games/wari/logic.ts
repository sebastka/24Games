// Rules of Wari and its computer player, as wari.exe implements them (see docs/games/wari.md for
// the functions this follows). Despite its name, the game is Kalah: six pits a side and a goal
// pit ("store") at each end, extra turn when the last piece lands in your goal, capture of the
// opposite pit when it lands in an empty pit of yours. Pure and immutable.

/**
 * The 14 pits, in sowing (counterclockwise) order, as the original numbers them: 0-5 the
 * player's pits (bottom row, left to right), 6 the player's goal (right), 7-12 the computer's
 * pits (top row, right to left), 13 the computer's goal (left).
 */
export type Board = readonly number[];

export const PITS = 14;
export const PLAYER_GOAL = 6;
export const COMPUTER_GOAL = 13;

export type Side = 'player' | 'computer';

export const isPlayerPit = (pit: number): boolean => pit >= 0 && pit < 6;
export const isComputerPit = (pit: number): boolean => pit > 6 && pit < 13;

/** The pit across the board from `pit` (0 ↔ 12, 5 ↔ 7). */
export const opposite = (pit: number): number => 12 - pit;

/**
 * A new board (Game › New, `FUN_00409530`): `perPit` pieces in each of the 12 pits, or, with
 * 0 ("Random", the default), 1 to 6 in each pit, drawn pit by pit.
 */
export function newBoard(perPit: number, random: () => number): Board {
  return Array.from({ length: PITS }, (_, pit) => {
    if (pit === PLAYER_GOAL || pit === COMPUTER_GOAL) return 0;
    return perPit > 0 ? perPit : Math.floor(random() * 6) + 1;
  });
}

/** One piece moved from a pit to another: what the board animates, with its sounds. */
export interface Transfer {
  from: number;
  to: number;
}

export interface Move {
  board: Board;
  /** The pieces in the order they move: the sowing, then the capture. */
  transfers: Transfer[];
  /** The last piece landed in the mover's goal. */
  extraTurn: boolean;
}

/**
 * A move as the game plays it (`FUN_0040a280`): the pieces of `pit` go one by one into the
 * following pits, both goals included. (The computer's look-ahead skips the opponent's goal,
 * see `sow`: the game itself does not.) When the last piece lands in an empty pit of the
 * mover's row, the pieces of the opposite pit go to the mover's goal; the last piece stays.
 * Landing in the mover's goal gives an extra turn.
 */
export function play(board: Board, pit: number): Move {
  const b = [...board];
  const transfers: Transfer[] = [];
  const mover: Side = pit < 7 ? 'player' : 'computer';
  // As the original, the first target is the next pit even when there is nothing to sow:
  // "playing" the player's empty goal (how a game with the computer first starts) passes.
  let at = (pit + 1) % PITS;
  for (let first = true; b[pit]! > 0; first = false) {
    if (!first) at = (at + 1) % PITS;
    b[pit]!--;
    b[at]!++;
    transfers.push({ from: pit, to: at });
  }
  const ownRow = mover === 'player' ? isPlayerPit : isComputerPit;
  if (ownRow(at) && b[at] === 1) {
    const goal = mover === 'player' ? PLAYER_GOAL : COMPUTER_GOAL;
    const across = opposite(at);
    for (; b[across]! > 0; b[across]!--, b[goal]!++) transfers.push({ from: across, to: goal });
  }
  const extraTurn = at === (mover === 'player' ? PLAYER_GOAL : COMPUTER_GOAL);
  return { board: b, transfers, extraTurn };
}

const rowEmpty = (board: Board, first: number): boolean => board.slice(first, first + 6).every((n) => n === 0);

/** The game ends when either row is empty (checked after every move). */
export const isOver = (board: Board): boolean => rowEmpty(board, 0) || rowEmpty(board, 7);

/** Final scores: each side gets its goal and the pieces left in its row. */
export function scores(board: Board): { player: number; computer: number } {
  const sum = (a: number, b: number) => board.slice(a, b).reduce((s, n) => s + n, 0);
  return { player: sum(0, 7), computer: sum(7, 14) };
}

// The computer player (`FUN_0040b3c0`, `FUN_0040b140`, `FUN_0040b080`) works on its own copy
// of the board, rotated by one: index 0 is the computer's goal, 1-6 the player's pits, 7 the
// player's goal, 8-13 the computer's pits.
const toSearch = (board: Board): number[] => Array.from({ length: PITS }, (_, i) => board[(i + PITS - 1) % PITS]!);

/**
 * The look-ahead's sowing (`FUN_0040b080`): unlike the game, it skips the opponent's goal.
 * Captures as the game does. Returns whether the turn passes to the other side.
 */
function sow(src: readonly number[], pit: number): { board: number[]; passes: boolean } {
  const b = [...src];
  const player = pit < 7;
  let n = b[pit]!;
  b[pit] = 0;
  let at = pit;
  while (n-- > 0) {
    at++;
    if (at === 7) at = player ? 7 : 8;
    else if (at > 13) at = player ? 1 : 0;
    b[at]!++;
  }
  if (b[at] === 1 && at < 7 === player && at !== 0 && at !== 7) {
    b[player ? 7 : 0]! += b[14 - at]!;
    b[14 - at] = 0;
  }
  return { board: b, passes: at !== 0 && at !== 7 };
}

/**
 * The position's value for the computer at the end of the look-ahead (`FUN_0040b140` with no
 * budget left): the goals' difference, and for each pit, the pieces that would stay in its row
 * (counted for its owner) against those that would reach its owner's goal (counted twice
 * against). Holding more than half of the pieces is worth ±1000.
 *
 * `half` is meant to be 6 × the pieces per pit, but the original reads it from a field it never
 * sets: whatever was on the stack, 0x004101f4 (a code address) under Wine, so that the bonus
 * never applies (see docs/games/wari.md).
 */
function evaluate(b: readonly number[], half: number): number {
  let v = b[0]! - b[7]!;
  for (let i = 1; i < 7; i++) v += b[i]! - 2 * Math.min(b[i]!, 7 - i);
  for (let i = 8; i < 14; i++) v += 2 * Math.min(b[i]!, 14 - i) - b[i]!;
  if (b[0]! > half) v += 1000;
  if (b[7]! > half) v -= 1000;
  return v;
}

/**
 * Alpha-beta search (`FUN_0040b140`), the computer maximising (side 0) and the player
 * minimising (side 1). It has a node budget rather than a depth: each move gets the budget
 * divided by the number of moves (integer division), and the search stops when it reaches 0.
 */
function search(b: readonly number[], side: 0 | 1, budget: number, alpha: number, beta: number, half: number): number {
  if (budget === 0) return evaluate(b, half);
  if (b.slice(1, 7).every((n) => n === 0) || b.slice(8, 14).every((n) => n === 0)) {
    // Game over: the difference of the final scores, ±1000.
    const v = b[0]! + b.slice(8, 14).reduce((s, n) => s + n, 0) - b.slice(1, 8).reduce((s, n) => s + n, 0);
    return v < 0 ? v - 1000 : v > 0 ? v + 1000 : 0;
  }
  const first = side === 0 ? 8 : 1;
  const moves = b.slice(first, first + 6).filter((n) => n > 0).length;
  const share = Math.floor(budget / moves);
  for (let pit = first + 5; pit >= first; pit--) {
    if (b[pit] === 0) continue;
    const { board, passes } = sow(b, pit);
    const next = passes ? ((1 - side) as 0 | 1) : side;
    const v = search(board, next, share, alpha, beta, half);
    if (side === 0) {
      alpha = Math.max(alpha, v);
      if (alpha >= beta) return alpha;
    } else {
      beta = Math.min(beta, v);
      if (beta <= alpha) return beta;
    }
  }
  return side === 0 ? alpha : beta;
}

/**
 * The node budget of each skill level (Easy, Moderate, Difficult, Expert). The original looks
 * it up with the skill digit's character code, one entry past the table it meant: it reads 130,
 * 195, 64000 and, past the table's end, 47408 (the low half of a code address). Difficult
 * therefore looks further ahead than Expert.
 */
export const BUDGETS = [130, 195, 64000, 47408];

/** `half` of `evaluate` as the original ends up computing it: 6 × an uninitialised 0x004101f4. */
export const THRESHOLD = 6 * 0x004101f4;

/**
 * The computer's move (`FUN_0040b3c0`): its only pit if it has one, otherwise the pit whose
 * search value is strictly the best, trying the pits from its left (12) to its right (7).
 * `skill` is 1-4. Deterministic.
 */
export function computerMove(board: Board, skill: number, half: number = THRESHOLD): number {
  const b = toSearch(board);
  const pits = [13, 12, 11, 10, 9, 8].filter((i) => b[i]! > 0);
  if (pits.length === 0) throw new Error('the computer has no move');
  if (pits.length === 1) return pits[0]! - 1;
  const budget = Math.floor(BUDGETS[skill - 1]! / pits.length);
  let best = pits[0]!;
  let value = -10000;
  for (const pit of pits) {
    const { board: after, passes } = sow(b, pit);
    const v = search(after, passes ? 1 : 0, budget, value, 10000, half);
    if (v > value) {
      value = v;
      best = pit;
    }
  }
  return best - 1;
}
