import { useEffect, useRef } from 'react';
import pieces from '../../assets/maze/pieces.png';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { coarsePointer } from '../cheesy/common/loop.ts';
import { at, Bit, type Direction, type State } from './logic.ts';

/** The window's client area (its resource: 600×400); the original's window can be resized. */
export const WIDTH = 600;
export const HEIGHT = 400;

/**
 * Where the corner (x, y) of a cell is (FUN_0040a9b0): the client area, enlarged by one cell,
 * divided into width + 1 columns and height + 1 rows (the last ones hold the borders).
 */
const corner = (s: State, x: number, y: number) => ({
  x: Math.trunc((x * (WIDTH + Math.trunc((WIDTH - 1) / s.width))) / (s.width + 1)),
  y: Math.trunc((y * (HEIGHT + Math.trunc((HEIGHT - 1) / s.height))) / (s.height + 1)),
});

/**
 * The maze as the original paints it (FUN_00402c70): the walls of the visible cells, the cheese
 * and the throwers (always shown), the mice stretched into their cells, and "Press F2 to begin
 * the game" between races. Swipes move Hector.
 */
export function Field(props: { state: State; onMove: (d: Direction) => void }) {
  const { state } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const sheet = useImage(pieces);
  const scale = useFitScale(box, WIDTH, HEIGHT, coarsePointer() ? 260 : 80);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#000000';
    const piece = (index: number, x: number, y: number) => {
      const a = corner(state, x, y);
      const b = corner(state, x + 1, y + 1);
      ctx.drawImage(sheet, index * 32, 0, 32, 32, a.x + 1, a.y + 1, b.x - a.x - 2, b.y - a.y - 2);
    };
    for (let x = 0; x <= state.width; x++) {
      for (let y = 0; y <= state.height; y++) {
        const c = state.cells[at(state, x, y)]!;
        if (c & Bit.Visible) {
          const p = corner(state, x, y);
          if (c & Bit.Top) {
            const q = corner(state, x + 1, y);
            ctx.fillRect(p.x, p.y, q.x - p.x + 1, 1);
          }
          if (c & Bit.Left) {
            const q = corner(state, x, y + 1);
            ctx.fillRect(p.x, p.y, 1, q.y - p.y + 1);
          }
        }
        if (x === state.width || y === state.height) continue;
        if (c & Bit.Cheese) piece(0, x, y);
        else if (c & Bit.OpponentThrower && state.opponentThrowers) piece(6, x, y);
        else if (c & Bit.PlayerThrower && state.playerThrowers) piece(5, x, y);
      }
    }
    state.mice.forEach((m, i) => piece(i * 2 + (m.left ? 1 : 2), m.x, m.y));

    if (!state.active) {
      // A 400×48 box in the middle, with a red frame 4 pixels wide (FUN_00407a60).
      const [l, t] = [Math.trunc((WIDTH - 400) / 2), Math.trunc((HEIGHT - 48) / 2)];
      ctx.fillStyle = '#800000';
      ctx.fillRect(l, t, 400, 48);
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(l + 4, t + 4, 392, 40);
      ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#808080';
      ctx.fillText('Press F2 to begin the game', WIDTH / 2 + 2, HEIGHT / 2 + 3);
      ctx.fillStyle = '#800000';
      ctx.fillText('Press F2 to begin the game', WIDTH / 2, HEIGHT / 2 + 1);
    }
  }, [state, sheet]);

  return (
    <div className="field" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Maze"
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
