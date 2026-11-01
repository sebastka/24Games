// Rules of Nim and its computer player, as nim.exe implements them (see docs/games/nim.md for
// the functions this follows). Six rows (A-F) of up to 8 pieces; a move takes pieces from the
// right end of one row. Pure and immutable.

export type Piles = readonly number[];

export const ROWS = 6;
export const MAX_PILE = 8;

/** The default pile sizes (Options: A 2, B 3, … F 7). */
export const DEFAULT_PILES: Piles = [2, 3, 4, 5, 6, 7];

export interface Move {
  row: number;
  count: number;
}

export const take = (piles: Piles, { row, count }: Move): Piles => piles.map((n, i) => (i === row ? n - count : n));

const empty = (piles: Piles): boolean => piles.every((n) => n === 0);

/**
 * Whether the game is over after a move (`FUN_004044a4`): with "Take the Last Piece", when no
 * piece is left; with "Leave the Last Piece", when exactly one piece is left (the player to move
 * would have to take it). In the latter, a move that takes all the remaining pieces is not
 * noticed: the game then goes on with an empty board, as in the original.
 */
export function isOver(piles: Piles, takeLast: boolean): boolean {
  if (takeLast) return empty(piles);
  if (piles.some((n) => n > 1)) return false;
  return piles.filter((n) => n === 1).length === 1;
}

/**
 * Whether the position is lost for the player to move in plain Nim (`FUN_0040465f`): the
 * original counts the piles having each of the bits 8, 4, 2, 1 and checks that every count is
 * even, i.e. that the nim-sum is 0.
 */
export const isZero = (piles: Piles): boolean => piles.reduce((x, n) => x ^ n, 0) === 0;

/** Any move, at random among all of them (`FUN_00404555`): row by row, from the largest. */
function anyMove(piles: Piles, random: () => number): Move {
  const moves: Move[] = [];
  piles.forEach((n, row) => {
    for (let count = n; count > 0; count--) moves.push({ row, count });
  });
  // With nothing to take, the original "takes" 0 pieces from row A.
  if (moves.length === 0) return { row: 0, count: 0 };
  return moves[Math.floor(random() * moves.length)]!;
}

/**
 * The computer's move (`FUN_004041f0`). With "Take the Last Piece", a move leaving a nim-sum of
 * 0, at random among those, or any move when there is none. With "Leave the Last Piece", the
 * same, except when a single row has more than one piece: it then takes all of that row, or all
 * but one, so as to leave an odd number of rows of one piece. (When every row has at most one
 * piece, it still plays the plain game: a known weakness of the original.)
 */
export function computerMove(piles: Piles, takeLast: boolean, random: () => number): Move {
  if (!takeLast && piles.filter((n) => n > 1).length === 1) {
    const parity = piles.filter((n) => n > 0).length & 1;
    const row = piles.findIndex((n) => n > 1);
    return { row, count: piles[row]! - parity };
  }
  if (isZero(piles)) return anyMove(piles, random);
  const winning: Move[] = [];
  piles.forEach((n, row) => {
    for (let count = n; count > 0; count--) {
      if (isZero(take(piles, { row, count }))) winning.push({ row, count });
    }
  });
  return winning[Math.floor(random() * winning.length)]!;
}

const rowName = (row: number): string => String.fromCharCode(65 + row);
const pieces = (count: number): string => `${count} piece${count > 1 ? 's' : ''}`;

/** The status line while choosing (`FUN_00401e60`). */
export function selectionText(inProgress: boolean, selection: Move | null): string {
  if (!inProgress) return 'Press F2 to begin a new game';
  if (!selection) return 'Choose the pieces to take & press ENTER';
  return `Take ${pieces(selection.count)} from row ${rowName(selection.row)}`;
}

/** The status line after the computer's move (`FUN_004028f0`). */
export const computerText = (move: Move): string =>
  `Computer takes ${pieces(move.count)} from row ${rowName(move.row)}`;

/** The two lines of the end-of-game dialog: who took, or was forced to take, the last piece. */
export function endLines(winner: 'player' | 'computer', takeLast: boolean): [string, string] {
  if (winner === 'player')
    return takeLast ? ['You took', 'the last piece!'] : ['You forced me to', 'take the last piece!'];
  return takeLast ? ['I took', 'the last piece!'] : ['I forced you to', 'take the last piece!'];
}
