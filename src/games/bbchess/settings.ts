import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';

/**
 * Sound events, with the original's defaults: "<title> Start" and "<title> Exit", which every
 * game registers, then bbchess.exe's own (FUN_00401488).
 */
export const SOUND_EVENTS = soundEvents('Black Box Chess', {
  'Piece Drag': 'click_5',
  'Piece Drop': 'click_4',
  'Click Board Square': 'pop1',
  Victory: 'charge',
  'Bad Guess': 'cuckoo',
  'Give Up': 'instr_4',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** PlayingBoard: index in BOARD_SETS. */
  boardSet: number;
  /** Animation tab: DragBitmaps (drag the pieces, else outlines), ShowDragZones, ShowDropZones. */
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
}

// The defaults come from the window's help id, 2520: background 25 (Red Vinyl), board
// (2520 % 100) / 10 = 2 (Marble).
const DEFAULTS: Settings = {
  boardSet: 2,
  dragBitmaps: true,
  showDragZones: false,
  showDropZones: false,
  background: 25,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'bbchess';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const boardSet = Number.isInteger(s.boardSet) && s.boardSet >= 0 && s.boardSet <= 7 ? s.boardSet : 2;
  return { ...s, boardSet, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
