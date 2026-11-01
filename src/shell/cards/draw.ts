// Drawing of a playing card, as the card games draw it (FUN_00402927 in pokergrd.exe): a white
// rounded rectangle, the rank and a small suit sign in two corners (the bottom ones upside
// down), then the large pips or the court figure in the middle. The pieces are CZGAME32.DLL's
// bitmaps: nums.bmp (indices), spips.bmp / lpips.bmp (small / large suit signs), face_*.bmp
// (court figures, the aces' large pip and the jokers).
import backs from '../../assets/cards/backs.png';
import blank from '../../assets/cards/face.png';
import lpips from '../../assets/shared/czgame/lpips.png';
import nums from '../../assets/shared/czgame/nums.png';
import spips from '../../assets/shared/czgame/spips.png';
import face1 from '../../assets/shared/czgame/face_1.png';
import face2 from '../../assets/shared/czgame/face_2.png';
import face3 from '../../assets/shared/czgame/face_3.png';
import face8 from '../../assets/shared/czgame/face_8.png';
import { useImages } from '../canvas.ts';
import { CARD_H, CARD_W, Rank, type Card } from './cards.ts';

/**
 * Face sets (Options › Faces), in CZGAME32.DLL's order (string 1002), and their bitmaps (StarView
 * bitmaps 2004-2007).
 */
export const FACE_SETS = ['Classic', 'Art Deco', 'Zodiac', 'Monochrome'];
const FACE_STRIPS = [face1, face3, face2, face8];

/** Card backs (Options › Backs), CZGAME32.DLL's string 1003, in the order of backs.bmp. */
export const BACKS = [
  'Standard Blue',
  'Standard Red',
  'Brick',
  'Wyrm',
  'Casino',
  'Innovation',
  'Beach',
  'Penguin',
  'Seahorse',
  'Mesozoic',
  'Quack',
  'Biker',
  'Zen',
  'Conspiracy',
];

/** The card look: face set and back, indices in FACE_SETS and BACKS. */
export interface CardLook {
  face: number;
  back: number;
}

/**
 * The default look of a game, from its main window's help id (the original's trick: the face set
 * is its last digit, the back its tens, the window background its hundreds).
 */
export const lookFromHelpId = (helpId: number): CardLook => ({ face: helpId % 10, back: Math.floor(helpId / 10) % 10 });

export interface CardArt {
  face: HTMLImageElement;
  backs: HTMLImageElement;
  nums: HTMLImageElement;
  spips: HTMLImageElement;
  lpips: HTMLImageElement;
  figures: HTMLImageElement;
}

/** The card bitmaps for face set `faceSet`, once loaded. */
export function useCardArt(faceSet: number): CardArt | null {
  const images = useImages([blank, backs, nums, spips, lpips, FACE_STRIPS[faceSet] ?? face1]);
  if (!images) return null;
  const [face, b, n, s, l, figures] = images as [HTMLImageElement, ...HTMLImageElement[]];
  return { face, backs: b!, nums: n!, spips: s!, lpips: l!, figures: figures! };
}

/** The face strip of a face set, e.g. for its preview. */
export const faceStrip = (faceSet: number): string => FACE_STRIPS[faceSet] ?? face1;
export { backs as backsImage };

// Large pips (15×15), by rank: [x, y, upside down].
const U = false;
const D = true;
const PIPS: Record<number, [number, number, boolean][]> = {
  2: [
    [28, 10, U],
    [28, 71, D],
  ],
  3: [
    [28, 40, U],
    [28, 10, U],
    [28, 71, D],
  ],
  4: [
    [15, 10, U],
    [41, 10, U],
    [15, 71, D],
    [41, 71, D],
  ],
  5: [
    [28, 41, U],
    [15, 10, U],
    [41, 10, U],
    [15, 71, D],
    [41, 71, D],
  ],
  6: [
    [15, 10, U],
    [41, 10, U],
    [15, 41, U],
    [41, 41, U],
    [15, 71, D],
    [41, 71, D],
  ],
  7: [
    [28, 27, U],
    [15, 10, U],
    [41, 10, U],
    [15, 41, U],
    [41, 41, U],
    [15, 71, D],
    [41, 71, D],
  ],
  8: [
    [15, 10, U],
    [41, 10, U],
    [15, 31, U],
    [41, 31, U],
    [15, 50, D],
    [41, 50, D],
    [15, 71, D],
    [41, 71, D],
  ],
  9: [
    [28, 40, U],
    [13, 10, U],
    [43, 10, U],
    [13, 30, U],
    [43, 30, U],
    [13, 51, D],
    [43, 51, D],
    [13, 71, D],
    [43, 71, D],
  ],
  10: [
    [28, 20, U],
    [28, 61, D],
    [13, 10, U],
    [43, 10, U],
    [13, 31, U],
    [43, 31, U],
    [13, 50, D],
    [43, 50, D],
    [13, 71, D],
    [43, 71, D],
  ],
};

/** Column of the 45×74 figure in a face strip: J, Q, K by suit, the aces' pip, the jokers. */
function figure(card: Card): number | null {
  if (card.rank === Rank.Ace) return card.suit + 12;
  if (card.rank >= Rank.Jack && card.rank <= Rank.King) return card.suit + (card.rank - Rank.Jack) * 4;
  if (card.rank === Rank.Joker) return 16;
  if (card.rank === Rank.BlackJoker) return 17;
  return null;
}

/** Draws `card` face up with its top left corner at (`x`, `y`). */
export function drawCard(ctx: CanvasRenderingContext2D, art: CardArt, card: Card, x: number, y: number): void {
  const blit = (img: HTMLImageElement, sx: number, sy: number, w: number, h: number, dx: number, dy: number) =>
    ctx.drawImage(img, sx, sy, w, h, x + dx, y + dy, w, h);
  blit(art.face, 0, 0, CARD_W, CARD_H, 0, 0);
  const { rank, suit } = card;
  if (rank === Rank.Joker || rank === Rank.BlackJoker) {
    // The jokers' "J" index: red for the first, black for the second.
    const row = rank === Rank.Joker ? 28 : 0;
    blit(art.nums, 117, row, 9, 14, 3, 4);
    blit(art.nums, 117, row + 14, 9, 14, 59, 78);
  } else {
    // nums.bmp: 4 rows of 14 indices (9×14): black, black upside down, red, red upside down.
    const row = Math.floor(suit / 2) * 28;
    blit(art.nums, (rank - 1) * 9, row, 9, 14, 3, 4);
    blit(art.nums, (rank - 1) * 9, row + 14, 9, 14, 59, 78);
    blit(art.spips, suit * 11, 0, 11, 11, 2, 18);
    blit(art.spips, suit * 11, 11, 11, 11, 58, 67);
  }
  const column = figure(card);
  if (column !== null) blit(art.figures, column * 45, 0, 45, 74, 13, 10);
  for (const [px, py, down] of PIPS[rank] ?? []) blit(art.lpips, suit * 15, down ? 15 : 0, 15, 15, px, py);
}

/** Draws back number `back` (index in BACKS) with its top left corner at (`x`, `y`). */
export function drawBack(ctx: CanvasRenderingContext2D, art: CardArt, back: number, x: number, y: number): void {
  ctx.drawImage(art.backs, back * CARD_W, 0, CARD_W, CARD_H, x, y, CARD_W, CARD_H);
}
