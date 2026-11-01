// The piece sets and boards that CZGAME32.DLL lends to the board games (Reversi Plus, Wari,
// Quinto, Pegopolis…): names in its strings 1000 and 1001, pictures in its bitmaps 4000-4008
// (piece_*.bmp) and 4020 (board.bmp). See docs/games/reversi.md.
import board from '../../assets/shared/czgame/board.png';
import piece1 from '../../assets/shared/czgame/piece_1.png';
import piece2 from '../../assets/shared/czgame/piece_2.png';
import piece3 from '../../assets/shared/czgame/piece_3.png';
import piece4 from '../../assets/shared/czgame/piece_4.png';
import piece5 from '../../assets/shared/czgame/piece_5.png';
import piece6 from '../../assets/shared/czgame/piece_6.png';
import piece7 from '../../assets/shared/czgame/piece_7.png';
import piece8 from '../../assets/shared/czgame/piece_8.png';
import piece9 from '../../assets/shared/czgame/piece_9.png';
import { maskSprite, useLoaded } from '../sprites.ts';

export { BOARDS, PIECE_SETS } from './names.ts';

/** A square of a board, and a piece, in pixels. */
export const SQUARE = 40;
export const PIECE = 32;

/**
 * The piece sheets, by set: StarView bitmaps 4000-4008, which are not in the order of their file
 * names (4002 is piece_7.bmp). Each is 128×32: the first side's piece, its mask, the second
 * side's piece, its mask.
 */
export const PIECE_SHEETS = [piece1, piece2, piece7, piece3, piece4, piece5, piece6, piece9, piece8];

/**
 * board.bmp (bitmap 4020), 640×40: for each board, two 40×40 squares side by side (the first for
 * the board's odd squares or labels, the second for the others).
 */
export const BOARD_SHEET = board;

/** The two pieces of a set, masks applied: the first side's, the second side's. */
export type Pieces = [HTMLCanvasElement, HTMLCanvasElement];

/** The pieces of set `set` (an index in PIECE_SETS), once loaded (null until then). */
export const usePieces = (set: number): Pieces | null =>
  useLoaded(PIECE_SHEETS[set] ?? PIECE_SHEETS[0]!, (img) => [
    maskSprite(img, 0, 0, PIECE, PIECE, PIECE, 0),
    maskSprite(img, 2 * PIECE, 0, PIECE, PIECE, 3 * PIECE, 0),
  ]);

/** Draws square `which` (0: first, 1: second) of board `board` at (x, y). */
export function drawSquare(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  board: number,
  which: number,
  x: number,
  y: number,
): void {
  ctx.drawImage(sheet, (2 * board + which) * SQUARE, 0, SQUARE, SQUARE, x, y, SQUARE, SQUARE);
}
