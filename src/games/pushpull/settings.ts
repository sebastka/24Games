import type { Extras } from '../../shell/ExtrasTab.tsx';
import { load, save } from '../../shell/storage.ts';
import { DEFAULT_SPEED } from '../wari/czgame.ts';

/** Sound events, with the original's defaults (pushpull.exe registers them at start). */
export const SOUND_EVENTS = {
  'Push-Pull Start': '',
  'Push-Pull Exit': '',
  'Move Marker': 'boing_1',
  "Capture Player's Piece": 'baby_lf1',
  "Capture Computer's Piece": 'laugh_1',
  Victory: 'crowd_4',
  Defeat: 'crowd_1',
  Tie: 'stopwach',
};
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
  /** 0 (no animation) or 1-15 (`AnimationSpeed`). */
  speed: number;
}

// The window's help id, 2863, gives the defaults of the background (2863 / 100: Blue Haze), of
// the board ((2863 % 100) / 10: Space) and of the piece set (2863 % 10: Hazards).
const DEFAULTS: Settings = {
  skill: 1,
  playerFirst: true,
  board: 6,
  pieceSet: 3,
  speed: DEFAULT_SPEED,
  background: 28,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'pushpull';

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
