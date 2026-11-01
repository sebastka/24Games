// Helpers for the games' canvases, and the window background they paint.
import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { BACKGROUNDS } from './backgrounds.ts';

/** An image, once loaded (null until then). */
export function useImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);
  return image;
}

/** Several images, once all are loaded (null until then), in the order of `srcs`. */
export function useImages(srcs: readonly string[]): HTMLImageElement[] | null {
  const key = srcs.join('\n');
  const [images, setImages] = useState<{ key: string; images: HTMLImageElement[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const list = key.split('\n');
    Promise.all(
      list.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          }),
      ),
    ).then((loaded) => !cancelled && setImages({ key, images: loaded }));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return images?.key === key ? images.images : null;
}

/**
 * The CSS scale of a `width`×`height` play field inside `box`: whole pixels when it fits (sharp
 * pixel art), the box's width otherwise (phones). `reserve` is the height kept for the rest of
 * the window (title, menu, status lines).
 */
export function useFitScale(box: RefObject<HTMLElement | null>, width: number, height: number, reserve = 80): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const fits = Math.min(el.clientWidth / width, (window.innerHeight - reserve) / height);
      setScale(fits >= 1 ? Math.floor(fits) : el.clientWidth / width);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [box, width, height, reserve]);
  return scale;
}

/** The URL of background `index`'s texture, or '' for a plain colour (for `useImage`). */
export const textureOf = (index: number): string => BACKGROUNDS[index]?.texture ?? '';

/**
 * The window background of Options › Extras (`FUN_004047d0` in reversi.exe): a colour, or a
 * texture tiled from the window's top left corner. `texture` is the loaded texture, if any.
 */
export function fillBackground(
  ctx: CanvasRenderingContext2D,
  index: number,
  texture: HTMLImageElement | null,
  width: number,
  height: number,
): void {
  const color = BACKGROUNDS[index]?.color;
  ctx.fillStyle = color || !texture ? (color ?? '#000000') : ctx.createPattern(texture, 'repeat')!;
  ctx.fillRect(0, 0, width, height);
}

/** The same background as CSS, for the games that paint it under their canvases. */
export function backgroundStyle(index: number): CSSProperties {
  const b = BACKGROUNDS[index];
  return { backgroundColor: b?.color ?? '#000000', backgroundImage: b?.texture && `url(${b.texture})` };
}

/** A 1×1 transparent GIF, for useImage when there is no texture. */
const NONE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/** A function painting background `index` (null until its texture is loaded). */
export function useBackground(index: number): Painter | null {
  const texture = useImage(textureOf(index) || NONE);
  if (BACKGROUNDS[index]?.texture && !texture) return null;
  return (ctx, width, height) => fillBackground(ctx, index, texture, width, height);
}
