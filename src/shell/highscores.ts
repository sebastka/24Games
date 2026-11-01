// The high score tables ("Hall of Fame") of CZGAME's games: the same code is linked into each
// game (FUN_004080b0-FUN_00408ad0 in match.exe, FUN_004066c0 and following in stackblz.exe,
// FUN_00401000-FUN_00401f09 in pokergrd.exe…). Ten names and scores per table, kept as strings
// in the registry as "Name_<table>_<n>" and "Score_<table>_<n>", with the last name entered as
// "PlayerName". A game has one table, or one per skill level, board size or variant. Pure: no
// DOM (the dialogs are in HallOfFame.tsx).
import { load, save } from './storage.ts';

export const TABLE_SIZE = 10;

export interface Entry {
  name: string;
  /** As shown: a number, or CardMatch's times ("1:13"). */
  score: string;
}

/** The entries of a table, best first; the places after them are free. */
export type Table = readonly Entry[];

export interface HighScores {
  /** By table: "0" for the games with one, else the skill level, board size or variant. */
  tables: Readonly<Record<string, Table>>;
  /** The last name entered, offered for the next high score (PlayerName). */
  player: string;
}

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

/** Table `key` of `scores` (empty if never filled). */
export const tableOf = (scores: HighScores, key: string | number): Table => scores.tables[key] ?? [];

/**
 * `scores` after a high score: `name` and `score` at `place` of table `key`, and `name` kept as
 * the one to offer next time.
 */
export const record = (
  scores: HighScores,
  key: string | number,
  place: number,
  name: string,
  score: string | number,
): HighScores => ({
  tables: { ...scores.tables, [key]: insert(tableOf(scores, key), place, name, score) },
  player: name,
});

/** Clear Scores (`FUN_00408500` in match.exe): every place of table `key` free; the name is kept. */
export const cleared = (scores: HighScores, key: string | number): HighScores => ({
  ...scores,
  tables: { ...scores.tables, [key]: [] },
});

/** The entries of a stored table, of any of the formats below: the filled places, in order. */
function entries(raw: unknown): Entry[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.values(raw as Record<string, unknown>)
    .flatMap((e) => {
      const { name, score } = (e ?? {}) as { name?: unknown; score?: unknown };
      if (typeof name !== 'string') return [];
      if (typeof score === 'number' && Number.isFinite(score)) return [{ name, score: String(score) }];
      return typeof score === 'string' && score !== '' ? [{ name, score }] : [];
    })
    .slice(0, TABLE_SIZE);
}

/** Stored scores, of any format, checked. */
function parse(raw: { tables?: unknown; scores?: unknown; player?: unknown; playerName?: unknown }): HighScores {
  const tables = raw.tables ?? raw.scores;
  const player = raw.player ?? raw.playerName;
  return {
    tables: Object.fromEntries(
      Object.entries(tables && typeof tables === 'object' ? tables : {}).map(([k, t]) => [k, entries(t)]),
    ),
    player: typeof player === 'string' ? player : '',
  };
}

const NONE = {};

/**
 * The high scores of `game`, in localStorage under `<game>.scores`. Scores kept by earlier
 * versions of the web games are read as well, until the first save: a `<game>.scores` of
 * another shape (tables as arrays, with free places as null, numbers as scores, `playerName`),
 * `<game>.hall-of-fame` (StackBlitz, Sechseck), or the `scores` and `playerName` of the game's
 * settings under `settingsKey` (the card games, Voracity).
 */
export function loadScores(game: string, settingsKey?: string): HighScores {
  for (const key of [`${game}.scores`, `${game}.hall-of-fame`, settingsKey]) {
    if (!key) continue;
    const raw = load<Record<string, unknown>>(key, NONE);
    if (raw !== NONE && (raw.tables ?? raw.scores)) return parse(raw);
  }
  return { tables: {}, player: '' };
}

export const saveScores = (game: string, scores: HighScores): void => save(`${game}.scores`, scores);
