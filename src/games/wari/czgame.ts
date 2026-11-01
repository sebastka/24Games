// What the board games (Wari, Nim, Push-Pull, Winding Standoff, Voracity) share through
// CZGAME32.DLL and their common framework code: the piece sets, sprites with masks, the
// animation of moving pieces. Imported by the other games from here (src/games/wari); the
// shared dialogs and option tabs are in czgame.tsx.
import { useEffect, useState, type CSSProperties } from 'react';
import boardSheet from '../../assets/shared/czgame/board.png';
import piece1 from '../../assets/shared/czgame/piece_1.png';
import piece2 from '../../assets/shared/czgame/piece_2.png';
import piece3 from '../../assets/shared/czgame/piece_3.png';
import piece4 from '../../assets/shared/czgame/piece_4.png';
import piece5 from '../../assets/shared/czgame/piece_5.png';
import piece6 from '../../assets/shared/czgame/piece_6.png';
import piece7 from '../../assets/shared/czgame/piece_7.png';
import piece8 from '../../assets/shared/czgame/piece_8.png';
import piece9 from '../../assets/shared/czgame/piece_9.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';

/** Piece set names (CZGAME32.DLL string 1000), in the order of the options' list. */
export const PIECE_SET_NAMES = [
  'Checkers',
  'Stones',
  'Chips',
  'Hazards',
  'Zen/Dragon',
  'Happies/Angries',
  'Solar/Lunar',
  'Conspiracy',
  'Monochrome',
];

/**
 * The piece sets: StarView bitmaps 4000-4008 of CZGAME32.DLL (piece_1, piece_2, piece_7, …:
 * the file names do not follow the list). Each is 128×32: a first piece and its mask, a second
 * piece and its mask, 32×32 each.
 */
export const PIECE_SHEETS = [piece1, piece2, piece7, piece3, piece4, piece5, piece6, piece9, piece8];

/** Board names (CZGAME32.DLL string 1001), in the order of the options' list. */
export const BOARD_NAMES = ['Classic', 'Purple & Gold', 'Marble', 'Beveled', 'Grid', 'Blobs', 'Space', 'Monochrome'];

/**
 * The boards' squares: StarView bitmap 4020 of CZGAME32.DLL (board.bmp), 640×40: for each
 * board, two 40×40 squares side by side (the first for the board's odd squares or labels, the
 * second for the others).
 */
export const BOARD_SHEET = boardSheet;

/** Draws square `which` (0 or 1) of `board` at (x, y). */
export function drawSquare(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  board: number,
  which: number,
  x: number,
  y: number,
) {
  ctx.drawImage(sheet, board * 80 + which * 40, 0, 40, 40, x, y, 40, 40);
}

/** The window background as CSS (a colour or a tiled texture), as Options › Extras sets it. */
export function backgroundStyle(background: number): CSSProperties {
  const b = BACKGROUNDS[background];
  return { backgroundColor: b?.color ?? '#000000', backgroundImage: b?.texture && `url(${b.texture})` };
}

/**
 * A sprite of a sheet whose mask (white = transparent, black = opaque) is elsewhere in the
 * same image, as the originals draw them (AND the mask, then OR the image).
 */
export function maskedSprite(
  sheet: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  maskX: number,
  maskY: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sheet, maskX, maskY, w, h, 0, 0, w, h);
  const mask = ctx.getImageData(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) if (mask.data[i * 4]! > 127) image.data[i * 4 + 3] = 0;
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** The two 32×32 pieces of a piece set, with their masks applied (null while loading). */
export function usePieces(pieceSet: number): [HTMLCanvasElement, HTMLCanvasElement] | null {
  const src = PIECE_SHEETS[pieceSet] ?? PIECE_SHEETS[0]!;
  const [pieces, setPieces] = useState<{ src: string; sprites: [HTMLCanvasElement, HTMLCanvasElement] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setPieces({ src, sprites: [maskedSprite(img, 0, 0, 32, 32, 32, 0), maskedSprite(img, 64, 0, 32, 32, 96, 0)] });
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return pieces?.src === src ? pieces.sprites : null;
}

/** Animation speed: 0 (animation disabled), or 1 (slow) to 15 (fast); 7 by default. */
export const DEFAULT_SPEED = 7;

/**
 * Milliseconds per animation step. The original moves a piece `speed` pixels per step, with a
 * calibrated busy loop between steps (`AnimationDelay`, 6000-14000 × 10 iterations by
 * processor type: a few milliseconds on the machines of the time).
 */
export const STEP_MS = 3;

/** Waits for the next animation frame (a promise, for the games' move sequences). */
export const nextFrame = (): Promise<number> => new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Animates a straight move from `from` to `to` at `speed` pixels per step (`FUN_00404b00`),
 * calling `at` with each position. Resolves at the end, or early when `cancelled()`.
 */
export async function glide(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  at: (p: { x: number; y: number }) => void,
  cancelled: () => boolean,
): Promise<void> {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const start = performance.now();
  for (;;) {
    const now = await nextFrame();
    if (cancelled()) return;
    const travelled = Math.floor((now - start) / STEP_MS) * speed;
    if (travelled >= length) break;
    at({ x: Math.trunc(from.x + (dx * travelled) / length), y: Math.trunc(from.y + (dy * travelled) / length) });
  }
  at(to);
}

export type Outcome = 'computer' | 'player' | 'tie';

/** A rectangle, edges included (StarView's). */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/**
 * A bevelled frame (`FUN_00404260`): filled, then `width` lines on each edge, top, right,
 * bottom, left.
 */
export function bevel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  width: number,
  fill: string,
  [top, bottom, left, right]: readonly string[],
) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.left, r.top, r.right - r.left + 1, r.bottom - r.top + 1);
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = top!;
    ctx.fillRect(r.left + i, r.top + i, r.right - r.left - 2 * i + 1, 1);
    ctx.fillStyle = right!;
    ctx.fillRect(r.right - i, r.top + i, 1, r.bottom - r.top - 2 * i + 1);
    ctx.fillStyle = bottom!;
    ctx.fillRect(r.left + i, r.bottom - i, r.right - r.left - 2 * i + 1, 1);
    ctx.fillStyle = left!;
    ctx.fillRect(r.left + i, r.top + i, 1, r.bottom - r.top - 2 * i + 1);
  }
}

/** `text` centred in `r` (`FUN_00406d30`), in the context's font and colour. */
export function centeredText(ctx: CanvasRenderingContext2D, r: Rect, text: string) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, (r.left + r.right + 1) / 2, (r.top + r.bottom + 1) / 2 + 1);
}
