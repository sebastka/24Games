import { defaults, loadSettings, saveSettings, type BoardSettings } from '../reversi/shared/settings.ts';

/** Sound events, with the original's defaults (meltdown.exe registers them at start). */
export const SOUND_EVENTS = {
  'Core Meltdown Start': '',
  'Core Meltdown Exit': '',
  'Player Expands': 'click_1',
  'Player Captures': 'click_4',
  'Computer Expands': 'instr_9',
  'Computer Captures': 'click_5',
  Victory: 'baby_lf3',
  Defeat: 'spooky_2',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends BoardSettings {
  /** Registry PlayerGoesFirst (default yes). */
  playerFirst: boolean;
  /** Registry BoardSize: 5, 6 (default) or 7 squares a side. */
  boardSize: number;
}

/** Help id 2530: Red Vinyl background, Beveled board, Checkers. */
const DEFAULTS: Settings = { ...defaults(2530, SOUND_EVENTS), playerFirst: true, boardSize: 6 };

const KEY = 'meltdown';

export function loadMeltdownSettings(): Settings {
  const s = loadSettings(KEY, DEFAULTS);
  // The original reads sizes outside 5-7 as 7.
  const boardSize = [5, 6, 7].includes(s.boardSize) ? s.boardSize : 7;
  return { ...s, playerFirst: s.playerFirst !== false, boardSize };
}

export const saveMeltdownSettings = (s: Settings): void => saveSettings(KEY, s);
