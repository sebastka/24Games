import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import { END_SCREEN } from './progress.ts';

/** Sound events, with the original's defaults (bulldoze.exe registers them at start). */
export const SOUND_EVENTS = {
  Move: '',
  'Move Rock': '',
  'Move Rock To Target': 'click_4',
  'Complete Level': 'crowd_3',
  'Receive Password': 'crowd_2',
  'Complete Final Level': 'handel',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** 0: Bulldozer (colour), 1: Monochrome. */
  pieceSet: number;
  /** Level being played: the original starts at level 1 on every launch; kept here (see DECISIONS.md). */
  level: number;
}

export const PIECE_SETS = ['Bulldozer', 'Monochrome'];

const DEFAULTS: Settings = {
  pieceSet: 0,
  level: 1,
  // Brown (olive), as the original's default.
  background: 6,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'bulldozer';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const level = Number.isInteger(s.level) && s.level >= 1 && s.level <= END_SCREEN ? s.level : 1;
  return { ...s, level, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
