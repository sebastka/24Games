import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/engulf/logo.png';
import { fillBackground, textureOf, useFitScale, useImage } from '../../shell/canvas.ts';
import type { Point } from '../../shell/czgame/animate.ts';
import { bevel, centeredText, invertOutline, NAVY } from '../../shell/czgame/draw.ts';
import { BOARD_SHEET, PIECE, SQUARE, usePieces } from '../../shell/czgame/pieces.ts';
import { FRAME, HEIGHT, LOGO_AT, ORIGIN, PANELS, pieceAt, SCORE_BOX, WIDTH } from './layout.ts';
import { at, BLOCKED, COMPUTER, PLAYER, SIZE, type Board as Squares, type Move, type Side } from './logic.ts';

const inside = (p: Point, corner: Point): boolean =>
  p.x >= corner.x && p.x < corner.x + PIECE && p.y >= corner.y && p.y < corner.y + PIECE;

interface Drag {
  from: number;
  /** The pointer's offset in the piece when it was picked up. */
  grab: Point;
  pointer: Point;
}

/**
 * The 512×302 game window: the board in its frame, the logo, the scores. The player drags a
 * piece (pressing on it) to a square one or two away (`FUN_004021d0`, `FUN_00402580`); a press
 * anywhere else beeps.
 */
export function Board(props: {
  squares: Squares;
  background: number;
  board: number;
  pieceSet: number;
  moving: { side: Side; at: Point } | null;
  thinking: boolean;
  /** The player's moves, when it is the player's turn. */
  moves: readonly Move[];
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
  onPickUp: () => void;
  onDrop: (move: Move) => void;
  onMiss: () => void;
}) {
  const { squares, moving, moves } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const sheet = useImage(BOARD_SHEET);
  const logo = useImage(logoUrl);
  const texture = useImage(textureOf(props.background));
  const pieces = usePieces(props.pieceSet);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet || !pieces) return;
    const piece = (side: number, p: Point) => ctx.drawImage(pieces[side === PLAYER ? 0 : 1], p.x, p.y, PIECE, PIECE);
    fillBackground(ctx, props.background, texture, WIDTH, HEIGHT);
    bevel(ctx, FRAME, 4);
    for (let x = 0; x < SIZE; x++) {
      for (let y = 0; y < SIZE; y++) {
        const sx = props.board * 2 * SQUARE + (squares[at(x, y)] === BLOCKED ? 0 : SQUARE);
        ctx.drawImage(sheet, sx, 0, SQUARE, SQUARE, ORIGIN + x * SQUARE, ORIGIN + y * SQUARE, SQUARE, SQUARE);
      }
    }
    squares.forEach((c, i) => {
      if ((c === PLAYER || c === COMPUTER) && !(drag && props.dragBitmaps && i === drag.from)) piece(c, pieceAt(i));
    });
    if (logo) ctx.drawImage(logo, LOGO_AT.x, LOGO_AT.y);
    bevel(ctx, SCORE_BOX, 2);
    centeredText(ctx, 'SCORE', SCORE_BOX, {
      font: 'bold 22px Arial, Helvetica, sans-serif',
      color: '#ff0000',
      shadow: true,
    });
    PANELS.forEach((p, i) => {
      bevel(ctx, p.box, 2);
      const label = 'bold 20px Arial, Helvetica, sans-serif';
      centeredText(ctx, i === 0 ? 'Computer' : 'Player', p.name, { font: label, color: NAVY, shadow: true });
      centeredText(ctx, 'Score', p.score, { font: label, color: NAVY, shadow: true });
      bevel(ctx, p.count, 2, undefined, 'sunken');
      const n = squares.filter((c) => c === (i === 0 ? COMPUTER : PLAYER)).length;
      centeredText(ctx, String(n), p.count, {
        font: 'bold 40px Arial, Helvetica, sans-serif',
        color: NAVY,
        shadow: true,
      });
    });
    if (moving) piece(moving.side, moving.at);

    // The zones under the pointer (Options › Animation › Show Drag/Drop Zones), inverted: a
    // 3-pixel frame straddling a piece's square (the framework's XOR zone, style 3).
    const frame = (c: Point) => invertOutline(ctx, c.x - 1, c.y - 1, PIECE + 2, PIECE + 2);
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    if (drag && hover && props.showDropZones) {
      const target = moves.find((m) => m.from === drag.from && inside(hover, pieceAt(m.to)));
      if (target?.jump) frame(pieceAt(target.to));
      else if (target) ctx.fillRect(pieceAt(target.to).x, pieceAt(target.to).y, PIECE, PIECE);
    } else if (!drag && hover && props.showDragZones) {
      const zone = moves.find((m) => inside(hover, pieceAt(m.from)));
      if (zone) frame(pieceAt(zone.from));
    }
    if (drag && !props.dragBitmaps) {
      frame({ x: drag.pointer.x - drag.grab.x, y: drag.pointer.y - drag.grab.y });
    }
    ctx.restore();
    if (drag && props.dragBitmaps) piece(PLAYER, { x: drag.pointer.x - drag.grab.x, y: drag.pointer.y - drag.grab.y });
  }, [squares, moving, moves, drag, hover, sheet, logo, texture, pieces, props.background, props.board, props]);

  const pointOf = (e: React.PointerEvent): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * WIDTH),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * HEIGHT),
    };
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale, cursor: props.thinking ? 'wait' : 'default' }}
        aria-label="Engulf board"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const p = pointOf(e);
          const zone = moves.find((m) => inside(p, pieceAt(m.from)));
          if (!zone) {
            props.onMiss();
            return;
          }
          e.currentTarget.setPointerCapture(e.pointerId);
          const corner = pieceAt(zone.from);
          setDrag({ from: zone.from, grab: { x: p.x - corner.x, y: p.y - corner.y }, pointer: p });
          props.onPickUp();
        }}
        onPointerMove={(e) => {
          const p = pointOf(e);
          setHover(p);
          if (drag) setDrag({ ...drag, pointer: p });
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={(e) => {
          if (!drag) return;
          const p = pointOf(e);
          const target = moves.find((m) => m.from === drag.from && inside(p, pieceAt(m.to)));
          setDrag(null);
          if (target) props.onDrop(target);
        }}
        onPointerCancel={() => setDrag(null)}
      />
    </div>
  );
}
