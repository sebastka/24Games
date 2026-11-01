import { useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/reversi/logo.png';
import { fillBackground, textureOf, useFitScale, useImage } from '../../shell/canvas.ts';
import type { Point } from '../../shell/czgame/animate.ts';
import { bevel, centeredText, NAVY, PURPLE } from '../../shell/czgame/draw.ts';
import { BOARD_SHEET, PIECE, SQUARE, usePieces } from '../../shell/czgame/pieces.ts';
import { BOXES, HEIGHT, HOME, ORIGIN, PANEL, pieceAt, WIDTH } from './layout.ts';
import { COMPUTER, PLAYER, type Board as Squares, type Side } from './logic.ts';

/** The board's two looks of square (`FUN_00409920`): the corner and centre 2×2 blocks use the first. */
const firstLook = (x: number, y: number): boolean =>
  ((x < 2 || x >= 6) && (y < 2 || y >= 6)) || (x >= 3 && x < 5 && y >= 3 && y < 5);

/**
 * The 560×342 game window: the board in its frame, the logo, the two sides' pieces and their
 * scores. Clicks on a square call `onSquare`; the pointer is a cross-hair over the squares the
 * player may play (`canPlay`), an hourglass while the computer thinks.
 */
export function Board(props: {
  squares: Squares;
  background: number;
  board: number;
  pieceSet: number;
  moving: { side: Side; at: Point } | null;
  thinking: boolean;
  canPlay: (square: number) => boolean;
  onSquare: (square: number) => void;
}) {
  const { squares, moving } = props;
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
    fillBackground(ctx, props.background, texture, WIDTH, HEIGHT);
    bevel(ctx, { left: 4, top: 4, right: 337, bottom: 337 }, 4);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sx = props.board * 2 * SQUARE + (firstLook(x, y) ? 0 : SQUARE);
        ctx.drawImage(sheet, sx, 0, SQUARE, SQUARE, ORIGIN + x * SQUARE, ORIGIN + y * SQUARE, SQUARE, SQUARE);
      }
    }
    if (logo) {
      const x = 341 + Math.trunc(216 / 2) - Math.trunc(logo.width / 2);
      const y = 4 - Math.trunc(logo.height / 2) + Math.trunc(97 / 2);
      ctx.drawImage(logo, x, y);
    }
    bevel(ctx, PANEL, 2);
    const piece = (side: number, at: Point) => ctx.drawImage(pieces[side === PLAYER ? 0 : 1], at.x, at.y, PIECE, PIECE);
    for (const side of [PLAYER, COMPUTER] as const) {
      if (moving?.side !== side) piece(side, HOME[side]);
    }
    ['Player', 'Computer'].forEach((label, i) => {
      const b = BOXES[i]!;
      bevel(ctx, b, 2);
      centeredText(
        ctx,
        label,
        { ...b, bottom: b.top + 24 },
        { font: 'bold 17px Arial, Helvetica, sans-serif', color: NAVY },
      );
      const score = squares.filter((s) => s === (i === 0 ? PLAYER : COMPUTER)).length;
      const area = { left: b.left + 2, top: b.top + 24, right: b.right - 2, bottom: b.bottom - 2 };
      centeredText(ctx, String(score), area, {
        font: 'bold 46px Arial, Helvetica, sans-serif',
        color: PURPLE,
        shadow: true,
      });
    });
    squares.forEach((side, square) => side !== 0 && piece(side, pieceAt(square)));
    if (moving) piece(moving.side, moving.at);
  }, [squares, moving, sheet, logo, texture, pieces, props.background, props.board]);

  const squareAt = (e: React.PointerEvent): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * WIDTH) - ORIGIN;
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * HEIGHT) - ORIGIN;
    if (x < 0 || y < 0 || x >= 8 * SQUARE || y >= 8 * SQUARE) return -1;
    return Math.floor(y / SQUARE) * 8 + Math.floor(x / SQUARE);
  };

  const cursor = props.thinking ? 'wait' : hover >= 0 && props.canPlay(hover) ? 'crosshair' : 'default';
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale, cursor }}
        aria-label="Reversi board"
        onPointerMove={(e) => setHover(squareAt(e))}
        onPointerLeave={() => setHover(-1)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const square = squareAt(e);
          // The original's clicks outside the board go to the window, which beeps (no drag zone).
          props.onSquare(square);
        }}
      />
    </div>
  );
}
