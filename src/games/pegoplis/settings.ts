import layouts from '../../assets/pegoplis/layouts.json';
import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';

/**
 * Sound events, with the original's defaults: "<title> Start" and "<title> Exit", which every
 * game registers, then pegoplis.exe's own (FUN_00401000).
 */
export const SOUND_EVENTS = soundEvents('Pegopolis', {
  'Piece Drag': 'click_5',
  'Piece Drop': 'click_4',
  'Piece Drop Error': 'cuckoo',
  Victory: 'crowd_2',
  Defeat: 'spooky_3',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** CurrentPlayingBoard: index of the layout. */
  layout: number;
  /** PlayingBoard, PlayingPiece: indexes in BOARD_SETS, PIECE_SETS. */
  boardSet: number;
  pieceSet: number;
  /** Animation tab: DragBitmaps (drag the pieces, else outlines), ShowDragZones, ShowDropZones. */
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
}

// The defaults come from the window's help id, 2321: background 23 (Jewels), board
// (2321 % 100) / 10 = 2 (Marble), pieces 2321 % 10 = 1 (Stones).
const DEFAULTS: Settings = {
  layout: 0,
  boardSet: 2,
  pieceSet: 1,
  dragBitmaps: true,
  showDragZones: false,
  showDropZones: false,
  background: 23,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'pegoplis';

const inRange = (v: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : fallback;

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    layout: inRange(s.layout, 0, layouts.length - 1, 0),
    boardSet: inRange(s.boardSet, 0, 7, 2),
    pieceSet: inRange(s.pieceSet, 0, 8, 1),
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
