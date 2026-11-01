import { defaults, loadSettings, saveSettings, type BoardSettings } from './shared/settings.ts';

/** Sound events, with the original's defaults (reversi.exe registers them at start). */
export const SOUND_EVENTS = {
  'Reversi Plus Start': '',
  'Reversi Plus Exit': '',
  "Move Player's Piece": 'boing_3',
  "Move Computer's Piece": 'instr_9',
  "Capture Player's Piece": 'click_1',
  "Capture Computer's Piece": 'click_3',
  Victory: 'crowd_2',
  Defeat: 'instr_4',
  Tie: 'stopwach',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends BoardSettings {
  /** Registry PlayerGoesFirst (default yes). */
  playerFirst: boolean;
  /** Registry StartPositionCrossed (default yes). */
  crossed: boolean;
}

/** Help id 1632: Gray Surface background, Beveled board, Chips. */
const DEFAULTS: Settings = { ...defaults(1632, SOUND_EVENTS), playerFirst: true, crossed: true };

const KEY = 'reversi';

export function loadReversiSettings(): Settings {
  const s = loadSettings(KEY, DEFAULTS);
  return { ...s, playerFirst: s.playerFirst !== false, crossed: s.crossed !== false };
}

export const saveReversiSettings = (s: Settings): void => saveSettings(KEY, s);
