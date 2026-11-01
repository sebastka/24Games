import { useEffect, useRef } from 'react';
import { fillBackground, useFitScale } from '../../shell/canvas.ts';
import {
  COLS,
  diagonalBonus,
  horizontalBonus,
  pieceValue,
  ROWS,
  VISIBLE_ROWS,
  type Action,
  type Stack,
  type State,
} from './logic.ts';

export const TILE = 32;
/** The game window's client area (window resource 256). */
export const WIDTH = 320;
export const HEIGHT = 431;

/** Pixel position of a grid cell (FUN_004096d0). */
const cellX = (col: number) => col * TILE + 7;
const cellY = (row: number) => 391 - row * TILE;
/** Where the next stack is shown (its bottom piece). */
const NEXT = { x: 210, y: 71 };

/** The four black boxes, framed in light red by a 3-pixel pen (FUN_00408b90): left, top, right, bottom. */
const BOXES = [
  [4, 4, 201, 425],
  [207, 4, 316, 105],
  [207, 112, 316, 193],
  [207, 200, 316, 425],
] as const;

/** Text colours of the window's FixedTexts and of "Press F2 To Begin". */
const YELLOW = '#ffff00';
const WHITE = '#ffffff';

export interface Art {
  /** pieces.png: one row of ten 32×32 tiles (piece codes 0-9) per piece set. */
  pieces: HTMLImageElement;
  horizontal: HTMLImageElement;
  diagonal: HTMLImageElement;
  /** The texture background, if any. */
  texture: HTMLImageElement | null;
}

/** Draws a stack bottom piece first, upwards, as long as the piece is inside the window (FUN_00407b80). */
function drawStack(ctx: CanvasRenderingContext2D, art: Art, set: number, stack: Stack, x: number, y: number) {
  for (let i = 0; i < 3 && y - i * TILE >= 6; i++) {
    ctx.drawImage(art.pieces, stack[i]! * TILE, set * TILE, TILE, TILE, x, y - i * TILE, TILE, TILE);
  }
}

/** Text centred in a box, as FixedText with WB_CENTER and FUN_00405010 draw it. */
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, w: number, align: 'center' | 'left') {
  ctx.textAlign = align;
  ctx.fillText(s, align === 'center' ? x + w / 2 : x, y);
}

function draw(ctx: CanvasRenderingContext2D, state: State, art: Art, set: number, background: number, values: boolean) {
  // StretchBlt-like shrinking of the value table's pieces.
  ctx.imageSmoothingEnabled = false;
  fillBackground(ctx, background, art.texture, WIDTH, HEIGHT);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ff0000';
  for (const [l, t, r, b] of BOXES) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(l, t, r - l + 1, b - t + 1);
    ctx.strokeRect(l + 0.5, t + 0.5, r - l, b - t);
  }

  const tile = (piece: number, x: number, y: number, size = TILE) =>
    ctx.drawImage(art.pieces, piece * TILE, set * TILE, TILE, TILE, x, y, size, size);
  for (let row = 0; row < VISIBLE_ROWS; row++) {
    for (let col = 0; col < COLS; col++) tile(state.grid[col * ROWS + row]!, cellX(col), cellY(row));
  }
  drawStack(ctx, art, set, state.next, NEXT.x, NEXT.y);
  // The values table: the six pieces shrunk to 20×20, then the two bonus icons.
  for (let p = 1; p <= 6; p++) tile(p, 213, 182 + p * 24, 20);
  ctx.drawImage(art.horizontal, 213, 368);
  ctx.drawImage(art.diagonal, 213, 400);

  // StarView's FixedTexts leave a little room above the text.
  ctx.textBaseline = 'top';
  ctx.fillStyle = YELLOW;
  ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
  text(ctx, 'Next', 248, 33, 60, 'center');
  text(ctx, 'Piece', 248, 57, 60, 'center');
  ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
  text(ctx, 'Score', 209, 116, 106, 'center');
  text(ctx, 'Stacks', 209, 156, 106, 'center');
  ctx.fillStyle = WHITE;
  text(ctx, String(state.score), 209, 135, 106, 'center');
  text(ctx, String(state.stacks), 209, 175, 106, 'center');
  // Before the first game the values are the window resource's "0"s.
  const table = [1, 2, 3, 4, 5, 6].map((p) => pieceValue(p, state.level));
  table.push(horizontalBonus(state.level), diagonalBonus(state.level));
  table.forEach((v, i) =>
    text(ctx, values ? String(v) : '0', 248, i < 6 ? 208 + i * 24 : 370 + (i - 6) * 32, 67, 'left'),
  );

  if (state.playing) {
    drawStack(ctx, art, set, state.stack, cellX(state.col), cellY(state.row));
  } else {
    // "Press F2 / To Begin", Arial 32 bold, yellow outlined in red (font resource 256).
    ctx.font = 'bold 32px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#800000';
    ctx.fillStyle = YELLOW;
    for (const [line, y] of [
      ['Press F2', 177],
      ['To Begin', 209],
    ] as const) {
      ctx.strokeText(line, 103, y);
      ctx.fillText(line, 103, y);
    }
  }
}

/**
 * The game window's content: the 6×13 well, the next stack, score and stacks, and the table of
 * the pieces' values. Scaled by whole pixels when there is room, to the width on phones. By
 * touch: drag sideways to move the stack, tap to rotate it, swipe down to drop it.
 */
export function Board(props: {
  state: State;
  art: Art | null;
  pieceSet: number;
  background: number;
  /** Whether a game was started: before, the value table shows zeros. */
  values: boolean;
  onAction: (action: Action) => void;
}) {
  const { state, art, pieceSet, background, values } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT, 120);
  const gesture = useRef<{ x: number; y: number; moved: number; time: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && art) draw(ctx, state, art, pieceSet, background, values);
  }, [state, art, pieceSet, background, values]);

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Play field"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          gesture.current = { x: e.clientX, y: e.clientY, moved: 0, time: e.timeStamp };
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          // One column per tile width dragged.
          const columns = Math.trunc((e.clientX - g.x) / (TILE * scale));
          for (; g.moved < columns; g.moved++) props.onAction('right');
          for (; g.moved > columns; g.moved--) props.onAction('left');
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          gesture.current = null;
          if (!g) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (g.moved === 0 && Math.hypot(dx, dy) < 10 && e.timeStamp - g.time < 500) props.onAction('rotateUp');
          else if (dy > 2 * TILE * scale && dy > 2 * Math.abs(dx)) props.onAction('drop');
        }}
        onPointerCancel={() => (gesture.current = null)}
      />
    </div>
  );
}
