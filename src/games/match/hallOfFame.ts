// The high score table ("Hall of Fame") the games share (FUN_004080b0-FUN_00408ad0 in match.exe,
// linked into each game): ten names and scores per table, kept as strings (CardMatch keeps
// times, "1:13"), a table per skill level.
import { load, save } from '../../shell/storage.ts';

export interface Entry {
  name: string;
  score: string;
}

export const TABLE_SIZE = 10;

/**
 * A score's value (`FUN_00405240`): its digits read as one number, whatever is between them
 * ("1:13" is 113, which orders times correctly), or -1 without digits.
 */
export function scoreValue(score: string): number {
  const digits = score.replace(/\D/g, '');
  return digits ? Number(digits) : -1;
}

/**
 * Where `score` enters `table` (`FUN_00408320`): before the first entry it beats strictly, or at
 * the first empty place; -1 if it does not enter. `higherIsBetter` is false for times.
 */
export function placeOf(table: readonly Entry[], score: string, higherIsBetter: boolean): number {
  const value = scoreValue(score);
  if (value < 0) return -1;
  for (let i = 0; i < TABLE_SIZE; i++) {
    const other = table[i] ? scoreValue(table[i]!.score) : -1;
    if (other < 0 || (higherIsBetter ? value > other : value < other)) return i;
  }
  return -1;
}

/** `table` with `entry` at `place`, the entries below moved down (the last one drops out). */
export const insert = (table: readonly Entry[], place: number, entry: Entry): Entry[] =>
  [...table.slice(0, place), entry, ...table.slice(place)].slice(0, TABLE_SIZE);

export interface Scores {
  /** One table per skill level (or one only, for games without levels). */
  tables: Entry[][];
  /** The last name entered, offered for the next high score (PlayerName). */
  playerName: string;
}

const key = (game: string) => `${game}.scores`;

export function loadScores(game: string, tables: number): Scores {
  const s = load<Scores>(key(game), { tables: [], playerName: '' });
  return {
    playerName: typeof s.playerName === 'string' ? s.playerName : '',
    tables: Array.from({ length: tables }, (_, i) =>
      (Array.isArray(s.tables?.[i]) ? s.tables[i]! : []).filter(
        (e): e is Entry => typeof e?.name === 'string' && typeof e?.score === 'string',
      ),
    ),
  };
}

export const saveScores = (game: string, scores: Scores): void => save(key(game), scores);
