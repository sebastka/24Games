// Canvas drawing helpers after the framework's (`FUN_00404260`, `FUN_004047d0`, `FUN_00406d30`),
// with the Windows 95 3D colours the rest of the chrome uses.
import { BACKGROUNDS } from '../../../shell/backgrounds.ts';

/** COL_3DFACE, COL_3DLIGHT, COL_3DSHADOW (StarView colours 25-27) in the Windows 95 scheme. */
export const FACE = '#c0c0c0';
export const LIGHT = '#ffffff';
export const SHADOW = '#808080';

/** StarView's COL_BLUE, COL_RED, COL_MAGENTA (the fonts' colours). */
export const NAVY = '#000080';
export const MAROON = '#800000';
export const PURPLE = '#800080';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * A raised box (`FUN_00404260`): filled with the face colour, then `width` lines of light along
 * the top, shadow down the right and along the bottom, light down the left (in that order);
 * `sunken` swaps light and shadow. Rectangles are inclusive, as StarView's.
 */
export function bevel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  width: number,
  fill: string | null = FACE,
  sunken = false,
): void {
  const [light, shadow] = sunken ? [SHADOW, LIGHT] : [LIGHT, SHADOW];
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(r.left, r.top, r.right - r.left + 1, r.bottom - r.top + 1);
  }
  const w = (i: number) => r.right - r.left - 2 * i + 1;
  const h = (i: number) => r.bottom - r.top - 2 * i + 1;
  const edge = (color: string, line: (i: number) => [number, number, number, number]) => {
    ctx.fillStyle = color;
    for (let i = 0; i < width; i++) ctx.fillRect(...line(i));
  };
  edge(light, (i) => [r.left + i, r.top + i, w(i), 1]);
  edge(shadow, (i) => [r.right - i, r.top + i, 1, h(i)]);
  edge(shadow, (i) => [r.left + i, r.bottom - i, w(i), 1]);
  edge(light, (i) => [r.left + i, r.top + i, 1, h(i)]);
}

/**
 * The window background (`FUN_004047d0`): a colour, or a texture tiled from the window's corner.
 * `textures` holds the loaded texture images, by background index.
 */
export function fillBackground(
  ctx: CanvasRenderingContext2D,
  background: number,
  texture: HTMLImageElement | null,
  width: number,
  height: number,
): void {
  const color = BACKGROUNDS[background]?.color;
  if (color || !texture) {
    ctx.fillStyle = color ?? '#000000';
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = ctx.createPattern(texture, 'repeat')!;
  ctx.fillRect(0, 0, width, height);
}

/** The URL of a background's texture, or '' for a plain colour (for `useImage`). */
export const textureOf = (background: number): string => BACKGROUNDS[background]?.texture ?? '';

/**
 * Text centred in a rectangle (`FUN_00406d30`). `shadow` draws it first one pixel down and
 * right in gray, as Windows draws a shadowed font.
 */
export function centeredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: Rect,
  font: string,
  color: string,
  shadow = false,
): void {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const x = (r.left + r.right + 1) / 2;
  const y = (r.top + r.bottom + 1) / 2;
  if (shadow) {
    ctx.fillStyle = SHADOW;
    ctx.fillText(text, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Text centred in a rectangle in an outlined font (StarView's outline attribute). */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: Rect,
  font: string,
  fill: string,
  outline: string,
): void {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  const x = (r.left + r.right + 1) / 2;
  const y = (r.top + r.bottom + 1) / 2;
  ctx.strokeStyle = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
