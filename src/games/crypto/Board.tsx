import { useEffect, useRef } from 'react';
import background from '../../assets/crypto/background.png';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { CELL_HEIGHT, CELL_WIDTH, cellAt, type Cell, type State } from './logic.ts';

/** The original window's client area (crypto.exe's window resource and its picture): 640×300. */
export const WIDTH = 640;
export const HEIGHT = 300;

const BLUE = '#000080';
const LIGHT_RED = '#ff0000';
const YELLOW = '#ffff00';

/**
 * One box (`FUN_004029b0`): the guess in a yellow half above, the coded letter in a white half
 * below; blue, red when selected, black when fixed (punctuation, hints), which also hides the
 * coded letter (the picture shows through).
 */
function drawCell(ctx: CanvasRenderingContext2D, cell: Cell) {
  const mid = cell.y + Math.trunc(CELL_HEIGHT / 2);
  const half = (top: number, bottom: number, fill: string, text: string, color: string) => {
    // StarView rectangles include their right and bottom edges.
    ctx.fillStyle = fill;
    ctx.fillRect(cell.x, top, CELL_WIDTH + 1, bottom - top + 1);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(cell.x + 0.5, top + 0.5, CELL_WIDTH, bottom - top);
    if (text.trim()) {
      ctx.fillStyle = color;
      ctx.fillText(text, cell.x + (CELL_WIDTH + 1) / 2, (top + bottom + 1) / 2);
    }
  };
  const color = cell.fixed ? '#000000' : cell.selected ? LIGHT_RED : BLUE;
  half(cell.y, mid, YELLOW, cell.guess, color);
  if (!cell.fixed) half(mid, cell.y + CELL_HEIGHT, '#ffffff', cell.code, color);
}

/** The play field: the picture, the boxes; a press selects a box. */
export function Board(props: { state: State; onSelect: (i: number) => void }) {
  const { state } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const picture = useImage(background);
  const scale = useFitScale(box, WIDTH, HEIGHT, 120);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !picture) return;
    ctx.drawImage(picture, 0, 0);
    ctx.font = '20px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const cell of state.cells) if (cell.code) drawCell(ctx, cell);
  }, [state, picture]);

  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Cryptogram"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) * WIDTH) / rect.width;
          const y = ((e.clientY - rect.top) * HEIGHT) / rect.height;
          // A finger gets some slop around the small boxes.
          props.onSelect(cellAt(state, x, y, e.pointerType === 'touch' ? 12 : 0));
        }}
      />
    </div>
  );
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Letters for touch screens (shown on coarse pointers): the guesses typed on a keyboard. */
export function LetterPad(props: { onKey: (key: string) => void; disabled: boolean }) {
  return (
    <div className="letter-pad" aria-label="Letters">
      {ROWS.map((row, r) => (
        <div key={row} className="row">
          {[...row].map((k) => (
            <button key={k} type="button" disabled={props.disabled} onClick={() => props.onKey(k)}>
              {k}
            </button>
          ))}
          {r === 2 && (
            <button type="button" className="clear" disabled={props.disabled} onClick={() => props.onKey(' ')}>
              Clear
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
