import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';

/**
 * Sound events, with the original's defaults (sechseck.exe registers them at start, FUN_004095e0).
 * "Match n" is played for a piece matching n traits of its neighbours. `ding_6` is not on the CD:
 * the original plays nothing for "Match 7" either.
 */
export const SOUND_EVENTS = {
  'Sechseck Start': '',
  'Sechseck Exit': '',
  'Piece Drag': 'click_5',
  'Match 0': 'click_4',
  'Match 1': 'click_1',
  'Match 2': 'click_2',
  'Match 3': 'click_6',
  'Match 4': 'boing_7',
  'Match 5': 'boing_1',
  'Match 6': 'boing_2',
  'Match 7': 'ding_6',
  'Match 8': 'ding_2',
  'Match 9': 'cymbal_2',
  'Match 10': 'cymbal_1',
  'Match 11': 'crowd_2',
  'Match 12': 'orch_2',
  Penalty: 'bloup',
  'Game Over': 'instr_1',
};
export type SoundEvent = keyof typeof SOUND_EVENTS;

export const BOARD_NAMES = ['Small board', 'Medium board', 'Large board'];

export interface Settings extends Extras {
  /** Index in SIZES (registry BoardSize): 0 small (4×4), 1 medium (6×6), 2 large (8×8). */
  boardSize: number;
  /** Drag the piece itself, or only its outline (DragBitmaps). */
  dragBitmaps: boolean;
  /** Outline the piece under the mouse (ShowDragZones). */
  showDragZones: boolean;
  /** Outline the drop zone under a dragged piece (ShowDropZones). */
  showDropZones: boolean;
}

const DEFAULTS: Settings = {
  boardSize: 1,
  dragBitmaps: true,
  showDragZones: false,
  showDropZones: false,
  // The original's default is derived from the clock; Psychedelic is what it showed.
  background: 18,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'sechseck';

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const boardSize = [0, 1, 2].includes(s.boardSize) ? s.boardSize : 1;
  return { ...s, boardSize, sounds: { ...SOUND_EVENTS, ...s.sounds } };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
