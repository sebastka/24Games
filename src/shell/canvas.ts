// Helpers for the games' canvases.
import { useEffect, useState, type RefObject } from 'react';

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
