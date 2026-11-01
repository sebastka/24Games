// The high score tables ("Hall of Fame") linked into Poker Patience and Poker Machine
// (FUN_00401000 … FUN_00401f09 in pokergrd.exe): ten names and scores per table, kept in the
// registry as Name_<table>_<i> / Score_<table>_<i>. Pure: no DOM.

export interface ScoreEntry {
  name: string;
  score: number;
}

export const TABLE_SIZE = 10;

/**
 * Where `score` enters `table` (FUN_0040123b): the first place that is empty or holds a worse
 * score (lower, or higher when `lowerIsBetter`); a tie goes below. Null when it does not enter.
 */
export function placeOf(table: readonly ScoreEntry[], score: number, lowerIsBetter = false): number | null {
  for (let i = 0; i < TABLE_SIZE; i++) {
    const entry = table[i];
    if (!entry || (lowerIsBetter ? score < entry.score : score > entry.score)) return i;
  }
  return null;
}

/** `table` with `entry` at `place`, the entries below moved down (the last one drops out). */
export function insertScore(table: readonly ScoreEntry[], place: number, entry: ScoreEntry): ScoreEntry[] {
  return [...table.slice(0, place), entry, ...table.slice(place)].slice(0, TABLE_SIZE);
}
