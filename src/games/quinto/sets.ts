// The piece sets and board sets of CZGAME32.DLL that the board games share: names in its strings
// 1000 and 1001, pictures in its bitmaps 4000-4008 (piece_*.bmp: two 32×32 pieces, each followed
// by its mask) and 4020 (board.bmp: two 40×40 squares per set).
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
import { applyMask } from '../match/sprites.ts';

export const PIECE_SIZE = 32;
export const SQUARE_SIZE = 40;

/** Piece sets in the order of their names; StarView bitmap 4000 + index. */
export const PIECE_SETS: { name: string; src: string }[] = [
  { name: 'Checkers', src: piece1 },
  { name: 'Stones', src: piece2 },
  { name: 'Chips', src: piece7 },
  { name: 'Hazards', src: piece3 },
  { name: 'Zen/Dragon', src: piece4 },
  { name: 'Happies/Angries', src: piece5 },
  { name: 'Solar/Lunar', src: piece6 },
  { name: 'Conspiracy', src: piece9 },
  { name: 'Monochrome', src: piece8 },
];

export const BOARD_SETS = ['Classic', 'Purple & Gold', 'Marble', 'Beveled', 'Grid', 'Blobs', 'Space', 'Monochrome'];

export const BOARD_IMAGE = board;

/** The two pieces of a set (masks applied), each 32×32. */
export function pieceSprites(sheet: HTMLImageElement): [HTMLCanvasElement, HTMLCanvasElement] {
  const half = (x: number) => {
    const c = document.createElement('canvas');
    c.width = 2 * PIECE_SIZE;
    c.height = PIECE_SIZE;
    c.getContext('2d')!.drawImage(sheet, -x, 0);
    return applyMask(c, 'right');
  };
  return [half(0), half(2 * PIECE_SIZE)];
}

/** Draws square `kind` (0: first, 1: second) of board set `set` at (x, y). */
export function drawSquare(
  ctx: CanvasRenderingContext2D,
  boards: HTMLImageElement,
  set: number,
  kind: 0 | 1,
  x: number,
  y: number,
) {
  ctx.drawImage(boards, (2 * set + kind) * SQUARE_SIZE, 0, SQUARE_SIZE, SQUARE_SIZE, x, y, SQUARE_SIZE, SQUARE_SIZE);
}
