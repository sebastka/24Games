import { useEffect, useRef, useState } from 'react';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import type { Point } from '../../shell/czgame/animate.ts';
import { MAROON } from '../../shell/czgame/draw.ts';
import { BOARD_SHEET, PIECE, SQUARE, usePieces } from '../../shell/czgame/pieces.ts';
import { HEIGHT, pieceAt, WIDTH } from './layout.ts';
import { COLUMNS, EMPTY, PLAYER, ROWS, type Side } from './logic.ts';

/**
 * The board: the top row (the board's first square) holds the column letters, the play area its
 * second square, except the winning four, lit up with the first. A click anywhere in a column
 * drops a piece there; the pointer is a cross-hair over the columns that take one.
 */
export function Board(props: {
  cells: readonly number[];
  lit: readonly number[];
  board: number;
  pieceSet: number;
  moving: { side: Side; at: Point } | null;
  thinking: boolean;
  canDrop: (column: number) => boolean;
  onColumn: (column: number) => void;
}) {
  const { cells, lit, moving } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const sheet = useImage(BOARD_SHEET);
  const pieces = usePieces(props.pieceSet);
  const [hover, setHover] = useState(-1);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet || !pieces) return;
    const square = (first: boolean, x: number, y: number) =>
      ctx.drawImage(sheet, props.board * 2 * SQUARE + (first ? 0 : SQUARE), 0, SQUARE, SQUARE, x, y, SQUARE, SQUARE);
    const piece = (side: number, at: Point) => ctx.drawImage(pieces[side === PLAYER ? 0 : 1], at.x, at.y, PIECE, PIECE);
    ctx.font = 'bold 30px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (let col = 0; col < COLUMNS; col++) {
      square(true, col * SQUARE, 0);
      const letter = String.fromCharCode(65 + col);
      ctx.strokeStyle = MAROON;
      ctx.strokeText(letter, col * SQUARE + 20, 21);
      ctx.fillStyle = '#ffff00';
      ctx.fillText(letter, col * SQUARE + 20, 21);
      for (let row = 0; row < ROWS; row++) {
        square(lit.includes(col * ROWS + row), col * SQUARE, (ROWS - row) * SQUARE);
      }
    }
    cells.forEach((side, i) => side !== EMPTY && piece(side, pieceAt(Math.floor(i / ROWS), i % ROWS)));
    if (moving) piece(moving.side, moving.at);
  }, [cells, lit, moving, sheet, pieces, props.board]);

  const columnAt = (e: React.PointerEvent): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * WIDTH);
    return x >= 0 && x < WIDTH ? Math.floor(x / SQUARE) : -1;
  };

  const cursor = props.thinking ? 'wait' : hover >= 0 && props.canDrop(hover) ? 'crosshair' : 'default';
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale, cursor }}
        aria-label="Checker Connector board"
        onPointerMove={(e) => setHover(columnAt(e))}
        onPointerLeave={() => setHover(-1)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const column = columnAt(e);
          if (column >= 0) props.onColumn(column);
        }}
      />
    </div>
  );
}
