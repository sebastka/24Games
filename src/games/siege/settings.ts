import type { Extras } from '../../shell/ExtrasTab.tsx';
import { DRAG_DEFAULTS, type DragOptions } from '../../shell/cards/drag.ts';
import { lookFromHelpId, type CardLook } from '../../shell/cards/draw.ts';
import { load, save } from '../../shell/storage.ts';

export const TITLE = 'Siege';

/** Sound events, with the original's defaults (siege.exe registers them at start). */
export const SOUND_EVENTS = {
  [`${TITLE} Start`]: '',
  [`${TITLE} Exit`]: '',
  'Deal Cards': 'cardshuf',
  'Drag Card': 'click_5',
  'Drop to Foundation': 'click_2',
  'Drop to Tableau': 'click_4',
  Victory: 'handel',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The main window's help id: Art Deco faces, the Purple Haze background. */
const HELP_ID = 2401;

export interface Settings extends Extras, CardLook, DragOptions {
  /** Options › Foundations: the aces start on the foundations (AcesPlaced). */
  acesPlaced: boolean;
}

const DEFAULTS: Settings = {
  acesPlaced: true,
  ...lookFromHelpId(HELP_ID),
  ...DRAG_DEFAULTS,
  background: Math.floor(HELP_ID / 100),
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'siege';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return { ...s, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
