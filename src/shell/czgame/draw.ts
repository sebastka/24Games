// Canvas drawing helpers after the framework's (`FUN_00404260`, `FUN_00406d30` in reversi.exe;
// the same code is FUN_00408b40 and FUN_0040b3d0 in cheesy.exe), with the Windows 95 3D colours
// the rest of the chrome uses. The window background is in ../canvas.ts.

/** COL_3DFACE, COL_3DLIGHT, COL_3DSHADOW (StarView colours 25-27) in the Windows 95 scheme. */
export const FACE = '#c0c0c0';
export const LIGHT = '#ffffff';
export const SHADOW = '#808080';

/** StarView's COL_BLUE, COL_RED, COL_MAGENTA (the fonts' colours). */
export const NAVY = '#000080';
export const MAROON = '#800000';
export const PURPLE = '#800080';

/** A rectangle, edges included (StarView's). */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/** The colours of a bevel's four edges. */
export interface Edges {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

const RAISED: Edges = { top: LIGHT, right: SHADOW, bottom: SHADOW, left: LIGHT };
const SUNKEN: Edges = { top: SHADOW, right: LIGHT, bottom: LIGHT, left: SHADOW };

/**
 * A bevelled box (`FUN_00404260`): filled (unless `fill` is null), then `width` lines along the
 * top, down the right, along the bottom and down the left, in that order (the left edge's light
 * wins the bottom left corner). Raised: light on the top and left, shadow on the bottom and
 * right; sunken: the other way round; or a game's own colours.
 */
export function bevel(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  width: number,
  fill: string | null = FACE,
  edges: 'raised' | 'sunken' | Edges = 'raised',
): void {
  const colors = edges === 'raised' ? RAISED : edges === 'sunken' ? SUNKEN : edges;
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
  edge(colors.top, (i) => [r.left + i, r.top + i, w(i), 1]);
  edge(colors.right, (i) => [r.right - i, r.top + i, 1, h(i)]);
  edge(colors.bottom, (i) => [r.left + i, r.bottom - i, w(i), 1]);
  edge(colors.left, (i) => [r.left + i, r.top + i, 1, h(i)]);
}

/**
 * Text centred in a rectangle (`FUN_00406d30`), in `font` and `color` (the context's own when
 * not given). `dy` moves it down, for the fonts whose middle sits higher than Windows' cell;
 * `shadow` draws it first two pixels down and right in gray, as the games' shadowed scores.
 */
export function centeredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  r: Rect,
  options: { font?: string; color?: string; shadow?: boolean; dy?: number } = {},
): void {
  if (options.font) ctx.font = options.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const x = (r.left + r.right + 1) / 2;
  const y = (r.top + r.bottom + 1) / 2 + (options.dy ?? 0);
  if (options.shadow) {
    const color = ctx.fillStyle;
    ctx.fillStyle = SHADOW;
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
  }
  if (options.color) ctx.fillStyle = options.color;
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

/**
 * The drag and drop zones' mark (the framework's XOR rectangle: `FUN_0040afa0` in pegoplis.exe,
 * `FUN_004062d0` in sechseck.exe): a band `width` pixels wide inside the `w`×`h` rectangle at
 * (x, y), inverting what is under it.
 */
export function invertOutline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, width = 3) {
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, width);
  ctx.fillRect(x, y + h - width, w, width);
  ctx.fillRect(x, y + width, width, h - 2 * width);
  ctx.fillRect(x + w - width, y + width, width, h - 2 * width);
  ctx.restore();
}
