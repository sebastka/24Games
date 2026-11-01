import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import { SIZES, TABLE_SIZE, type Entry } from './logic.ts';

/** Sound events, with the original's defaults (voracity.exe registers them at start). */
export const SOUND_EVENTS = {
  'Voracity Start': '',
  'Voracity Exit': '',
  'Move Piece': 'click_4',
  'Game Over - High Score': 'crowd_2',
  'Game Over - No High': 'charge',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The tile sets (string 256), in the order of the Pieces list. */
export const TILE_SETS = ['Plain', 'Red', 'Green', 'Blue', 'Colorful', 'Monochrome'];

export interface Settings extends Extras {
  /** 15, 19, 22 or 25 (`BoardSize`). */
  size: number;
  /** Index in TILE_SETS (`PiecesToUse`). */
  tiles: number;
  /** The Hall of Fame of each board size. */
  scores: Record<string, Entry[]>;
  /** The last name entered in the Hall of Fame (`PlayerName`). */
  playerName: string;
}

// The window's help id, 0, gives the default background (black, hidden by the board).
const DEFAULTS: Settings = {
  size: 19,
  tiles: 0,
  scores: {},
  playerName: '',
  background: 0,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'voracity';

const validEntries = (list: unknown): Entry[] =>
  Array.isArray(list)
    ? list.filter((e): e is Entry => typeof e?.name === 'string' && Number.isInteger(e?.score)).slice(0, TABLE_SIZE)
    : [];

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    size: SIZES.includes(s.size) ? s.size : DEFAULTS.size,
    tiles: Number.isInteger(s.tiles) && s.tiles >= 0 && s.tiles < TILE_SETS.length ? s.tiles : 0,
    scores: Object.fromEntries(SIZES.map((n) => [n, validEntries(s.scores?.[n])])),
    playerName: typeof s.playerName === 'string' ? s.playerName : '',
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
