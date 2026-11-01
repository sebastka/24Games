import { lookFromHelpId, type CardLook } from '../../shell/cards/draw.ts';
import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';

export const TITLE = 'Poker Machine';

/** Sound events, with the original's defaults (pokermat.exe registers them at start). */
export const SOUND_EVENTS = soundEvents(TITLE, {
  'Change Bet': 'slotcoin',
  'Deal Cards': 'cardshuf',
  'Flip Card - Front': 'click_5',
  'Flip Card - Back': 'click_4',
  Jackpot: 'slotjack',
  'You are Broke': 'instr_2',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** The main window's help id: Classic faces, Casino backs, a green background. */
const HELP_ID = 240;

export interface Settings extends Extras, CardLook {
  /** Options › Game To Play (GameType): 0 straight, 1 jokers wild, 2 deuces wild. */
  type: number;
  /** The name signed in with (PlayerName). */
  playerName: string;
}

const DEFAULTS: Settings = {
  type: 0,
  ...lookFromHelpId(HELP_ID),
  background: Math.floor(HELP_ID / 100),
  soundEnabled: true,
  sounds: SOUND_EVENTS,
  playerName: '',
};

const KEY = 'pokermat';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return { ...s, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
