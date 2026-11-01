import { load, save } from '../../shell/storage.ts';
import { KEY_NAMES } from '../cheesy/common/keys.ts';
import type { Options } from './logic.ts';

/** Sound events, with the original's defaults (maze.exe registers them at start). */
export const SOUND_EVENTS = {
  'MazeRace Start': '',
  'MazeRace Exit': '',
  'Begin New Game': 'charge',
  'White Mouse Thrown': 'mouse_4',
  'Brown Mouse Thrown': 'mouse_5',
  'White Mouse Win': 'mouse_2',
  'Brown Mouse Win': 'mouse_3',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export type Action = 'up' | 'down' | 'left' | 'right';
export type Keys = Record<Action, string>;

/**
 * MazeRace has no window background option (its Extras tab only has the sounds): the maze is
 * drawn on white.
 */
export interface Settings extends Options {
  /** 0: two players; 1 (slow) … 10 (fast): Nestor is the computer (the original's SkillLevel − 1). */
  skill: number;
  keys: [Keys, Keys];
  soundEnabled: boolean;
  sounds: Record<string, string>;
}

const DEFAULTS: Settings = {
  width: 20,
  height: 20,
  visibility: 0,
  playerThrowers: true,
  opponentThrowers: true,
  // SkillLevel 4 when unset: "3" in the list, 800 ms per step.
  skill: 3,
  keys: [
    { up: 'Up', down: 'Down', left: 'Left', right: 'Right' },
    { up: 'W', down: 'X', left: 'A', right: 'D' },
  ],
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'maze';
const SIZES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const keys = DEFAULTS.keys.map((d, i) => {
    const k = { ...d, ...s.keys?.[i] };
    for (const a of Object.keys(k) as Action[]) if (!KEY_NAMES.includes(k[a])) k[a] = d[a];
    return k;
  }) as [Keys, Keys];
  return {
    ...s,
    width: SIZES.includes(s.width) ? s.width : DEFAULTS.width,
    height: SIZES.includes(s.height) ? s.height : DEFAULTS.height,
    visibility: [0, 1, 2].includes(s.visibility) ? s.visibility : 0,
    skill: Number.isInteger(s.skill) && s.skill >= 0 && s.skill <= 10 ? s.skill : DEFAULTS.skill,
    keys,
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
export { SIZES };
