import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import type { Skill } from './logic.ts';

/**
 * Sound events, with the original's defaults: "<title> Start" and "<title> Exit", which every
 * game registers (FUN_00402dc0), then match.exe's own (FUN_00401100).
 */
export const SOUND_EVENTS = soundEvents('CardMatch', {
  'Flip Card': 'click_4',
  'Make a match': 'boing_6',
  Victory: 'baby_lf3',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  skill: Skill;
}

const DEFAULTS: Settings = {
  skill: 2,
  // Paintball, the original's default (its window's help id, 2000, / 100).
  background: 20,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'match';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const skill = s.skill === 1 || s.skill === 2 || s.skill === 3 ? s.skill : 2;
  return { ...s, skill, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
