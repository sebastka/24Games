import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/meltdown/logo.png';
import { fillBackground, textureOf, useFitScale, useImage } from '../../shell/canvas.ts';
import type { Point } from '../../shell/czgame/animate.ts';
import { bevel, centeredText, outlinedText } from '../../shell/czgame/draw.ts';
import { BOARD_SHEET, PIECE, SQUARE, usePieces } from '../../shell/czgame/pieces.ts';
import { HEIGHT, LOGO_AT, PANELS, pieceSize, SCORE_BOX, SIDE_PIECE, squareAt, WIDTH } from './layout.ts';
import { COMPUTER, PLAYER, sizeOf, totals, units, type Board as Squares, type Side } from './logic.ts';

const RED = '#ff0000';
const YELLOW = '#ffff00';

/**
 * The 510×291 game window: the N×N board centred on the left (its outer ring in the board's
 * first square), the logo, the score and the two sides' totals. A click on a square the player
 * may play adds a unit there; the pointer is a cross-hair over those squares.
 */
export function Board(props: {
  squares: Squares;
  background: number;
  board: number;
  pieceSet: number;
  /** A unit flying from a side's piece to its square: its side, position and size. */
  moving: { side: Side; at: Point; size: number } | null;
  thinking: boolean;
  canClick: (square: number) => boolean;
  onSquare: (square: number) => void;
}) {
  const { squares, moving } = props;
  const n = sizeOf(squares);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const sheet = useImage(BOARD_SHEET);
  const logo = useImage(logoUrl);
  const texture = useImage(textureOf(props.background));
  const pieces = usePieces(props.pieceSet);
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet || !pieces) return;
    // The original shrinks the piece set with StretchBlt: no smoothing.
    ctx.imageSmoothingEnabled = false;
    const piece = (side: Side, p: Point, size: number) =>
      ctx.drawImage(pieces[side === PLAYER ? 0 : 1], p.x, p.y, size, size);
    fillBackground(ctx, props.background, texture, WIDTH, HEIGHT);
    squares.forEach((v, i) => {
      const x = i % n;
      const y = Math.floor(i / n);
      const ring = x === 0 || y === 0 || x === n - 1 || y === n - 1;
      const at = squareAt(n, i);
      ctx.drawImage(
        sheet,
        props.board * 2 * SQUARE + (ring ? 0 : SQUARE),
        0,
        SQUARE,
        SQUARE,
        at.x,
        at.y,
        SQUARE,
        SQUARE,
      );
      const u = units(v);
      if (u === 0 || v > 20) return;
      const size = pieceSize(u);
      const offset = (SQUARE - size) / 2;
      piece(v > 10 ? COMPUTER : PLAYER, { x: at.x + offset, y: at.y + offset }, size);
    });
    for (const side of [COMPUTER, PLAYER] as const) piece(side, SIDE_PIECE[side], PIECE);
    if (logo) ctx.drawImage(logo, LOGO_AT.x, LOGO_AT.y);
    bevel(ctx, SCORE_BOX, 2);
    outlinedText(ctx, 'SCORE', SCORE_BOX, 'bold 22px Arial, Helvetica, sans-serif', YELLOW, RED);
    const t = totals(squares);
    PANELS.forEach((p, i) => {
      bevel(ctx, p.box, 2);
      const label = 'bold 20px Arial, Helvetica, sans-serif';
      centeredText(ctx, i === 0 ? 'Computer' : 'Player', p.name, { font: label, color: RED, shadow: true });
      centeredText(ctx, 'Score', p.score, { font: label, color: RED, shadow: true });
      bevel(ctx, p.count, 2, undefined, 'sunken');
      const total = String(i === 0 ? t.computer : t.player);
      outlinedText(ctx, total, p.count, 'bold 40px Arial, Helvetica, sans-serif', YELLOW, RED);
    });
    if (moving) piece(moving.side, moving.at, moving.size);
  }, [squares, moving, n, sheet, logo, texture, pieces, props.background, props.board]);

  const squareOf = (e: React.PointerEvent): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = squareAt(n, 0);
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * WIDTH) - origin.x;
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * HEIGHT) - origin.y;
    if (x < 0 || y < 0 || x >= n * SQUARE || y >= n * SQUARE) return -1;
    return Math.floor(y / SQUARE) * n + Math.floor(x / SQUARE);
  };

  const cursor = props.thinking ? 'wait' : hover >= 0 && props.canClick(hover) ? 'crosshair' : 'default';
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale, cursor }}
        aria-label="Core Meltdown board"
        onPointerMove={(e) => setHover(squareOf(e))}
        onPointerLeave={() => setHover(-1)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          props.onSquare(squareOf(e));
        }}
      />
    </div>
  );
}
