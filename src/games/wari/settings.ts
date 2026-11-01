import { DEFAULT_SPEED } from '../../shell/czgame/animate.ts';
import type { Extras } from '../../shell/ExtrasTab.tsx';
import { soundEvents } from '../../shell/soundEvents.ts';
import { load, save } from '../../shell/storage.ts';

/** Sound events, with the original's defaults (wari.exe registers them at start). */
export const SOUND_EVENTS = soundEvents('Wari', {
  'Pick Up - Empty Pit': 'click_5',
  'Pick Up - Full Pit': 'click_5',
  'Drop - Empty Pit': 'click_4',
  'Drop - Full Pit': 'click_4',
  Victory: 'instr_5',
  Defeat: 'gong_1',
  Tie: 'stopwach',
});
export type SoundEvent = keyof typeof SOUND_EVENTS;

export interface Settings extends Extras {
  /** 1 Easy, 2 Moderate, 3 Difficult, 4 Expert (`SkillLevel`). */
  skill: number;
  /** Pieces per pit, 1-6, or 0 for Random (`NumPiecesPerCell`). */
  perPit: number;
  /** `PlayerGoesFirst`. */
  playerFirst: boolean;
  /** Index in PIECE_SETS (`PlayingPiece`). */
  pieceSet: number;
  /** 0 (no animation) or 1-15 (`AnimationSpeed`). */
  speed: number;
}

// The window's help id, 401, gives the defaults of the background (401 / 100: Red) and of the
// piece set (401 % 10: Stones).
const DEFAULTS: Settings = {
  skill: 1,
  perPit: 0,
  playerFirst: true,
  pieceSet: 1,
  speed: DEFAULT_SPEED,
  background: 4,
  soundEnabled: true,
  sounds: SOUND_EVENTS,
};

const KEY = 'wari';

const within = (n: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= max ? (n as number) : fallback;

export function loadSettings(): Settings {
  const s = load(KEY, DEFAULTS);
  return {
    ...s,
    skill: within(s.skill, 1, 4, DEFAULTS.skill),
    perPit: within(s.perPit, 0, 6, DEFAULTS.perPit),
    pieceSet: within(s.pieceSet, 0, 8, DEFAULTS.pieceSet),
    speed: within(s.speed, 0, 15, DEFAULTS.speed),
    sounds: { ...SOUND_EVENTS, ...s.sounds },
  };
}

export const saveSettings = (s: Settings): void => save(KEY, s);
