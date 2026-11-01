import { useEffect, useRef } from 'react';
import { useFitScale } from '../../shell/canvas.ts';
import {
  cellRect,
  dropZones,
  hexagon,
  HEIGHT,
  inside,
  PIECE_H,
  PIECE_W,
  PIECES_BOX,
  PIECES_INNER,
  SCORE_BOX,
  SCORE_INNER,
  SCORE_LABEL,
  SCORE_VALUE,
  SLOT_POSITIONS,
  slotRect,
  TIME_BAR,
  TIME_BOX,
  WIDTH,
  type Rect,
} from './layout.ts';
import { Cell, isFree, PENALTY_MS, type State } from './logic.ts';

export interface Art {
  /** piece.bmp: the grey hexagon under a piece. */
  piece: HTMLImageElement;
  /** bits.bmp: 4 shapes (columns) × 4 colours (rows), 16×16. */
  shapes: HTMLImageElement;
  /** mult.bmp: skull, ×2, ×3, ×4, 32×32. */
  tiles: HTMLImageElement;
  texture: HTMLImageElement | null;
}

/** A piece being dragged: from which slot, where the pointer is, where it held the piece. */
export interface Drag {
  slot: number;
  x: number;
  y: number;
  grabX: number;
  grabY: number;
}

// Windows 95 3D colours (StarView's face, light and shadow).
const FACE = '#c0c0c0';
const LIGHT = '#ffffff';
const SHADOW = '#808080';

/** A bevelled box (FUN_00404420): fill, then `width` lines of each colour along the edges. */
function bevel(ctx: CanvasRenderingContext2D, r: Rect, width: number, raised: boolean, fill = true) {
  if (fill) {
    ctx.fillStyle = FACE;
    ctx.fillRect(r.left, r.top, r.right - r.left + 1, r.bottom - r.top + 1);
  }
  const [topLeft, bottomRight] = raised ? [LIGHT, SHADOW] : [SHADOW, LIGHT];
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = topLeft;
    ctx.fillRect(r.left + i, r.top + i, r.right - r.left - 2 * i, 1);
    ctx.fillRect(r.left + i, r.top + i, 1, r.bottom - r.top - 2 * i);
    ctx.fillStyle = bottomRight;
    ctx.fillRect(r.left + i, r.bottom - i, r.right - r.left - 2 * i + 1, 1);
    ctx.fillRect(r.right - i, r.top + i, 1, r.bottom - r.top - 2 * i + 1);
  }
}

/** An inverted outline (FUN_004062d0 draws them with an XOR raster operation). */
function invertedOutline(ctx: CanvasRenderingContext2D, r: Rect, width: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width;
  const half = width / 2;
  ctx.strokeRect(r.left + half, r.top + half, r.right - r.left + 1 - width, r.bottom - r.top + 1 - width);
  ctx.restore();
}

/** A piece on its grey hexagon at (x, y) (FUN_0040b7e0). */
function drawPiece(ctx: CanvasRenderingContext2D, art: Art, piece: number, x: number, y: number) {
  ctx.drawImage(art.piece, x, y);
  ctx.drawImage(art.shapes, (piece >> 2) * 16, (piece & 3) * 16, 16, 16, x + 10, y + 12, 16, 16);
}

