// A game's high scores: shared by everyone playing on the instance when its server keeps them
// (MariaDB, src/server), kept in this browser otherwise (a static deployment, the server without
// a database, the server unreachable). localStorage holds the last tables seen and the last name
// entered either way, so the tables show at once and offline.
import { useEffect, useState } from 'react';
import { cleanName, cleanScore, TABLE_SIZE, type Entry } from '../shared/highscores.ts';
import { cleared, loadScores, record, saveScores, type HighScores } from './highscores.ts';

export interface ScoreBook {
  scores: HighScores;
  /** Records a high score at `place` of `table` (the place the game computed; the server re-ranks it). */
  record: (table: string | number, place: number, name: string, score: string | number) => void;
  /**
   * Clear Scores: only for tables kept in this browser (undefined while the tables are shared, so
   * that no player empties everyone's table, and until it is known).
   */
  clear?: (table: string | number) => void;
}

type Mode = 'unknown' | 'shared' | 'local';

/** Entries from the server, checked. */
function entries(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((e: { name?: unknown; score?: unknown }) => {
      const name = cleanName(e?.name);
      const score = cleanScore(e?.score);
      return name && score ? [{ name, score }] : [];
    })
    .slice(0, TABLE_SIZE);
}

/** The game's shared tables, or null when the server does not share them (or cannot be reached). */
async function fetchTables(game: string): Promise<Record<string, Entry[]> | null> {
  try {
    const res = await fetch(`/api/scores/${game}`, { headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const body = (await res.json()) as { shared?: unknown; tables?: Record<string, unknown> };
    if (body.shared !== true || !body.tables || typeof body.tables !== 'object') return null;
    return Object.fromEntries(Object.entries(body.tables).map(([k, t]) => [k, entries(t)]));
  } catch {
    return null;
  }
}

/** Sends a score; the table after it, or null if it did not reach the server. */
async function postScore(game: string, table: string, name: string, score: string): Promise<Entry[] | null> {
  try {
    const res = await fetch(`/api/scores/${game}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, score }),
      // Poker Machine records the balance as its window closes.
      keepalive: true,
    });
    if (!res.ok) return null;
    return entries(((await res.json()) as { table?: unknown }).table);
  } catch {
    return null;
  }
}

/**
 * The high scores of `game`. `settingsKey`: where earlier versions kept them (see `loadScores`).
 */
export function useHighScores(game: string, settingsKey?: string): ScoreBook {
  const [scores, setScores] = useState<HighScores>(() => loadScores(game, settingsKey));
  const [mode, setMode] = useState<Mode>('unknown');

  useEffect(() => saveScores(game, scores), [game, scores]);

  useEffect(() => {
    let current = true;
    void fetchTables(game).then((tables) => {
      if (!current) return;
      setMode(tables ? 'shared' : 'local');
      if (tables) setScores((s) => ({ ...s, tables }));
    });
    return () => {
      current = false;
    };
  }, [game]);

  return {
    scores,
    record: (table, place, name, score) => {
      const key = String(table);
      // At once in this browser; then the server's table, which has everyone's scores.
      setScores((s) => record(s, key, place, name, score));
      if (mode === 'local') return;
      const clean = cleanScore(score);
      const who = cleanName(name);
      if (!clean || !who) return;
      void postScore(game, key, who, clean).then((table) => {
        if (table) setScores((s) => ({ ...s, tables: { ...s.tables, [key]: table } }));
      });
    },
    clear: mode === 'local' ? (table) => setScores((s) => cleared(s, table)) : undefined,
  };
}
