// The Hall of Fame of the arcade games (StackBlitz, Sechseck…): ten names and scores, kept by
// each game in the registry as "Name__<table>_<n>" and "Score_<table>_<n>" (Sechseck keeps a
// table per board size), and the last name entered as PlayerName (stackblz.exe FUN_004066c0
// and following; the same code is in each game).
import { load, save } from '../../shell/storage.ts';

export const HALL_SIZE = 10;

export interface Entry {
  name: string;
  /** null for a free slot (an empty "Score n" value). */
  score: number | null;
}

export interface HighScores {
  entries: Entry[];
  /** The name last entered, offered again (registry PlayerName). */
  player: string;
}

const EMPTY: HighScores = { entries: Array.from({ length: HALL_SIZE }, () => ({ name: '', score: null })), player: '' };

/** As stored: the game's tables (Sechseck keeps one per board size), and the last name. */
interface Stored {
  tables: Partial<Record<number, Entry[]>>;
  player: string;
}

const keyOf = (game: string) => `${game}.hall-of-fame`;

const loadStored = (game: string): Stored => load<Stored>(keyOf(game), { tables: {}, player: '' });

/** Table `table` of a game (0 for the games with a single table) and the last name entered. */
export function loadScores(game: string, table = 0): HighScores {
  const s = loadStored(game);
  const entries = Array.from({ length: HALL_SIZE }, (_, i) => {
    const e = s.tables?.[table]?.[i];
    return { name: typeof e?.name === 'string' ? e.name : '', score: typeof e?.score === 'number' ? e.score : null };
  });
  return { entries, player: typeof s.player === 'string' ? s.player : '' };
}

export function saveScores(game: string, scores: HighScores, table = 0): void {
  const s = loadStored(game);
  save(keyOf(game), { tables: { ...s.tables, [table]: scores.entries }, player: scores.player });
}

/**
 * Where a score enters the table (FUN_00406930), or -1: the first slot that is free or holds a
 * lower score (a higher one when lower scores are better). A free slot takes any score, 0
 * included.
 */
export function rankOf(scores: HighScores, score: number, lowerIsBetter = false): number {
  return scores.entries.findIndex((e) => e.score === null || (lowerIsBetter ? e.score > score : e.score < score));
}

/** The table with `name` and `score` at `rank`, the entries below moving down one. */
export function insert(scores: HighScores, rank: number, name: string, score: number): HighScores {
  const entries = [...scores.entries.slice(0, rank), { name, score }, ...scores.entries.slice(rank)];
  return { entries: entries.slice(0, HALL_SIZE), player: name };
}

/** Clear Scores (FUN_00406b10): every slot free; the player's name is kept. */
export const cleared = (scores: HighScores): HighScores => ({ ...EMPTY, player: scores.player });
