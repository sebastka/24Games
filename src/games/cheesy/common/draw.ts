// Drawing helpers of the arcade games' canvases, after the originals' StarView calls.
import { useEffect, useState } from 'react';
import { BACKGROUNDS } from '../../../shell/backgrounds.ts';

/** The Windows 3D colours the originals draw their panels with (COL_3DFACE…). */
export const FACE = '#c0c0c0';
export const LIGHT = '#ffffff';
export const SHADOW = '#808080';

/**
 * A raised panel (FUN_00408b40): filled with the face colour, `width` pixels of light on the
 * top and left, of shadow on the bottom and right. Coordinates are inclusive, as StarView's.
 */
export function panel(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  width = 1,
) {
  ctx.fillStyle = FACE;
  ctx.fillRect(left, top, right - left + 1, bottom - top + 1);
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = LIGHT;
    ctx.fillRect(left + i, top + i, right - left + 1 - 2 * i, 1);
    ctx.fillRect(left + i, top + i, 1, bottom - top + 1 - 2 * i);
    ctx.fillStyle = SHADOW;
    ctx.fillRect(left + i, bottom - i, right - left + 1 - 2 * i, 1);
    ctx.fillRect(right - i, top + i, 1, bottom - top + 1 - 2 * i);
  }
}

/** Text centred in a rectangle (FUN_0040b3d0). */
export function centredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
}

/**
 * The window background of Options › Extras over a whole canvas: a colour, or a texture tiled
 * from the top-left corner (FUN_00409110). `texture` is the loaded texture image, if any.
 */
export function background(ctx: CanvasRenderingContext2D, index: number, texture: HTMLImageElement | null) {
  const { width, height } = ctx.canvas;
  const b = BACKGROUNDS[index];
  if (b?.texture && texture) {
    for (let y = 0; y < height; y += texture.height) {
      for (let x = 0; x < width; x += texture.width) ctx.drawImage(texture, x, y);
    }
  } else {
    ctx.fillStyle = b?.color ?? '#000000';
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * A bitmap of the shared art whose mask (white = transparent) is on its right half or below,
 * as a data URL with transparency, once loaded (null until then). The shared CZGAME32.DLL art
 * (src/assets/shared/czgame) is kept as the original bitmaps, masks included.
 */
export function useMasked(src: string, maskAt: 'right' | 'below'): string | null {
  const [url, setUrl] = useState<{ src: string; url: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const [w, h] = maskAt === 'right' ? [img.width / 2, img.height] : [img.width, img.height / 2];
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx || cancelled) return;
      ctx.drawImage(img, 0, 0);
      const image = ctx.getImageData(0, 0, w, h);
      ctx.drawImage(img, maskAt === 'right' ? -w : 0, maskAt === 'right' ? 0 : -h);
      const mask = ctx.getImageData(0, 0, w, h).data;
      for (let i = 0; i < w * h; i++) if (mask[i * 4] === 255) image.data[i * 4 + 3] = 0;
      ctx.putImageData(image, 0, 0);
      setUrl({ src, url: canvas.toDataURL() });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, maskAt]);
  return url?.src === src ? url.url : null;
}
