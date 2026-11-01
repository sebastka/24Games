// The shared art of CZGAME32.DLL is extracted as is: a sprite and its mask (white = transparent)
// side by side or one above the other. Applied here, in the browser.
import { useEffect, useState } from 'react';

/** `image` with its mask (the right or bottom half) applied: a canvas of half its size. */
export function applyMask(image: HTMLImageElement | HTMLCanvasElement, maskAt: 'right' | 'below'): HTMLCanvasElement {
  const right = maskAt === 'right';
  const w = right ? image.width / 2 : image.width;
  const h = right ? image.height : image.height / 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, right ? -w : 0, right ? 0 : -h);
  const mask = ctx.getImageData(0, 0, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0);
  const sprite = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    if (mask.data[i * 4] === 255 && mask.data[i * 4 + 1] === 255 && mask.data[i * 4 + 2] === 255) {
      sprite.data[i * 4 + 3] = 0;
    }
  }
  ctx.putImageData(sprite, 0, 0);
  return canvas;
}

/** The URL of a masked sprite (for an <img>), once made (null until then). */
export function useMasked(src: string, maskAt: 'right' | 'below'): string | null {
  const [url, setUrl] = useState<{ src: string; url: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setUrl({ src, url: applyMask(img, maskAt).toDataURL() });
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, maskAt]);
  return url?.src === src ? url.url : null;
}
