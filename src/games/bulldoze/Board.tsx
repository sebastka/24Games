import { useEffect, useRef } from 'react';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { COLS, ROWS, type Direction, type State } from './logic.ts';

export const TILE = 32;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

/**
 * The 640×384 play field, scaled by whole pixels when there is room (sharp pixels), to the
 * width otherwise (phones). Swipes move the dozer.
 */
export function Board(props: { state: State; pieces: string; floor: string; onMove: (d: Direction) => void }) {
  const { state, floor } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const sheet = useImage(props.pieces);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet) return;
    // Like the original, each cell is its tile over the background colour; the dozer's cell
    // shows only the dozer (a target under it is hidden).
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tile = x === state.at.x && y === state.at.y ? state.facing : state.tiles[y * COLS + x]!;
        if (tile !== 0) ctx.drawImage(sheet, tile * TILE, 0, TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      }
    }
  }, [state, sheet, floor]);

  return (
    <div className="board" ref={box}>
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
