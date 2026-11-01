// Geometry of Wari's window (608×300, wari.exe's window resource): the pits
// (`FUN_0040a3a0`), their counters (`FUN_0040a450`) and the messages. Pure.
import type { Rect } from '../../shell/czgame/draw.ts';
import { COMPUTER_GOAL, PLAYER_GOAL } from './logic.ts';

export const WIDTH = 608;
export const HEIGHT = 300;

export function pitRect(pit: number): Rect {
  if (pit < 6) return { left: 81 + 76 * pit, top: 229, right: 147 + 76 * pit, bottom: 294 };
  if (pit > 6 && pit < 13) return { left: 993 - 76 * pit, top: 5, right: 1059 - 76 * pit, bottom: 71 };
  if (pit === PLAYER_GOAL) return { left: 537, top: 5, right: 603, bottom: 294 };
  return { left: 5, top: 5, right: 71, bottom: 294 };
}

/** The black box showing a pit's count: above the player's pits, below the computer's, inside of the goals. */
export function counterRect(pit: number): Rect {
  const r = pitRect(pit);
  if (pit < 6) return { left: r.left + 20, top: r.top - 32, right: r.right - 20, bottom: r.top - 6 };
  if (pit === PLAYER_GOAL) return { left: r.left - 32, top: r.top + 131, right: r.left - 6, bottom: r.bottom - 131 };
  if (pit === COMPUTER_GOAL)
    return { left: r.right + 6, top: r.top + 131, right: r.right + 32, bottom: r.bottom - 131 };
  return { left: r.left + 20, top: r.bottom + 6, right: r.right - 20, bottom: r.bottom + 32 };
}

/** The "another turn" messages, over the logo. */
export const MESSAGE: Rect = { left: 125, top: 120, right: 482, bottom: 179 };

/**
 * Where a piece lands in a pit: anywhere a 32×32 piece fits, 2 pixels inside the frame
 * (`FUN_00409530`, `FUN_00409f30`).
 */
export function piecePosition(pit: number, random: () => number): { x: number; y: number } {
  const r = pitRect(pit);
  const w = r.right - r.left + 1;
  const h = r.bottom - r.top + 1;
  return { x: r.left + 2 + Math.floor(random() * (w - 35)), y: r.top + 2 + Math.floor(random() * (h - 35)) };
}
