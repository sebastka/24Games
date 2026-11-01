import { useEffect, useRef, useState } from 'react';
import plus from '../../assets/match/plus.cur?url';
import { useFitScale, useImages } from '../../shell/canvas.ts';
import { Card, cardAt, cardRect, type State } from './logic.ts';

/** The original window's client area (match.exe's window resource: 440×440). */
export const WIDTH = 440;
export const HEIGHT = 440;
const FACE = 100;

/**
 * The cards, each stretched to its cell less a 3-pixel margin, the background showing between
 * them. A press on a card turns it.
 */
export function Board(props: {
  state: State;
  faces: string;
  back: string;
  found: string;
  onClick: (i: number) => void;
}) {
  const { state } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const images = useImages([props.faces, props.back, props.found]);
  const scale = useFitScale(box, WIDTH, HEIGHT, 60);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images) return;
    const [faces, back, found] = images as [HTMLImageElement, HTMLImageElement, HTMLImageElement];
    // StretchBlt: whole pixels, no smoothing.
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    state.cards.forEach((card, i) => {
      const r = cardRect(state, i, WIDTH, HEIGHT);
      if (card === Card.Up) {
        const face = state.faces[i]!;
        ctx.drawImage(faces, (face % 6) * FACE, Math.floor(face / 6) * FACE, FACE, FACE, r.x, r.y, r.w, r.h);
      } else ctx.drawImage(card === Card.Found ? found : back, r.x, r.y, r.w, r.h);
    });
  }, [state, images]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * WIDTH) / rect.width;
    const y = ((e.clientY - rect.top) * HEIGHT) / rect.height;
    return cardAt(state, x, y, WIDTH, HEIGHT);
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{
          width: WIDTH * scale,
          height: HEIGHT * scale,
          cursor: hover ? `url(${plus}) 15 15, pointer` : 'default',
        }}
        aria-label="Cards"
        onPointerMove={(e) => {
          const i = at(e);
          // The original shows its "plus" pointer over the cards not matched yet.
          setHover(i >= 0 && state.cards[i] !== Card.Found);
        }}
        onPointerLeave={() => setHover(false)}
        onPointerDown={(e) => {
          const i = at(e);
          if (i >= 0) props.onClick(i);
        }}
      />
    </div>
  );
}
