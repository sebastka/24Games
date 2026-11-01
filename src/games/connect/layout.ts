// The window of Checker Connector (`FUN_00401000`, `FUN_004015c0`): a 7×7 board of 40-pixel
// squares filling the 280×280 client area, the letters A-G on its top row.
import type { Point } from '../reversi/shared/animate.ts';
import { SQUARE } from '../reversi/shared/assets.ts';
import { ROWS } from './logic.ts';

export const WIDTH = 7 * SQUARE;
export const HEIGHT = 7 * SQUARE;

/** The top-left corner of the piece in `column`, `row` (0 at the bottom). */
export const pieceAt = (column: number, row: number): Point => ({
  x: column * SQUARE + 4,
  y: 44 + (ROWS - 1 - row) * SQUARE,
});

/** Where a dropped piece appears: above the window, over its column. */
export const dropFrom = (column: number): Point => ({ x: column * SQUARE + 4, y: -36 });
