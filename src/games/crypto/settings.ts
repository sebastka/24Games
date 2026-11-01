import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import type { Skill } from './logic.ts';

/**
 * Sound events, with the original's defaults: "<title> Start" and "<title> Exit", which every
 * game registers, then crypto.exe's own (FUN_00401000).
 */
export const SOUND_EVENTS = {
  'Cryptograms Start': '',
  'Cryptograms Exit': '',
  'Click a Cell': 'click_4',
  'Change a Letter': 'click_3',
  Victory: 'orch_2',
  'Victory -No Hints': 'handel',
  Defeat: 'instr_2',
  Hint: 'instr_9',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  skill: Skill;
}

const DEFAULTS: Settings = {
  skill: 1,
  // Unused: the play field is the game's own picture (the Extras tab has no background).
  background: 0,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'crypto';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const skill = ([1, 2, 3, 4] as const).find((k) => k === s.skill) ?? 1;
  return { ...s, skill, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
