// The Board and Pieces tabs' previews, shared by the board games (Quinto, Pegopolis).
import { useEffect, useRef } from 'react';
import { useImage } from '../../shell/canvas.ts';
import { BOARD_IMAGE, drawSquare, PIECE_SETS, pieceSprites, SQUARE_SIZE } from './sets.ts';

/** Board Preview: two squares of each kind, chequered. */
export function BoardPreview({ set }: { set: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const boards = useImage(BOARD_IMAGE);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !boards) return;
    for (let i = 0; i < 4; i++) {
      const [x, y] = [i % 2, Math.floor(i / 2)];
      drawSquare(ctx, boards, set, (x + y) % 2 === 0 ? 0 : 1, x * SQUARE_SIZE, y * SQUARE_SIZE);
    }
  }, [boards, set]);
  return <canvas ref={canvas} width={80} height={80} className="preview" aria-label="Board preview" />;
}

/** Piece Preview (`FUN_00407230`): the two pieces of the set, crosswise. */
export function PiecePreview({ set }: { set: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sheet = useImage(PIECE_SETS[set]!.src);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sheet) return;
    const [first, second] = pieceSprites(sheet);
    ctx.clearRect(0, 0, 72, 72);
    ctx.drawImage(first, 0, 0);
    ctx.drawImage(second, 36, 0);
    ctx.drawImage(second, 0, 36);
    ctx.drawImage(first, 36, 36);
  }, [sheet]);
  return <canvas ref={canvas} width={72} height={72} className="preview" aria-label="Piece preview" />;
}
