import { useEffect, useMemo, useRef, useState } from 'react';
import piecesImage from '../../assets/bbchess/pieces.png';
import { useFitScale, useImages } from '../../shell/canvas.ts';
import { BOARD_SHEET, drawSquare, PIECE, SQUARE } from '../../shell/czgame/pieces.ts';
import { canDrop, canGuess, PIECES, type Point, type State } from './logic.ts';
import { invertOutline } from '../../shell/czgame/draw.ts';

/** The original window's client area: 421×328. */
export const WIDTH = 421;
export const HEIGHT = 328;
const FACE = '#c0c0c0';
const LIGHT = '#ffffff';
const SHADOW = '#808080';
/** The board's top-left corner (`FUN_0040cd7b`). */
const BOARD = 4;
/** The Guess / Give Up box (`FUN_0040255d`), and its halves. */
const LABELS = { x: 0x148, y: 4, right: 0x1a2, bottom: 0x48, middle: 0x26 };
/** The palette (`FUN_00401df3`): an outer raised frame, an inner sunken one. */
const PALETTE = { x: 0x148, y: 0x4b, w: 0x5a, h: 0xf8 };

/** A frame (`FUN_00408420`, `FUN_004046d0`): raised, or sunken. */
function frame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  right: number,
  bottom: number,
  width: number,
  sunken = false,
) {
  const w = right - x + 1;
  const h = bottom - y + 1;
  if (!sunken) {
    ctx.fillStyle = FACE;
    ctx.fillRect(x, y, w, h);
  }
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = sunken ? SHADOW : LIGHT;
    ctx.fillRect(x + i, y + i, w - 2 * i, 1);
    ctx.fillRect(x + i, y + i, 1, h - 2 * i);
    ctx.fillStyle = sunken ? LIGHT : SHADOW;
    ctx.fillRect(x + i, bottom - i, w - 2 * i, 1);
    ctx.fillRect(right - i, y + i, 1, h - 2 * i);
  }
}

/** Text with a black outline (the original's outlined fonts), centred on (x, y). */
function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = 'bold 40px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

const squareRect = (p: Point) => ({ x: BOARD + p.x * SQUARE, y: BOARD + p.y * SQUARE });

/** Where piece `i` is shown (`FUN_0040105b`): on its square, or in the palette. */
function pieceRect(state: State, i: number) {
  const p = state.placed[i];
  if (p) {
    const r = squareRect(p);
    return { x: r.x + 4, y: r.y + 4 };
  }
  return { x: 0x164, y: i * 0x2d + 0x58 };
}

const inside = (p: Point, x: number, y: number, w: number, h: number) =>
  p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;

export type Press = { kind: 'guess' } | { kind: 'giveUp' } | { kind: 'square'; at: Point } | { kind: 'miss' };

/**
 * The window (`FUN_00401df3`): the board on the window background, the Guess / Give Up box and
 * the palette on the right. Pieces are dragged between the palette and the "?" squares.
 */
