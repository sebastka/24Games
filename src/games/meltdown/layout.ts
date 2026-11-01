// The window of Core Meltdown (`FUN_00401000`, drawn by `FUN_00402fa0` and `FUN_00403680`):
// 510×291 whatever the board size.
import type { Point } from '../reversi/shared/animate.ts';
import { SQUARE } from '../reversi/shared/assets.ts';
import { COMPUTER, PLAYER, type Side } from './logic.ts';

export const WIDTH = 510;
export const HEIGHT = 291;
export const LOGO_AT = { x: 297, y: 11 };
export const SCORE_BOX = { left: 290, top: 84, right: 507, bottom: 120 };
/** The computer's panel, then the player's: box, name, "Score", the total's sunken box. */
export const PANELS = [
  {
    box: { left: 290, top: 168, right: 398, bottom: 288 },
    name: { left: 292, top: 172, right: 396, bottom: 188 },
    score: { left: 292, top: 192, right: 398, bottom: 208 },
    count: { left: 298, top: 216, right: 390, bottom: 280 },
  },
  {
    box: { left: 400, top: 168, right: 507, bottom: 288 },
    name: { left: 402, top: 172, right: 505, bottom: 188 },
    score: { left: 402, top: 192, right: 505, bottom: 208 },
    count: { left: 408, top: 216, right: 499, bottom: 280 },
  },
];

/** Each side's piece above its panel, where its units fly from. */
export const SIDE_PIECE: Record<Side, Point> = { [COMPUTER]: { x: 328, y: 128 }, [PLAYER]: { x: 437, y: 128 } };

/** The board is centred on (145, 145). */
export const originOf = (n: number): number => 145 - 20 * n;

/** The top-left corner of square `i`. */
export const squareAt = (n: number, i: number): Point => ({
  x: originOf(n) + (i % n) * SQUARE,
  y: originOf(n) + Math.floor(i / n) * SQUARE,
});

/** A square's piece grows with its units: 12, 24, 32, then 40 pixels, centred (`FUN_004031f0`). */
export const pieceSize = (units: number): number => [12, 12, 24, 32][units] ?? 40;
