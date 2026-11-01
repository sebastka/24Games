import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import { MAX_SIZE, MIN_SIZE } from './logic.ts';

/**
 * Sound events, with the original's defaults: "<title> Start" and "<title> Exit", which every
 * game registers, then quinto.exe's own (FUN_00408120).
 */
export const SOUND_EVENTS = soundEvents('Quinto', {
  'Flip Pieces': 'click_4',
  'Puzzle Solved': 'handel',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** HorizSize, VertSize: 5 to 8. */
  width: number;
  height: number;
  /** PlayingBoard, PlayingPiece: indexes in BOARD_SETS, PIECE_SETS. */
  boardSet: number;
  pieceSet: number;
}

// The defaults come from the window's help id, 2525: background 25 (Red Vinyl), board
// (2525 % 100) / 10 = 2 (Marble), pieces 2525 % 10 = 5 (Happies/Angries).
const DEFAULTS: Settings = {
  width: 5,
  height: 5,
  boardSet: 2,
  pieceSet: 5,
  background: 25,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'quinto';

const inRange = (v: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fallback;

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    width: inRange(s.width, MIN_SIZE, MAX_SIZE, 5),
    height: inRange(s.height, MIN_SIZE, MAX_SIZE, 5),
    boardSet: inRange(s.boardSet, 0, 7, 2),
    pieceSet: inRange(s.pieceSet, 0, 8, 5),
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
