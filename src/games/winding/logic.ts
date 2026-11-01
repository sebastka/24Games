// Rules of Winding Standoff and its computer player, as winding.exe implements them (see
// docs/games/winding.md for the functions this follows). A winding path of 64 squares closed
// on itself; each side places its 8 pieces two by two in its four stretches of the path, then
// slides one piece per turn along the path, as far as it likes but over no piece. The side that
// cannot move loses. Pure and immutable.

/** The path (`0x416338`, filled at start by `FUN_0040fe00`): (column, row) of each square. */
// prettier-ignore
export const PATH: readonly (readonly [number, number])[] = [
  [3, 1], [3, 0], [4, 0], [5, 0], [5, 1], [6, 1], [7, 1], [7, 0], [8, 0], [9, 0], [10, 0], [10, 1],
  [11, 1], [12, 1], [12, 2], [12, 3], [11, 3], [10, 3], [9, 3], [8, 3], [7, 3], [6, 3], [5, 3], [4, 3],
  [4, 4], [4, 5], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [12, 7],
  [12, 8], [11, 8], [10, 8], [10, 9], [9, 9], [8, 9], [7, 9], [7, 8], [6, 8], [5, 8], [5, 9], [4, 9],
  [3, 9], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6], [1, 6], [1, 5], [1, 4], [0, 4], [0, 3],
  [0, 2], [0, 1], [1, 1], [2, 1],
];

export const SQUARES = 64;
export const PIECES = 8;

const next = (i: number): number => (i + 1) % SQUARES;
const previous = (i: number): number => (i + SQUARES - 1) % SQUARES;

/**
 * The four stretches where a side places its pieces (`FUN_0040c970`): the first player's are
 * squares 0-7, 14-21, 28-35 and 42-49 (the board's second squares), the second's 8-13, 22-27,
 * 36-41 and 50-63.
 */
export function stretches(first: boolean): [number, number][] {
  return first
    ? [
        [0, 7],
        [14, 21],
        [28, 35],
        [42, 49],
      ]
    : [
        [8, 13],
        [22, 27],
        [36, 41],
        [50, 63],
      ];
}

/** Whether square `i` is one of the first player's stretches (drawn with the board's second square). */
export const isFirstStretch = (i: number): boolean => stretches(true).some(([lo, hi]) => i >= lo && i <= hi);

export interface State {
  /** Square of each of the player's pieces, or -1 while in the store. */
  player: readonly number[];
  /** Square of each of the computer's pieces, or -1 while in the store. */
  computer: readonly number[];
}

export const start = (): State => ({ player: Array(PIECES).fill(-1), computer: Array(PIECES).fill(-1) });

/** The board as the computer reads it: '0' empty, '1' the player's, '2' the computer's. */
export function board(state: State): string[] {
  const b = Array<string>(SQUARES).fill('0');
  for (const i of state.player) if (i >= 0) b[i] = '1';
  for (const i of state.computer) if (i >= 0) b[i] = '2';
  return b;
}

const occupied = (state: State, i: number): boolean => state.player.includes(i) || state.computer.includes(i);

/** Whether the player is still placing pieces (any left in the store). */
export const placing = (state: State): boolean => state.player.includes(-1);

/**
 * Where a piece can go (`FUN_0040cda0`). From the store: any free square of the player's
 * stretches holding fewer than two of their pieces. On the path: the free squares on either
 * side, up to the first piece.
 */
export function targets(state: State, piece: number, playerFirst: boolean): number[] {
  const from = state.player[piece]!;
  if (from < 0) {
    const out: number[] = [];
    for (const [lo, hi] of stretches(playerFirst)) {
      const mine = state.player.filter((i) => i >= lo && i <= hi).length;
      if (mine >= 2) continue;
      for (let i = lo; i <= hi; i++) if (!state.player.includes(i)) out.push(i);
    }
    return out;
  }
  const out: number[] = [];
  for (let i = previous(from); i !== from && !occupied(state, i); i = previous(i)) out.push(i);
  for (let i = next(from); i !== from && !occupied(state, i); i = next(i)) out.push(i);
  return out;
}

/**
 * The pieces the player can drag (`FUN_0040ca30`): those of the store while any is left, then
 * those with a free square next to them.
 */
export function draggable(state: State): number[] {
  const all = state.player.map((_, i) => i);
  if (placing(state)) return all.filter((i) => state.player[i]! < 0);
  return all.filter((i) => {
    const at = state.player[i]!;
    return !occupied(state, previous(at)) || !occupied(state, next(at));
  });
}

export function movePlayer(state: State, piece: number, to: number): State {
  return { ...state, player: state.player.map((i, k) => (k === piece ? to : i)) };
}

/** The computer's next piece from the store (the n-th, `0x1d0`) goes to `square`. */
export function placeComputer(state: State, square: number): State {
  const n = state.computer.indexOf(-1);
  return { ...state, computer: state.computer.map((i, k) => (k === n ? square : i)) };
}

export function moveComputer(state: State, from: number, to: number): State {
  return { ...state, computer: state.computer.map((i) => (i === from ? to : i)) };
}

