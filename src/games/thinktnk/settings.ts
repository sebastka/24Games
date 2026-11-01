import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import { KEY_NAMES } from '../cheesy/common/keys.ts';

/** Sound events, with the original's defaults (thinktnk.exe registers them at start). */
export const SOUND_EVENTS = {
  'Think Tank Start': '',
  'Think Tank Exit': '',
  'Begin Level': 'charge',
  'Level Complete': 'crowd_4',
  'Player Fires Gun': 'gunshot',
  'Enemy Fires Gun': 'gunshot3',
  'Get Green Pellet': 'dig_5',
  'Get Extra Shot': 'gunshot5',
  'Get Fast Tank': 'carpass2',
  'Get Fast Bullets': 'dig_4',
  'Get Extra Tank': 'handel',
  'Enemy Destroyed': 'gunshot6',
  'Player Destroyed': 'gunshot2',
  Defeat: 'dig_7',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export type Action = 'up' | 'down' | 'left' | 'right' | 'fire';

export interface Settings extends Extras {
  /** Player Keys: the name of the key (in KEYS) of each action. */
  keys: Record<Action, string>;
}

const DEFAULTS: Settings = {
  keys: { up: 'Up', down: 'Down', left: 'Left', right: 'Right', fire: 'Space' },
  // Light Red, as the original's default (help id 1200 of its window: background 12).
  background: 12,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'thinktnk';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const keys = { ...DEFAULTS.keys, ...s.keys };
  for (const action of Object.keys(keys) as Action[]) {
    if (!KEY_NAMES.includes(keys[action])) keys[action] = DEFAULTS.keys[action];
  }
  return { ...s, keys, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
