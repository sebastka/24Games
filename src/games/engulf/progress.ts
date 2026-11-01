// Which layout a new game is played on (`FUN_00401b30`): the same one, a random one
// (`rand() & 0xff`), or the next one, modulo 35.
import type { Rand } from './logic.ts';

/** How the board changes at each new game (registry Progression: Same, Random, Sequential). */
export type Progression = 'same' | 'random' | 'sequential';

export const LAYOUTS = 35;

export function nextLayout(from: number, progression: Progression, rand: Rand): number {
  const index = progression === 'random' ? rand() & 0xff : progression === 'sequential' ? (from + 1) & 0xff : from;
  return index % LAYOUTS;
}

/** What to store so that the next launch replays `board` (Sequential steps back one first). */
export const startingBoardFor = (board: number, progression: Progression): number =>
  progression === 'sequential' ? (board + LAYOUTS - 1) % LAYOUTS : board;
