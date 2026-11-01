import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import { KEY_NAMES } from './common/keys.ts';
import { SIZES } from './logic.ts';

/** Sound events, with the original's defaults (cheesy.exe registers them at start). */
export const SOUND_EVENTS = {
  'Cheesy Pursuit Start': '',
  'Cheesy Pursuit Exit': '',
  'Eat Cheese': 'mouse_7',
  'Eat Gouda': 'mouse_9',
  'Eat CheeseBomb': 'mouse_7',
  'Detonate CheeseBomb': 'burp',
  'Out of CheeseBombs': 'cuckoo',
  'Cat Gets Mouse': 'mouse_5',
  'Level Complete': 'instr_1',
  Defeat: 'instr_2',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export type Action = 'up' | 'down' | 'left' | 'right' | 'bomb';

export interface Settings extends Extras {
  /** Index in SIZES: 5 x 3, 7 x 5 (the default), 9 x 7. */
  size: number;
  /** 0: Hector Cheesman (white), 1: Nestor Cheesman (brown). */
  mouse: number;
  /** Player Keys: the name of the key (in KEYS) of each action. */
  keys: Record<Action, string>;
}

export const MOUSE_NAMES = ['Hector Cheesman', 'Nestor Cheesman'];

/** The original's PlayingBoard: no option changes it, so always board 3 of board.bmp, "Beveled". */
export const BOARD = 3;

const DEFAULTS: Settings = {
  size: 1,
  mouse: 0,
  keys: { up: 'Up', down: 'Down', left: 'Left', right: 'Right', bomb: 'Space' },
  // Brown Scrunch, as the original's default (help id 2230 of its window: background 22).
  background: 22,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'cheesy';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const keys = { ...DEFAULTS.keys, ...s.keys };
  for (const action of Object.keys(keys) as Action[]) {
    if (!KEY_NAMES.includes(keys[action])) keys[action] = DEFAULTS.keys[action];
  }
  return {
    ...s,
    size: Number.isInteger(s.size) && s.size >= 0 && s.size < SIZES.length ? s.size : DEFAULTS.size,
    mouse: s.mouse === 1 ? 1 : 0,
    keys,
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
