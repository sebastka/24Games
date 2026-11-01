import { useEffect, useRef } from 'react';
import cat from '../../assets/cheesy/cat.png';
import cheese from '../../assets/cheesy/cheese.png';
import mice from '../../assets/cheesy/mice.png';
import board from '../../assets/shared/czgame/board.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { fillBackground, useFitScale, useImages } from '../../shell/canvas.ts';
import { bevel } from '../../shell/czgame/draw.ts';
import { coarsePointer } from '../../shell/loop.ts';
import { CAT, CELL, isEdge, MOUSE_INSET, type Cat, type Direction, type State } from './logic.ts';
import { BOARD } from './settings.ts';

/** The window's client area (its resource: 368×328): the status panels, then the board. */
export const WIDTH = 368;
export const HEIGHT = 328;

/** Where the board is (FUN_00401c80), by board size: centred under the panels. */
const ORIGINS = [
  { x: 84, y: 124 },
  { x: 44, y: 84 },
  { x: 4, y: 44 },
];

/** The four panels (FUN_00403ee0): score, cheese value, CheeseBombs, mice. */
const PANELS = [
  { box: [4, 4, 91, 40], text: [6, 6, 89, 38] },
  { box: [95, 4, 182, 40], text: [129, 6, 181, 38], icon: { x: 97, y: 6 } },
  { box: [186, 4, 273, 40], text: [220, 6, 272, 38], icon: { x: 188, y: 6 } },
  { box: [277, 4, 364, 40], text: [311, 6, 363, 38], icon: { x: 279, y: 6 } },
] as const;

/**
 * The play field, drawn as the original paints it: the background, the panels with their
 * yellow numbers, the board (board.bmp's "Beveled" tiles), the cheeses, the mouse, then the
 * cats, clipped to the board. Swipes move the mouse.
 */
export function Field(props: {
  state: State;
  /** The pouncing cat's position, while it jumps on the mouse. */
  pounce: { index: number; x: number; y: number } | null;
  mouse: number;
  background: number;
  onMove: (d: Direction) => void;
}) {
  const { state, pounce } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const texture = BACKGROUNDS[props.background]?.texture;
  const images = useImages(texture ? [cat, cheese, mice, board, texture] : [cat, cheese, mice, board]);
  const scale = useFitScale(box, WIDTH, HEIGHT, coarsePointer() ? 260 : 80);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images) return;
    const [catImg, cheeseImg, miceImg, boardImg, textureImg] = images as [
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement | undefined,
    ];
    fillBackground(ctx, props.background, textureImg ?? null, WIDTH, HEIGHT);

    const numbers = [state.score, state.cheeseValue, state.bombs, state.lives];
    PANELS.forEach((p, i) => {
      const [l, t, r, b] = p.box;
      bevel(ctx, { left: l, top: t, right: r, bottom: b }, 1);
      if ('icon' in p) {
        // The cheddar slice, the CheeseBomb, the chosen mouse looking left.
        if (i === 1) ctx.drawImage(cheeseImg, 0, 0, 32, 32, p.icon.x, p.icon.y, 32, 32);
        if (i === 2) ctx.drawImage(cheeseImg, 64, 0, 32, 32, p.icon.x, p.icon.y, 32, 32);
        if (i === 3) ctx.drawImage(miceImg, props.mouse * 64, 0, 32, 32, p.icon.x, p.icon.y, 32, 32);
      }
      const [tl, tt, tr, tb] = p.text;
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffff00';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = String(numbers[i]);
      const [cx, cy] = [tl + (tr - tl + 1) / 2, tt + (tb - tt + 1) / 2 + 1];
      ctx.strokeText(text, cx, cy);
      ctx.fillText(text, cx, cy);
    });

    const origin = ORIGINS.find((_, i) => [5, 7, 9][i] === state.cols) ?? ORIGINS[1]!;
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const px = origin.x + x * CELL;
        const py = origin.y + y * CELL;
        // Each board of board.bmp is two tiles: the edge cells' and the inner cells'.
        const tile = BOARD * 2 * CELL + (isEdge(state, x, y) ? 0 : CELL);
        ctx.drawImage(boardImg, tile, 0, CELL, CELL, px, py, CELL, CELL);
        const content = state.cells[y * state.cols + x]!;
        if (content > 0) {
          ctx.drawImage(cheeseImg, (content - 1) * 32, 0, 32, 32, px + MOUSE_INSET, py + MOUSE_INSET, 32, 32);
        }
      }
    }
    const mx = origin.x + state.mouse.x * CELL + MOUSE_INSET;
    const my = origin.y + state.mouse.y * CELL + MOUSE_INSET;
    ctx.drawImage(miceImg, (props.mouse * 2 + state.facing) * 32, 0, 32, 32, mx, my, 32, 32);

    ctx.save();
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, state.cols * CELL, state.rows * CELL);
    ctx.clip();
    state.cats.forEach((c: Cat, i) => {
      const at = pounce?.index === i ? pounce : c;
      ctx.drawImage(catImg, origin.x + at.x, origin.y + at.y, CAT, CAT);
    });
    ctx.restore();
  }, [state, pounce, images, props.mouse, props.background]);

  return (
    <div className="field" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Play field"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from) return;
          const dx = e.clientX - from.x;
          const dy = e.clientY - from.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          if (Math.abs(dx) > Math.abs(dy)) props.onMove(dx > 0 ? 'right' : 'left');
          else props.onMove(dy > 0 ? 'down' : 'up');
        }}
      />
    </div>
  );
}
