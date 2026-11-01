// The CZGAME32.DLL art is extracted as is (src/assets/shared/czgame): each sprite has its mask
// (white = transparent, black = opaque) beside it or under it in the same bitmap. The originals
// draw them with a masked blit (AND the mask, then OR the image: FUN_00406320, FUN_00404200…);
// here the mask becomes an alpha channel, in the browser.
import { useEffect, useRef, useState } from 'react';

type Source = HTMLImageElement | HTMLCanvasElement;

/** The `w`×`h` sprite at (x, y) of `image`, its mask at (maskX, maskY) applied: a canvas. */
export function maskSprite(
  image: Source,
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, maskX, maskY, w, h, 0, 0, w, h);
  const mask = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
  const sprite = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) if (mask[i * 4]! > 127) sprite.data[i * 4 + 3] = 0;
  ctx.putImageData(sprite, 0, 0);
  return canvas;
}

/** `image` whose mask is its right or its bottom half, applied: a canvas of half its size. */
export function applyMask(image: Source, maskAt: 'right' | 'below'): HTMLCanvasElement {
  const right = maskAt === 'right';
  const w = right ? image.width / 2 : image.width;
  const h = right ? image.height : image.height / 2;
  return maskSprite(image, 0, 0, w, h, right ? w : 0, right ? 0 : h);
}

/** `make` applied to the image at `src`, once loaded (null until then, and while `src` changes). */
export function useLoaded<T>(src: string, make: (image: HTMLImageElement) => T): T | null {
  const [made, setMade] = useState<{ src: string; value: T } | null>(null);
  const maker = useRef(make);
  useEffect(() => {
    maker.current = make;
  });
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setMade({ src, value: maker.current(img) });
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return made?.src === src ? made.value : null;
}

/** The image at `src` with its mask (right or bottom half) applied, as a canvas. */
export const useMasked = (src: string, maskAt: 'right' | 'below'): HTMLCanvasElement | null =>
  useLoaded(src, (img) => applyMask(img, maskAt));
