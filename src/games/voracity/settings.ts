import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import { SIZES } from './logic.ts';

/** Sound events, with the original's defaults (voracity.exe registers them at start). */
export const SOUND_EVENTS = soundEvents('Voracity', {
  'Move Piece': 'click_4',
  'Game Over - High Score': 'crowd_2',
  'Game Over - No High': 'charge',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The tile sets (string 256), in the order of the Pieces list. */
export const TILE_SETS = ['Plain', 'Red', 'Green', 'Blue', 'Colorful', 'Monochrome'];

export interface Settings extends Extras {
  /** 15, 19, 22 or 25 (`BoardSize`). */
  size: number;
  /** Index in TILE_SETS (`PiecesToUse`). */
  tiles: number;
}

// The window's help id, 0, gives the default background (black, hidden by the board).
const DEFAULTS: Settings = {
  size: 19,
  tiles: 0,
  background: 0,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'voracity';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    size: SIZES.includes(s.size) ? s.size : DEFAULTS.size,
    tiles: Number.isInteger(s.tiles) && s.tiles >= 0 && s.tiles < TILE_SETS.length ? s.tiles : 0,
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
