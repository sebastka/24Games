// The high score tables of CZGAME's games (FUN_0040cf00… in cheesy.exe): ten names and
// scores, a "Hall of Fame" dialog, a name prompt for a new high score.
import { load, save } from '../../../shell/storage.ts';

export interface Entry {
  name: string;
  score: number;
}

/** Ten places; null where nobody has scored yet. */
export type Table = readonly (Entry | null)[];

export const PLACES = 10;
export const emptyTable = (): Table => Array<Entry | null>(PLACES).fill(null);

/**
 * The place a score earns (FUN_0040d170), or -1: the first place that is empty or held by a
 * lower score (a higher one when `lowerIsBetter`). Ties go below the earlier score.
 */
export function placeOf(table: Table, score: number, lowerIsBetter = false): number {
  return table.findIndex((e) => e === null || (lowerIsBetter ? score < e.score : score > e.score));
}

/** The table with `entry` at `place`, the places below moved down one (the last one drops out). */
export function insert(table: Table, place: number, entry: Entry): Table {
  return [...table.slice(0, place), entry, ...table.slice(place, PLACES - 1)];
}

interface Stored {
  tables: Record<string, Table>;
  /** The last name typed, offered again (the original's PlayerName). */
  player: string;
}

/** High scores of a game, in localStorage under `<game>.scores`, one table per `table` key. */
export function loadScores(game: string): Stored {
  const s = load<Stored>(`${game}.scores`, { tables: {}, player: '' });
  return { tables: s.tables ?? {}, player: typeof s.player === 'string' ? s.player : '' };
}

export const saveScores = (game: string, scores: Stored): void => save(`${game}.scores`, scores);

export function tableOf(scores: Stored, key: string): Table {
  const t = scores.tables[key];
  return Array.isArray(t) && t.length === PLACES ? t : emptyTable();
}
