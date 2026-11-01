import { useEffect, useMemo, useRef, useState } from 'react';
import { useFitScale, useImages } from '../../shell/canvas.ts';
import { BOARD_IMAGE, drawSquare, PIECE_SIZE, pieceSprites, SQUARE_SIZE } from '../quinto/sets.ts';
import { movable, piecesLeft, targets, type Point, type State } from './logic.ts';

/** The original window's client area (pegoplis.exe's window resource): 512×342. */
export const WIDTH = 512;
export const HEIGHT = 342;
const FACE = '#c0c0c0';
const LIGHT = '#ffffff';
const SHADOW = '#808080';
const SIDE = 0x158;
const RIGHT = 0x1fc;

/** A raised frame (`FUN_004086b0`): face colour, `width` pixels of light top-left, shadow bottom-right. */
function frame(ctx: CanvasRenderingContext2D, x: number, y: number, right: number, bottom: number, width: number) {
  const w = right - x + 1;
  const h = bottom - y + 1;
  ctx.fillStyle = FACE;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < width; i++) {
    ctx.fillStyle = LIGHT;
    ctx.fillRect(x + i, y + i, w - 2 * i, 1);
    ctx.fillRect(x + i, y + i, 1, h - 2 * i);
    ctx.fillStyle = SHADOW;
    ctx.fillRect(x + i, bottom - i, w - 2 * i, 1);
    ctx.fillRect(right - i, y + i, 1, h - 2 * i);
  }
}

/** The zones' mark (`FUN_0040afa0`): a 3-pixel rectangle, inverting what is under it. */
function invertRing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.restore();
}

/** The board's top-left corner (`FUN_004015a0`): centred in the 342-pixel square on the left. */
const originOf = (state: State) => ({ x: 171 - 20 * state.width, y: 171 - 20 * state.height });

export interface Drag {
  from: Point;
  /** The pointer, and where on the piece it took it. */
  at: Point;
  grab: Point;
}

/**
 * The window (`FUN_004031c0`): the board on the window background; on the right, the layout's
 * description, and the pieces remaining or the goal pattern. Pieces are dragged onto empty
 * squares two away.
 */