function text(ctx: CanvasRenderingContext2D, s: string, r: Rect) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, (r.left + r.right + 1) / 2, (r.top + r.bottom + 1) / 2);
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: State,
  art: Art,
  background: string,
  drag: Drag | null,
  options: { dragBitmaps: boolean; showDragZones: boolean; showDropZones: boolean },
  pointer: { x: number; y: number } | null,
) {
  ctx.fillStyle = art.texture ? (ctx.createPattern(art.texture, 'repeat') ?? background) : background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // The time bar: the stopwatch, in dark red, over 5 seconds (FUN_00409430).
  bevel(ctx, TIME_BOX, 2, true);
  bevel(ctx, { left: 381, top: 7, right: 507, bottom: 33 }, 1, false, false);
  const bar = Math.trunc(((TIME_BOX.right - TIME_BOX.left + 1 - 8) * state.bar) / PENALTY_MS);
  ctx.fillStyle = '#800000';
  if (bar > 0) ctx.fillRect(TIME_BAR.left, TIME_BAR.top, bar, TIME_BAR.bottom - TIME_BAR.top + 1);

  bevel(ctx, SCORE_BOX, 2, true);
  bevel(ctx, SCORE_INNER, 2, false, false);
  ctx.fillStyle = '#000080';
  ctx.font = 'bold 14px Arial, Helvetica, sans-serif';
  text(ctx, 'Score', SCORE_LABEL);
  ctx.fillStyle = '#ff0000';
  ctx.font = '22px Arial, Helvetica, sans-serif';
  text(ctx, String(state.score), SCORE_VALUE);

  bevel(ctx, PIECES_BOX, 2, true);
  bevel(ctx, PIECES_INNER, 2, false, false);
  SLOT_POSITIONS.forEach((p, slot) => {
    // While dragged by its picture, the piece leaves its slot empty.
    if (drag?.slot === slot && options.dragBitmaps) return;
    drawPiece(ctx, art, state.slots[slot]!, p.x, p.y);
  });

  // The board: white hexagons outlined in black, 2 pixels wide (FUN_004091c0).
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#ffffff';
  const { size } = state;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const r = cellRect(size, col, row);
      ctx.beginPath();
      for (const [x, y] of hexagon(r)) ctx.lineTo(x + 0.5, y + 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = state.cells[row * size + col]!;
      const r = cellRect(size, col, row);
      if (cell >= Cell.Skull) {
        ctx.drawImage(art.tiles, (cell - Cell.Skull) * 32, 0, 32, 32, r.left + 5, r.top + 8, 32, 32);
      } else if (cell !== Cell.Empty) {
        drawPiece(ctx, art, cell - 1, r.left + 2, r.top + 4);
      }
    }
  }

  if (drag) {
    const x = drag.x - drag.grabX;
    const y = drag.y - drag.grabY;
    if (options.dragBitmaps) drawPiece(ctx, art, state.slots[drag.slot]!, x, y);
    else invertedOutline(ctx, { left: x, top: y, right: x + PIECE_W - 1, bottom: y + PIECE_H - 1 }, 3);
    if (options.showDropZones) {
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (!isFree(state.cells[row * size + col]!)) continue;
          for (const z of dropZones(cellRect(size, col, row))) {
            if (inside(z, drag.x, drag.y)) invertedOutline(ctx, z, 1);
          }
        }
      }
    }
  } else if (options.showDragZones && pointer && state.playing) {
    SLOT_POSITIONS.forEach((_, slot) => {
      const r = slotRect(slot);
      if (inside(r, pointer.x, pointer.y)) invertedOutline(ctx, r, 3);
    });
  }
}

/**
 * The game window's content: the board, the time bar, the score and the four pieces to place.
 * Scaled by whole pixels when there is room, to the width on phones. Pointer events (mouse,
 * pen or finger) are reported in the window's own coordinates.
 */
export function Board(props: {
  state: State;
  art: Art | null;
  background: string;
  drag: Drag | null;
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
  onDown: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onUp: (x: number, y: number) => void;
}) {
  const { state, art, background, drag, dragBitmaps, showDragZones, showDropZones } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    redraw.current = () => {
      const ctx = canvas.current?.getContext('2d');
      if (ctx && art) {
        const options = { dragBitmaps, showDragZones, showDropZones };
        draw(ctx, state, art, background, drag, options, pointer.current);
      }
    };
    redraw.current();
  }, [state, art, background, drag, dragBitmaps, showDragZones, showDropZones]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) * WIDTH) / r.width),
      y: Math.floor(((e.clientY - r.top) * HEIGHT) / r.height),
    };
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Play field"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          props.onDown(p.x, p.y);
        }}
        onPointerMove={(e) => {
          const p = at(e);
          pointer.current = p;
          if (drag) props.onMove(p.x, p.y);
          else if (showDragZones) redraw.current();
        }}
        onPointerUp={(e) => {
          const p = at(e);
          props.onUp(p.x, p.y);
        }}
        onPointerCancel={() => props.onUp(-1, -1)}
        onPointerLeave={() => {
          pointer.current = null;
          if (showDragZones && !drag) redraw.current();
        }}
      />
    </div>
  );
}
