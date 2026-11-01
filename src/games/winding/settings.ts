import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';

/** Sound events, with the original's defaults (winding.exe registers them at start). */
export const SOUND_EVENTS = soundEvents('Winding Standoff', {
  'Piece Drag From Store': 'click_5',
  'Enemy Move From Store': 'instr_9',
  'Piece Drag': 'click_4',
  'Enemy Piece Move': 'instr_9',
  Victory: 'orch_3',
  Defeat: 'instr_2',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** 1 Easy, 2 Moderate, 3 Difficult, 4 Expert (`SkillLevel`). */
  skill: number;
  /** `PlayerGoesFirst`. */
  playerFirst: boolean;
  /** Index in BOARD_NAMES (`PlayingBoard`). */
  board: number;
  /** Index in PIECE_SET_NAMES (`PlayingPiece`). */
  pieceSet: number;
  /** 0 (no animation) or 1-15 (`AnimationSpeed`); 3 by default in this game. */
  speed: number;
  /** Drag the pieces themselves, or their outlines (`DragBitmaps`). */
  dragPieces: boolean;
  /** Flash the pieces that can be dragged under the mouse (`ShowDragZones`). */
  showDragZones: boolean;
  /** Flash the squares where a dragged piece can be dropped (`ShowDropZones`). */
  showDropZones: boolean;
}

// The window's help id, 2414, gives the defaults of the background (2414 / 100: Purple Haze),
// of the board ((2414 % 100) / 10: Purple & Gold) and of the piece set (2414 % 10: Zen/Dragon).
const DEFAULTS: Settings = {
  skill: 1,
  playerFirst: true,
  board: 1,
  pieceSet: 4,
  speed: 3,
  dragPieces: true,
  showDragZones: false,
  showDropZones: true,
  background: 24,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'winding';

const within = (n: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= max ? (n as number) : fallback;

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    skill: within(s.skill, 1, 4, DEFAULTS.skill),
    board: within(s.board, 0, 7, DEFAULTS.board),
    pieceSet: within(s.pieceSet, 0, 8, DEFAULTS.pieceSet),
    speed: within(s.speed, 0, 15, DEFAULTS.speed),
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
