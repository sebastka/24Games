// The piece sets and boards that CZGAME32.DLL lends to the board games (Reversi Plus, Checker
// Connector, Engulf, Core Meltdown…), and the end-of-game pictures. See docs/games/reversi.md.
import board from '../../../assets/shared/czgame/board.png';
import iwin from '../../../assets/shared/czgame/iwin2.png';
import piece1 from '../../../assets/shared/czgame/piece_1.png';
import piece2 from '../../../assets/shared/czgame/piece_2.png';
import piece3 from '../../../assets/shared/czgame/piece_3.png';
import piece4 from '../../../assets/shared/czgame/piece_4.png';
import piece5 from '../../../assets/shared/czgame/piece_5.png';
import piece6 from '../../../assets/shared/czgame/piece_6.png';
import piece7 from '../../../assets/shared/czgame/piece_7.png';
import piece8 from '../../../assets/shared/czgame/piece_8.png';
import piece9 from '../../../assets/shared/czgame/piece_9.png';
import tie from '../../../assets/shared/czgame/tie2.png';
import youwin from '../../../assets/shared/czgame/youwin2.png';

export { BOARDS, PIECE_SETS } from './names.ts';

/**
 * The piece sheets, by set: StarView bitmaps 4000-4008, which are not in the order of their file
 * names (4002 is piece_7.bmp). Each is 128×32: the first side's piece, its mask, the second
 * side's piece, its mask.
 */
export const PIECE_SHEETS = [piece1, piece2, piece7, piece3, piece4, piece5, piece6, piece9, piece8];

/** board.bmp (bitmap 4020): two 40×40 squares per board, side by side, board after board. */
export const BOARD_SHEET = board;
export const SQUARE = 40;
export const PIECE = 32;

/** The end-of-game pictures (bitmaps 1001-1003), 120×200, their mask on the right. */
export const END_PICTURES = { lose: iwin, win: youwin, tie };
