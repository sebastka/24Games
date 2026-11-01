// Settings common to the board games against the computer (the CZGAME32.DLL framework): window
// background and sounds, skill level, piece set, board and animation speed.
import type { Extras } from '../../../shell/ExtrasTab.tsx';
import { load, save } from '../../../shell/storage.ts';
import { BOARDS, PIECE_SETS } from './names.ts';

export interface BoardSettings extends Extras {
  /** 1 (Easy) … 4 (Expert); the registry's SkillLevel, 1 when unset. */
  skill: number;
  /** Index in PIECE_SETS. */
  pieceSet: number;
  /** Index in BOARDS. */
  board: number;
  /** Pixels per animation step, 1 (slow) … 15 (fast); 0: animation disabled. 7 when unset. */
  animation: number;
}

/**
 * The defaults of a game: the window's help id holds its background (hundreds), board (tens)
 * and piece set (units), which the framework uses when the registry has nothing.
 */
export function defaults(helpId: number, sounds: Record<string, string>): BoardSettings {
  return {
    background: Math.floor(helpId / 100),
    board: Math.floor(helpId / 10) % 10,
    pieceSet: helpId % 10,
    skill: 1,
    animation: 7,
    soundEnabled: true,
    sounds,
  };
}

const valid = (n: unknown, max: number): n is number =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

/** The stored settings of game `key`, checked, with any sound event added since filled in. */
export function loadSettings<T extends BoardSettings>(key: string, fallback: T): T {
  const s = load(key, fallback);
  return {
    ...s,
    skill: valid(s.skill, 4) && s.skill > 0 ? s.skill : fallback.skill,
    pieceSet: valid(s.pieceSet, PIECE_SETS.length - 1) ? s.pieceSet : fallback.pieceSet,
    board: valid(s.board, BOARDS.length - 1) ? s.board : fallback.board,
    animation: valid(s.animation, 15) ? s.animation : fallback.animation,
    sounds: { ...fallback.sounds, ...s.sounds },
  };
}

export const saveSettings = (key: string, s: BoardSettings): void => save(key, s);
