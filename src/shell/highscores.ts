// The high scores of a game in the browser: its tables, and the last name entered. The originals
// keep them in the registry ("Name_<table>_<n>", "Score_<table>_<n>", "PlayerName"); here they
// are kept in localStorage, which also caches the tables the server shares (useHighScores.ts).
// The ranking rules are in src/shared/highscores.ts; the dialogs in HallOfFame.tsx.
import { insert, TABLE_SIZE, type Entry, type Table } from '../shared/highscores.ts';
import { load, save } from './storage.ts';

export { insert, placeOf, scoreValue, TABLE_SIZE, type Entry, type Table } from '../shared/highscores.ts';

export interface HighScores {
  /** By table: "0" for the games with one, else the skill level, board size or variant. */
  tables: Readonly<Record<string, Table>>;
  /** The last name entered, offered for the next high score (PlayerName). */
  player: string;
}

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
