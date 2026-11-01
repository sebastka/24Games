import { DEFAULT_SPEED } from '../../shell/czgame/animate.ts';
import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';
import { DEFAULT_PILES, MAX_PILE, ROWS } from './logic.ts';

/** Sound events, with the original's defaults (nim.exe registers them at start). */
export const SOUND_EVENTS = soundEvents('Nim', {
  'Select Pieces': 'click_2',
  'Player removes pieces': 'boing_1',
  'Computer removes pieces': 'bloup',
  Victory: 'crowd_3',
  Defeat: 'instr_2',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** Pile sizes of rows A-F, 0-8 (`Pile0`-`Pile5`). */
  piles: number[];
  /** "Take the Last Piece" wins; otherwise "Leave the Last Piece" (`TakeLastPiece`). */
  takeLast: boolean;
  /** `PlayerGoesFirst`. */
  playerFirst: boolean;
  /** Index in BOARD_NAMES (`PlayingBoard`). */
  board: number;
  /** Index in PIECE_SET_NAMES (`PlayingPiece`). */
  pieceSet: number;
  /** 0 (no animation) or 1-15 (`AnimationSpeed`). */
  speed: number;
}

// The window's help id, 2811, gives the defaults of the background (2811 / 100: Blue Haze), of
// the board ((2811 % 100) / 10: Purple & Gold) and of the piece set (2811 % 10: Stones).
const DEFAULTS: Settings = {
  piles: [...DEFAULT_PILES],
  takeLast: true,
  playerFirst: true,
  board: 1,
  pieceSet: 1,
  speed: DEFAULT_SPEED,
  background: 28,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'nim';

const within = (n: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= max ? (n as number) : fallback;

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  const piles = Array.isArray(s.piles) && s.piles.length === ROWS ? s.piles : DEFAULTS.piles;
  return {
    ...s,
    piles: piles.map((n, i) => within(n, 0, MAX_PILE, DEFAULT_PILES[i]!)),
    board: within(s.board, 0, 7, DEFAULTS.board),
    pieceSet: within(s.pieceSet, 0, 8, DEFAULTS.pieceSet),
    speed: within(s.speed, 0, 15, DEFAULTS.speed),
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
