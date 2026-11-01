// The window of Engulf (`FUN_00401000`, drawn by `FUN_004039e0` and `FUN_00403c10`): 512×302.
import type { Point } from '../reversi/shared/animate.ts';
import { SQUARE } from '../reversi/shared/assets.ts';
import { xOf, yOf } from './logic.ts';

export const WIDTH = 512;
export const HEIGHT = 302;
export const ORIGIN = 11;
export const FRAME = { left: 4, top: 4, right: 297, bottom: 297 };
export const SCORE_BOX = { left: 301, top: 64, right: 508, bottom: 100 };
/** The computer's panel, then the player's: box, name, "Score", the count's sunken box. */
export const PANELS = [
  {
    box: { left: 301, top: 104, right: 403, bottom: 282 },
    name: { left: 303, top: 108, right: 401, bottom: 124 },
    score: { left: 303, top: 128, right: 403, bottom: 144 },
    count: { left: 309, top: 152, right: 395, bottom: 274 },
  },
  {
    box: { left: 407, top: 104, right: 508, bottom: 282 },
    name: { left: 409, top: 108, right: 506, bottom: 124 },
    score: { left: 409, top: 128, right: 506, bottom: 144 },
    count: { left: 415, top: 152, right: 500, bottom: 274 },
  },
];
export const LOGO_AT = { x: 328, y: 15 };

/** The top-left corner of the piece on square `i` (column-major). */
export const pieceAt = (i: number): Point => ({ x: ORIGIN + 4 + xOf(i) * SQUARE, y: ORIGIN + 4 + yOf(i) * SQUARE });