export function Board(props: {
  state: State;
  text: string;
  preview: string;
  pieceSet: string;
  boardSet: number;
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
  onDragStart: () => void;
  onDrop: (from: Point, to: Point | null) => void;
  onMiss: () => void;
}) {
  const { state, boardSet } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const images = useImages([props.pieceSet, BOARD_IMAGE, props.preview]);
  const sprites = useMemo(() => (images ? pieceSprites(images[0]!) : null), [images]);
  const scale = useFitScale(box, WIDTH, HEIGHT, 60);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const o = originOf(state);
  const zones = useMemo(() => (state.active ? movable(state) : []), [state]);
  const drops = useMemo(() => (drag ? targets(state, drag.from) : []), [state, drag]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images || !sprites) return;
    const [, boards, preview] = images as HTMLImageElement[];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    state.cells.forEach((cell, i) => {
      if (cell.square === null) return;
      const [x, y] = [o.x + (i % state.width) * SQUARE_SIZE, o.y + Math.floor(i / state.width) * SQUARE_SIZE];
      drawSquare(ctx, boards!, boardSet, cell.square, x, y);
      const dragged = drag && props.dragBitmaps && i === drag.from.y * state.width + drag.from.x;
      if (cell.piece !== null && !dragged) ctx.drawImage(sprites[cell.piece], x + 4, y + 4);
    });

    // The description, line by line from (349, 9), 16 pixels apart.
    frame(ctx, SIDE, 4, RIGHT, 0xe0, 2);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Arial, Helvetica, sans-serif';
    props.text.split('\n').forEach((line, i) => ctx.fillText(line, 0x15d, 9 + 16 * i));

    // The pieces remaining, or the goal pattern (FUN_00402db0).
    const top = 0xe4;
    const bottom = HEIGHT - 4;
    frame(ctx, SIDE, top, RIGHT, bottom, 2);
    ctx.font = '13px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.score ? 'Pieces Remaining' : 'Goal Pattern', (SIDE + RIGHT + 1) / 2, top + 2 + 9);
    if (state.score) {
      // FUN_00403000: the count, big, navy with a shadow.
      const [cx, cy] = [(0x15c + 0x1f8 + 1) / 2, (0xfc + HEIGHT - 8 + 1) / 2];
      ctx.font = 'bold 48px Arial, Helvetica, sans-serif';
      ctx.fillStyle = SHADOW;
      ctx.fillText(String(piecesLeft(state)), cx + 2, cy + 2);
      ctx.fillStyle = '#000080';
      ctx.fillText(String(piecesLeft(state)), cx, cy);
    } else {
      const area = { x: SIDE + 2, y: top + 0x16, w: RIGHT - 2 - (SIDE + 2) + 1, h: bottom - 4 - (top + 0x16) + 1 };
      ctx.drawImage(
        preview!,
        area.x + Math.trunc((area.w - preview!.width) / 2),
        area.y + Math.trunc((area.h - preview!.height) / 2),
      );
    }

    // Show Drag Zones: the movable piece under the pointer; Show Drop Zones: the square under it.
    if (!drag && hover && props.showDragZones && zones.some((z) => z.x === hover.x && z.y === hover.y)) {
      invertRing(ctx, o.x + hover.x * SQUARE_SIZE + 4, o.y + hover.y * SQUARE_SIZE + 4, PIECE_SIZE, PIECE_SIZE);
    }
    if (drag && hover && props.showDropZones && drops.some((z) => z.x === hover.x && z.y === hover.y)) {
      invertRing(ctx, o.x + hover.x * SQUARE_SIZE, o.y + hover.y * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
    }
    if (drag) {
      const [x, y] = [drag.at.x - drag.grab.x, drag.at.y - drag.grab.y];
      const piece = state.cells[drag.from.y * state.width + drag.from.x]!.piece;
      if (props.dragBitmaps && piece !== null) ctx.drawImage(sprites[piece], x, y);
      else invertRing(ctx, x, y, PIECE_SIZE, PIECE_SIZE);
    }
  }, [
    state,
    images,
    sprites,
    boardSet,
    drag,
    hover,
    zones,
    drops,
    props.text,
    props.dragBitmaps,
    props.showDragZones,
    props.showDropZones,
    o.x,
    o.y,
  ]);

  const local = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * HEIGHT) / rect.height,
    };
  };
  const squareAt = (p: Point): Point | null => {
    const [x, y] = [Math.floor((p.x - o.x) / SQUARE_SIZE), Math.floor((p.y - o.y) / SQUARE_SIZE)];
    return p.x >= o.x && p.y >= o.y && x < state.width && y < state.height ? { x, y } : null;
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Pegopolis board"
        onPointerDown={(e) => {
          const p = local(e);
          const sq = squareAt(p);
          // A press starts a drag only on a piece's 32×32 picture, and only if that piece can jump.
          const onPiece =
            sq &&
            zones.some((z) => z.x === sq.x && z.y === sq.y) &&
            p.x >= o.x + sq.x * SQUARE_SIZE + 4 &&
            p.x < o.x + sq.x * SQUARE_SIZE + 4 + PIECE_SIZE &&
            p.y >= o.y + sq.y * SQUARE_SIZE + 4 &&
            p.y < o.y + sq.y * SQUARE_SIZE + 4 + PIECE_SIZE;
          if (!onPiece) {
            props.onMiss();
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          const grab = { x: p.x - (o.x + sq.x * SQUARE_SIZE + 4), y: p.y - (o.y + sq.y * SQUARE_SIZE + 4) };
          setDrag({ from: sq, at: p, grab });
          setHover(sq);
          props.onDragStart();
        }}
        onPointerMove={(e) => {
          const p = local(e);
          setHover(squareAt(p));
          if (drag) setDrag({ ...drag, at: p });
        }}
        onPointerLeave={() => !drag && setHover(null)}
        onPointerUp={(e) => {
          if (!drag) return;
          const sq = squareAt(local(e));
          const to = sq && drops.some((z) => z.x === sq.x && z.y === sq.y) ? sq : null;
          setDrag(null);
          props.onDrop(drag.from, to);
        }}
        onPointerCancel={() => {
          if (!drag) return;
          setDrag(null);
          props.onDrop(drag.from, null);
        }}
      />
    </div>
  );
}
