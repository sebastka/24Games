import { useEffect, useRef } from 'react';
import { useMasked } from './sprites.ts';

/**
 * A CZGAME32.DLL picture whose mask is its right half, drawn on a canvas of its size (the hands
 * of the end-of-game dialogs, the Hall of Fame's flag and ribbons).
 */
export function MaskedSprite(props: { src: string; width: number; height: number; className?: string; alt?: string }) {
  const sprite = useMasked(props.src, 'right');
  const canvas = useRef<HTMLCanvasElement>(null);
  const { width, height } = props;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sprite) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sprite, 0, 0);
  }, [sprite, width, height]);
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      className={props.className}
      role={props.alt ? 'img' : undefined}
      aria-label={props.alt}
      aria-hidden={props.alt ? undefined : true}
    />
  );
}
