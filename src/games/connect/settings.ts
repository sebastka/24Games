import { defaults, loadSettings, saveSettings, type BoardSettings } from '../reversi/shared/settings.ts';

/** Sound events, with the original's defaults (connect.exe registers them at start). */
export const SOUND_EVENTS = {
  'Checker Connector Start': '',
  'Checker Connector Exit': '',
  'Player Piece Move': 'boing_3',
  'Enemy Piece Move': 'instr_9',
  'Player in Check': 'cuckoo',
  Victory: 'crowd_3',
  Defeat: 'laugh_4',
  Tie: 'stopwach',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends BoardSettings {
  /** Registry PlayerGoesFirst (default yes). */
  playerFirst: boolean;
}

/** Help id 66: Space board, Solar/Lunar pieces (the board fills the window: no background). */
const DEFAULTS: Settings = { ...defaults(66, SOUND_EVENTS), playerFirst: true };

const KEY = 'connect';

export function loadConnectSettings(): Settings {
  const s = loadSettings(KEY, DEFAULTS);
  return { ...s, playerFirst: s.playerFirst !== false };
}

export const saveConnectSettings = (s: Settings): void => saveSettings(KEY, s);
