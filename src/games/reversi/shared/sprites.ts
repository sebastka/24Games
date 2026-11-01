// The CZGAME32.DLL sprites keep their masks next to them (white = transparent): drawn here as
// images with an alpha channel, like the originals' masked blits (`FUN_00404200`).
import { useEffect, useState } from 'react';

/**
 * A sheet of `cells` sprites side by side, each followed by its mask, as a canvas holding only
 * the sprites (with transparency): sprite i at x = i × width.
 */
export function maskSheet(img: HTMLImageElement, width: number, cells: number): HTMLCanvasElement {
  const height = img.naturalHeight;
  const src = document.createElement('canvas');
  src.width = img.naturalWidth;
  src.height = height;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0);
  const pixels = sctx.getImageData(0, 0, src.width, height).data;
  const out = document.createElement('canvas');
  out.width = width * cells;
  out.height = height;
  const octx = out.getContext('2d')!;
  const data = octx.createImageData(out.width, height);
  for (let c = 0; c < cells; c++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const from = (y * src.width + c * 2 * width + x) * 4;
        const mask = (y * src.width + (c * 2 + 1) * width + x) * 4;
        const to = (y * out.width + c * width + x) * 4;
        if (pixels[mask] === 255) continue;
        data.data.set(pixels.subarray(from, from + 3), to);
        data.data[to + 3] = 255;
      }
    }
  }
  octx.putImageData(data, 0, 0);
  return out;
}

/** `maskSheet` of an image URL, once loaded (null until then). */
export function useMaskedSheet(src: string, width: number, cells: number): HTMLCanvasElement | null {
  const [sheet, setSheet] = useState<{ src: string; canvas: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setSheet({ src, canvas: maskSheet(img, width, cells) });
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, width, cells]);
  return sheet?.src === src ? sheet.canvas : null;
}

/** A piece sheet (128×32) as its two pieces: side 0 at x = 0, side 1 at x = 32. */
export const usePieces = (src: string): HTMLCanvasElement | null => useMaskedSheet(src, 32, 2);
