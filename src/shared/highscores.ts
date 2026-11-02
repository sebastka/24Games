// The rules of the high score tables ("Hall of Fame") of CZGAME's games, shared by the browser
// and the server, which keeps the tables of an instance. The same code is linked into each
// original game (FUN_004080b0-FUN_00408ad0 in match.exe, FUN_004066c0 and following in
// stackblz.exe, FUN_00401000-FUN_00401f09 in pokergrd.exe…): ten names and scores per table. A
// game has one table, or one per skill level, board size or variant. Pure: no DOM, no Node.

export const TABLE_SIZE = 10;

export interface Entry {
  name: string;
  /** As shown: a number, or CardMatch's times ("1:13"). */
  score: string;
}

/** The entries of a table, best first; the places after them are free. */
export type Table = readonly Entry[];

/** The games with high score tables, and whether a lower score is better (times, moves, pieces left). */
export const SCORE_GAMES: Readonly<Record<string, { lowerIsBetter: boolean }>> = {
  bbchess: { lowerIsBetter: false },
  cheesy: { lowerIsBetter: false },
  match: { lowerIsBetter: true },
  pegoplis: { lowerIsBetter: true },
  pokergrd: { lowerIsBetter: false },
  pokermat: { lowerIsBetter: false },
  quinto: { lowerIsBetter: true },
  sechseck: { lowerIsBetter: false },
  stackblz: { lowerIsBetter: false },
  thinktnk: { lowerIsBetter: false },
  voracity: { lowerIsBetter: false },
};

/**
 * A score's value (`FUN_00405240` in match.exe): its digits read as one number, whatever is
 * between them ("1:13" is 113, which orders times correctly), or -1 without digits.
 */
export function scoreValue(score: string | number): number {
  const digits = String(score).replace(/\D/g, '');
  return digits ? Number(digits) : -1;
}

/**
 * Where `score` enters `table` (`FUN_00408320` in match.exe, `FUN_00406930` in stackblz.exe):
 * before the first entry it beats strictly (a tie goes below), or at the first free place; -1 if
 * it does not enter. A free place takes any score, 0 included. Lower is better for times.
 */
export function placeOf(table: Table, score: string | number, lowerIsBetter = false): number {
  const value = scoreValue(score);
  if (value < 0) return -1;
  for (let i = 0; i < TABLE_SIZE; i++) {
    const other = table[i] ? scoreValue(table[i]!.score) : -1;
    if (other < 0 || (lowerIsBetter ? value < other : value > other)) return i;
  }
  return -1;
}

/** `table` with `name` and `score` at `place`, the entries below moved down (the last one drops out). */
export const insert = (table: Table, place: number, name: string, score: string | number): Table =>
  [...table.slice(0, place), { name, score: String(score) }, ...table.slice(place)].slice(0, TABLE_SIZE);

// What the server accepts (and the browser sends).

/** The longest name: the original's edit field takes 30 characters. */
export const NAME_LENGTH = 30;

/** A table key: "0", a skill level, a board size ("9x7"), a variant or a layout name. */
export const isTableKey = (key: string): boolean => /^[A-Za-z0-9_-]{1,32}$/.test(key);

/** A name as stored: trimmed, without control characters, at most NAME_LENGTH characters; null if empty. */
export function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return clean ? [...clean].slice(0, NAME_LENGTH).join('') : null;
}

/** A score as the games show it: a whole number, or a time (m:ss); null otherwise. */
export function cleanScore(score: unknown): string | null {
  const text = typeof score === 'number' && Number.isSafeInteger(score) ? String(score) : score;
  return typeof text === 'string' && /^(\d{1,10}|\d{1,4}:[0-5]\d)$/.test(text) ? text : null;
}