export function Board(props: {
  state: State;
  boardSet: number;
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
  onPress: (press: Press) => void;
  onDragStart: () => void;
  onDrop: (piece: number, to: Point | null, ok: boolean) => void;
}) {
  const { state, boardSet } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const images = useImages([piecesImage, BOARD_SHEET]);
  const scale = useFitScale(box, WIDTH, HEIGHT, 60);
  const [drag, setDrag] = useState<{ piece: number; at: Point; grab: Point } | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);

  const squareAt = (p: Point): Point | null => {
    const [x, y] = [Math.floor((p.x - BOARD) / SQUARE), Math.floor((p.y - BOARD) / SQUARE)];
    return p.x >= BOARD && p.y >= BOARD && x < 8 && y < 8 ? { x, y } : null;
  };
  /** The drop zone under `p`: a square, the palette (null), or none (undefined). */
  const dropAt = (piece: number, p: Point): Point | null | undefined => {
    if (inside(p, PALETTE.x, PALETTE.y, PALETTE.w, PALETTE.h)) return null;
    const sq = squareAt(p);
    return sq && canDrop(state, piece, sq) ? sq : undefined;
  };
  const pieceAt = (p: Point): number => {
    if (!state.active) return -1;
    for (let i = 0; i < PIECES; i++) {
      const r = pieceRect(state, i);
      if (inside(p, r.x, r.y, PIECE, PIECE)) return i;
    }
    return -1;
  };

  const sprites = useMemo(() => images?.[0] ?? null, [images]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images || !sprites) return;
    const boards = images[1]!;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const dragged = drag && props.dragBitmaps ? drag.piece : -1;
    for (let i = 0; i < 64; i++) {
      const p = { x: i % 8, y: Math.floor(i / 8) };
      const r = squareRect(p);
      drawSquare(ctx, boards, boardSet, (p.x + p.y) % 2 === 0 ? 0 : 1, r.x, r.y);
      const sq = state.squares[i]!;
      const covered = state.placed.some((q, piece) => piece !== dragged && q?.x === p.x && q?.y === p.y);
      const [cx, cy] = [r.x + SQUARE / 2, r.y + SQUARE / 2 + 1];
      if (sq.kind === 'count') outlined(ctx, String(sq.count), cx, cy, '#008080');
      else if (sq.kind === 'hidden' && !covered) outlined(ctx, '?', cx, cy, '#ffff00');
    }
    // Guess / Give Up: black when available, grey otherwise.
    frame(ctx, LABELS.x, LABELS.y, LABELS.right, LABELS.bottom, 2);
    ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = (LABELS.x + LABELS.right + 1) / 2;
    ctx.fillStyle = canGuess(state) ? '#000000' : SHADOW;
    ctx.fillText('Guess=Enter', cx, (LABELS.y + LABELS.middle + 1) / 2);
    ctx.fillStyle = state.active ? '#000000' : SHADOW;
    ctx.fillText('GiveUp=Ctrl+G', cx, (LABELS.middle + LABELS.bottom + 1) / 2);
    // The palette, then the pieces.
    frame(ctx, PALETTE.x, PALETTE.y, PALETTE.x + PALETTE.w - 1, PALETTE.y + PALETTE.h - 1, 2);
    frame(ctx, 0x150, 0x53, 0x150 + 0x4a - 1, 0x53 + 0xe8 - 1, 2, true);
    for (let i = 0; i < PIECES; i++) {
      if (i === dragged) continue;
      const r = pieceRect(state, i);
      ctx.drawImage(sprites, i * PIECE, 0, PIECE, PIECE, r.x, r.y, PIECE, PIECE);
    }
    // Show Drag Zones: the piece under the pointer; Show Drop Zones: the zone under it.
    if (pointer && !drag && props.showDragZones) {
      const i = pieceAt(pointer);
      if (i >= 0) invertOutline(ctx, pieceRect(state, i).x, pieceRect(state, i).y, PIECE, PIECE);
    }
    if (pointer && drag && props.showDropZones) {
      const zone = dropAt(drag.piece, pointer);
      if (zone === null) invertOutline(ctx, PALETTE.x, PALETTE.y, PALETTE.w, PALETTE.h);
      else if (zone) invertOutline(ctx, squareRect(zone).x, squareRect(zone).y, SQUARE, SQUARE);
    }
    if (drag) {
      const [x, y] = [drag.at.x - drag.grab.x, drag.at.y - drag.grab.y];
      if (props.dragBitmaps) {
        ctx.drawImage(sprites, drag.piece * PIECE, 0, PIECE, PIECE, x, y, PIECE, PIECE);
      } else invertOutline(ctx, x, y, PIECE, PIECE);
    }
  });

  const local = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * HEIGHT) / rect.height,
    };
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Black Box Chess board"
        onPointerDown={(e) => {
          const p = local(e);
          const labels = inside(p, LABELS.x, LABELS.y, LABELS.right - LABELS.x + 1, LABELS.bottom - LABELS.y + 1);
          if (state.active && labels) {
            props.onPress({ kind: p.y < LABELS.middle ? 'guess' : 'giveUp' });
            return;
          }
          const sq = squareAt(p);
          if (state.active && sq && state.squares[sq.y * 8 + sq.x]!.kind === 'unknown') {
            props.onPress({ kind: 'square', at: sq });
            return;
          }
          const piece = pieceAt(p);
          if (piece < 0) {
            props.onPress({ kind: 'miss' });
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = pieceRect(state, piece);
          setDrag({ piece, at: p, grab: { x: p.x - r.x, y: p.y - r.y } });
          props.onDragStart();
        }}
        onPointerMove={(e) => {
          const p = local(e);
          setPointer(p);
          if (drag) setDrag({ ...drag, at: p });
        }}
        onPointerLeave={() => !drag && setPointer(null)}
        onPointerUp={(e) => {
          if (!drag) return;
          const zone = dropAt(drag.piece, local(e));
          setDrag(null);
          props.onDrop(drag.piece, zone ?? null, zone !== undefined);
        }}
        onPointerCancel={() => {
          if (!drag) return;
          setDrag(null);
          props.onDrop(drag.piece, null, false);
        }}
      />
    </div>
  );
}
