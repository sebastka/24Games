import { DRAG_DEFAULTS, type DragOptions } from '../../shell/cards/drag.ts';
import { lookFromHelpId, type CardLook } from '../../shell/cards/draw.ts';
import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import type { Variant } from './logic.ts';

export const TITLE = 'Poker Patience';

/**
 * Sound events, with the original's defaults (pokergrd.exe registers them at start, after the
 * "<title> Start" and "<title> Exit" events every game has, without a default sound).
 */
export const SOUND_EVENTS = soundEvents(TITLE, {
  'Deal Cards': 'cardshuf',
  'Drag Card': 'click_5',
  'Drop Card': 'click_4',
  'Game Over': 'baby_lf3',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The main window's help id, which the original reads its default looks from. */
const HELP_ID = 1851;

export type Settings = Extras & Variant & CardLook & DragOptions;

const DEFAULTS: Settings = {
  twoPiles: true,
  faceUp: false,
  ...lookFromHelpId(HELP_ID),
  ...DRAG_DEFAULTS,
  // Psychedelic: the help id's hundreds.
  background: Math.floor(HELP_ID / 100),
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'pokergrd';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return { ...s, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