/** Whether the player can still move once everything is placed (end of `FUN_0040da40`). */
export function playerCanMove(state: State): boolean {
  const b = board(state);
  return b.some((c, i) => c === '1' && (b[previous(i)] === '0' || b[next(i)] === '0'));
}

/**
 * The computer's placement (`FUN_0040da40`): its n-th piece goes to stretch n / 2, on a square
 * drawn at random (`rand() % size`) until it is not one of its own.
 */
export function computerPlacement(state: State, playerFirst: boolean, random: () => number): number {
  const placed = state.computer.filter((i) => i >= 0).length;
  const [lo, hi] = stretches(!playerFirst)[placed >> 1]!;
  for (;;) {
    const square = lo + Math.floor(random() * (hi - lo + 1));
    if (!state.computer.includes(square)) return square;
  }
}

/** The chance (in %) to play a winning move when there is one, by skill level (`0x4182dc`). */
export const SKILL_PERCENT = [40, 70, 85, 99];

const nimZero = (gaps: readonly number[]): boolean => gaps.reduce((x, g) => x ^ g, 0) === 0;

/**
 * The move on the gaps (`FUN_0040bf40`), Nim: with a non-zero nim-sum and `rand() % 100` at most
 * the skill's percentage, a move to a nim-sum of 0, at random among them; otherwise any move,
 * at random. A move is (gap, amount): the gap shrinks by the amount.
 */
export function nimMove(gaps: readonly number[], percent: number, random: () => number): [number, number] {
  const moves: [number, number][] = [];
  if (!nimZero(gaps) && Math.floor(random() * 100) <= percent) {
    gaps.forEach((g, k) => {
      for (let a = g; a > 0; a--) if (nimZero(gaps.map((x, j) => (j === k ? x - a : x)))) moves.push([k, a]);
    });
  } else {
    if (gaps.every((g) => g === 0)) return [0, 0];
    gaps.forEach((g, k) => {
      for (let a = g; a > 0; a--) moves.push([k, a]);
    });
  }
  return moves[Math.floor(random() * moves.length)]!;
}

export type ComputerMove = { from: number; to: number } | 'stuck' | 'resign';

/**
 * The computer's move once everything is placed (`FUN_0040ecd0`). The pieces never pass each
 * other, so they stay in pairs, 11 22 11 22… around the path, and only the 8 gaps between
 * pairs of different sides matter: they are Nim heaps (moving a piece towards the other side
 * shrinks one). The board is read from the first player's piece followed by a computer's piece
 * (the first "12" in the board order); the gaps are measured from there.
 *
 * With every such gap closed, the computer resigns at Difficult and Expert; at Easy and
 * Moderate it slides the first piece it can (backwards first) as far as it goes, and is stuck
 * when none can move.
 */
export function computerMove(state: State, skill: number, random: () => number): ComputerMove {
  const b = board(state);
  const pieces = b.filter((c) => c !== '0').join('');
  let n = pieces.indexOf('12') + 1;
  let k = 0;
  while (n > 0) if (b[k++] !== '0') n--;
  const r = k - 1;
  const s = Array.from({ length: SQUARES }, (_, j) => b[(j + r) % SQUARES]!);
  const at = (j: number) => (j + r) % SQUARES;

  // The gaps, in the original's order of searches: each gap between two pieces of the same side
  // is measured, then overwritten by the following one between different sides.
  const gaps = Array<number>(8).fill(0);
  const expected = ['2', '2', '1', '1', '2', '2', '1', '1', '2', '2', '1', '1', '2', '2', '1'];
  const slot = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
  let from = 1;
  expected.forEach((c, i) => {
    let j = from;
    while (s[j] !== c) j++;
    gaps[slot[i]!] = j - from;
    from = j + 1;
  });

  if (gaps.some((g) => g !== 0)) {
    const [gap, amount] = nimMove(gaps, SKILL_PERCENT[skill - 1]!, random);
    // The piece next to that gap: the (gap + 1)-th of the computer, moving backwards for the
    // gaps before its pairs (even), forwards for those after them (odd).
    let j = -1;
    for (let found = 0; found <= gap; found++)
      do j++;
      while (s[j] !== '2');
    const origin = at(j);
    const to = (origin + (gap % 2 === 0 ? -amount : amount) + SQUARES) % SQUARES;
    return { from: origin, to };
  }
  if (skill > 2) return 'resign';
  for (let u = 0; u < SQUARES; u++) {
    if (s[u] !== '2') continue;
    const before = s[(u + SQUARES - 1) % SQUARES];
    const after = s[(u + 1) % SQUARES];
    const step = before === '0' ? -1 : after === '0' ? 1 : 0;
    if (step === 0) continue;
    // As the original: an index below 1 wraps to 63, one above 63 to 0.
    const wrap = (i: number) => (i < 1 ? 63 : i > 63 ? 0 : i);
    let last = u;
    let probe = wrap(u + step);
    while (s[probe] === '0') {
      last = probe;
      probe = wrap(probe + step);
    }
    return { from: at(u), to: at(last) };
  }
  return 'stuck';
}
