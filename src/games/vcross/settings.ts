import type { Extras } from '../../shell/ExtrasTab.tsx';
import { DRAG_DEFAULTS, type DragOptions } from '../../shell/cards/drag.ts';
import { lookFromHelpId, type CardLook } from '../../shell/cards/draw.ts';
import { load, save } from '../../shell/storage.ts';

export const TITLE = 'Vanishing Cross';

/** Sound events, with the original's defaults (vcross.exe registers them at start). */
export const SOUND_EVENTS = {
  [`${TITLE} Start`]: '',
  [`${TITLE} Exit`]: '',
  'Deal Cards': 'cardshuf',
  'Deal from Stock': 'click_4',
  'Drag Card': 'click_5',
  'Drop to Foundation': 'click_1',
  'Drop to Tableau': 'click_4',
  Victory: 'crowd_4',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The main window's help id: Art Deco faces, Wyrm backs, the Blue Haze background. */
const HELP_ID = 2831;

export interface Settings extends Extras, CardLook, DragOptions {
  /** Options › Foundations: build on the value of a first dealt card (BuildOnInitial). */
  buildOnInitial: boolean;
}

const DEFAULTS: Settings = {
  buildOnInitial: true,
  ...lookFromHelpId(HELP_ID),
  ...DRAG_DEFAULTS,
  background: Math.floor(HELP_ID / 100),
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'vcross';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return { ...s, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
