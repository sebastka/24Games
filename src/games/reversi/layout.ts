// The layout of the game window's client area (`FUN_00409920`, drawn by `FUN_0040b520`).
import { COMPUTER, PLAYER, type Side } from './logic.ts';
import type { Point } from './shared/animate.ts';
import { PIECE, SQUARE } from './shared/assets.ts';

export const WIDTH = 560;
export const HEIGHT = 342;
export const ORIGIN = 11;
const MID = 341 + Math.trunc((WIDTH - 4 - 341) / 2);
const BOTTOM = HEIGHT - 25;
export const PANEL = { left: 341, top: 104, right: WIDTH - 4, bottom: 152 };
export const BOXES = [
  { left: 341, top: 156, right: MID - 2, bottom: BOTTOM },
  { left: MID + 2, top: 156, right: WIDTH - 4, bottom: BOTTOM },
];

/** Where each side's piece rests in the panel above the scores (and leaves from to play). */
export const HOME: Record<Side, Point> = {
  [PLAYER]: { x: Math.trunc((MID - 2 - 341 - PIECE) / 2) + 341, y: 112 },
  [COMPUTER]: { x: Math.trunc((WIDTH - 4 - (MID + 2) - PIECE) / 2) + MID + 2, y: 112 },
};

/** The top-left corner of a piece on `square`. */
export const pieceAt = (square: number): Point => ({
  x: ORIGIN + (square % 8) * SQUARE + 4,
  y: ORIGIN + Math.floor(square / 8) * SQUARE + 4,
});
