import type { Extras } from '../../shell/ExtrasTab.tsx';
import { isKey, KEY_NAMES } from '../../shell/keys.ts';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import type { Action } from './logic.ts';

/** Sound events, with the original's defaults (stackblz.exe registers them at start, FUN_00407c80). */
export const SOUND_EVENTS = soundEvents('StackBlitz', {
  'Rotate Up': 'click_5',
  'Rotate Down': 'click_4',
  'Piece Landing': 'click_1',
  'Vertical Stack': 'boing_3',
  'Horizontal Stack': 'boing_1',
  'Diagonal Stack': 'boing_4',
  Bomb: 'pop3',
  'New Level': 'laugh_1',
  'Game Over': 'dig_7',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

/** Piece sets (type 273 id 256), StarView bitmaps 300-306: rows of pieces.png. */
export const PIECE_SETS = ['Circles', 'Squares', 'Faces', 'Bevels', 'Traffic', 'Flags', 'Monochrome'];

/** The five game keys, in the order of the Keys tab's registry values. */
export const KEY_ACTIONS: readonly { action: Action; label: string }[] = [
  { action: 'left', label: 'Piece Left' },
  { action: 'right', label: 'Piece Right' },
  { action: 'drop', label: 'Drop Piece' },
  { action: 'rotateUp', label: 'Rotate Up' },
  { action: 'rotateDown', label: 'Rotate Down' },
];

const keyIndex = (name: string): number => KEY_NAMES.indexOf(name);

export interface Settings extends Extras {
  /** Row of pieces.png (registry PieceToUse). */
  pieceSet: number;
  /** Index in KEY_NAMES of each action's key (registry KeyLeft, KeyRight…). */
  keys: Record<Action, number>;
}

const DEFAULTS: Settings = {
  pieceSet: 0,
  // As the original's defaults: "Rotate Up" is the Down arrow (the pieces move down).
  keys: {
    left: keyIndex('Left'),
    right: keyIndex('Right'),
    drop: keyIndex('Space'),
    rotateUp: keyIndex('Down'),
    rotateDown: keyIndex('Up'),
  },
  // The original's default is derived from the clock; Psychedelic is what it showed most.
  background: 18,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'stackblz';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const pieceSet = Number.isInteger(s.pieceSet) && s.pieceSet >= 0 && s.pieceSet < PIECE_SETS.length ? s.pieceSet : 0;
  return { ...s, pieceSet, keys: { ...DEFAULTS.keys, ...s.keys }, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);

/** The action bound to a key event, if any. */
export const actionFor = (keys: Settings['keys'], e: { code: string }): Action | undefined =>
  KEY_ACTIONS.find(({ action }) => isKey(e, KEY_NAMES[keys[action]] ?? ''))?.action;
