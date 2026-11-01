import { useEffect, useMemo, useRef, useState } from 'react';
import plus from '../../assets/match/plus.cur?url';
import arrow from '../../assets/quinto/arrow.png';
import logo from '../../assets/quinto/logo.png';
import { useFitScale, useImages } from '../../shell/canvas.ts';
import { origin, squareAt, type State } from './logic.ts';
import { BOARD_IMAGE, drawSquare, PIECE_SIZE, pieceSprites, SQUARE_SIZE } from './sets.ts';

/** The original window's client area (quinto.exe's window resource): 512×342. */
export const WIDTH = 512;
export const HEIGHT = 342;
const FACE = '#c0c0c0';
const LIGHT = '#ffffff';
const SHADOW = '#808080';
const PANEL = { x: 4, y: 4, right: 0x151, bottom: 0x151 };
const SIDE = 0x155;

/** A raised frame (`FUN_004036e0`): face colour, `width` pixels of light top-left, shadow bottom-right. */
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

/**
 * The window (`FUN_00409370`): the board in a raised panel, on the right the legend (the piece
 * to change, an arrow, what it changes to), the moves, the logo; the window background around.
 */
export function Board(props: {
  state: State;
  pieceSet: string;
  boardSet: number;
  onClick: (x: number, y: number) => void;
}) {
  const { state, boardSet } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const images = useImages([props.pieceSet, BOARD_IMAGE, arrow, logo]);
  const sprites = useMemo(() => (images ? pieceSprites(images[0]!) : null), [images]);
  const scale = useFitScale(box, WIDTH, HEIGHT, 60);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images || !sprites) return;
    const [, boards, arrowImage, logoImage] = images as HTMLImageElement[];
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    frame(ctx, PANEL.x, PANEL.y, PANEL.right, PANEL.bottom, 4);
    const o = origin(state);
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const [sx, sy] = [o.x + x * SQUARE_SIZE, o.y + y * SQUARE_SIZE];
        // Squares with an even x + y are the set's first square.
        drawSquare(ctx, boards!, boardSet, (x + y) % 2 === 0 ? 0 : 1, sx, sy);
        // A piece still to change shows the set's second piece.
        ctx.drawImage(sprites[state.pieces[y * state.width + x] ? 1 : 0], sx + 4, sy + 4);
      }
    }
    // The legend: three 32-pixel pictures spread evenly in the top box.
    frame(ctx, SIDE, 4, WIDTH - 4, 0x2c, 2);
    const gap = (WIDTH - 4 - SIDE + 1 - 3 * PIECE_SIZE) / 4;
    const top = (4 + 0x2c + 1) / 2 - PIECE_SIZE / 2;
    ctx.drawImage(sprites[1], Math.round(SIDE + gap), Math.floor(top));
    ctx.drawImage(arrowImage!, Math.round(SIDE + 2 * gap + PIECE_SIZE), Math.floor(top));
    ctx.drawImage(sprites[0], Math.round(SIDE + 3 * gap + 2 * PIECE_SIZE), Math.floor(top));
    // The moves (FUN_00409280).
    frame(ctx, SIDE, 0x30, WIDTH - 4, 0x58, 2);
    ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000080';
    ctx.fillText(`Moves : ${state.moves}`, (SIDE + WIDTH - 4) / 2, (0x30 + 0x58 + 1) / 2);
    // The logo, centred below, on the window background.
    const area = { x: SIDE, y: 0x5c, w: WIDTH - 4 - SIDE + 1, h: HEIGHT - 4 - 0x5c + 1 };
    ctx.drawImage(
      logoImage!,
      area.x + Math.trunc(area.w / 2 - logoImage!.width / 2),
      area.y + Math.trunc(area.h / 2 - logoImage!.height / 2),
    );
  }, [state, images, sprites, boardSet]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return squareAt(
      state,
      ((e.clientX - rect.left) * WIDTH) / rect.width,
      ((e.clientY - rect.top) * HEIGHT) / rect.height,
    );
  };

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{
          width: WIDTH * scale,
          height: HEIGHT * scale,
          cursor: hover ? `url(${plus}) 15 15, pointer` : 'default',
        }}
        aria-label="Quinto board"
        onPointerMove={(e) => setHover(at(e) !== null)}
        onPointerLeave={() => setHover(false)}
        onPointerDown={(e) => {
          // Outside the board: (-1, -1) (the original beeps there too once the game is over).
          const square = at(e);
          props.onClick(square?.col ?? -1, square?.row ?? -1);
        }}
      />
    </div>
  );
}
