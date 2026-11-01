// The poker machine: one canvas for pokermat.exe's main window and its child windows (the pay
// table's columns, the cards and their Hold/Discard labels, the Deal button, the "Game Over"
// panel), at their resource positions.
import { useEffect, useRef } from 'react';
import { useFitScale } from '../../shell/canvas.ts';
import { useBackground } from '../../shell/canvas.ts';
import { CARD_H, CARD_W, cardName } from '../../shell/cards/cards.ts';
import { canvasPoint, inside, type Rect } from '../../shell/cards/drag.ts';
import { drawBack, drawCard, useCardArt, type CardLook } from '../../shell/cards/draw.ts';
import { HAND_NAMES } from '../../shell/cards/poker.ts';
import { buttonLabel, PAYTABLES, payout, type State } from './logic.ts';

/** The main window's client area (pokermat.exe's window resource 256). */
export const WIDTH = 600;
export const HEIGHT = 410;

const HANDS: Rect = { x: 110, y: 0, w: 190, h: 200 };
const column = (bet: number): Rect => ({ x: 300 + 60 * (bet - 1), y: 0, w: 60, h: 200 });
const cardAt = (i: number) => ({ x: 25 + 120 * i, y: 227 });
const label = (i: number): Rect => ({ x: 15 + 120 * i, y: 330, w: 90, h: 30 });
const DEAL: Rect = { x: 240, y: 370, w: 120, h: 32 };
const PANEL: Rect = { x: 150, y: 246, w: 300, h: 48 };

const ARIAL = 'Arial, Helvetica, sans-serif';

/** StarView's outlined font: the text in `outline` around, filled with `fill`. */
function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, outline: string) {
  ctx.fillStyle = outline;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) ctx.fillText(text, x + dx, y + dy);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Text centred in `r` (FUN_00409500). */
function centred(ctx: CanvasRenderingContext2D, text: string, r: Rect, draw: (x: number, y: number) => void) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  draw(r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textAlign = 'start';
}

/** A raised 3D frame (FUN_004075f0) inside a black line. */
function panel(ctx: CanvasRenderingContext2D, r: Rect, face: string) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.fillStyle = '#808080';
  ctx.fillRect(r.x + 2, r.y + 2, r.w - 3, r.h - 3);
  ctx.fillStyle = face;
  ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
}

/** The rows of a pay table column: the header, then one per paying hand. */
function rowRect(r: Rect, row: number, rows: number): Rect {
  const top = Math.floor((r.h * row) / rows);
  return { x: r.x, y: r.y + top, w: r.w, h: Math.floor((r.h * (row + 1)) / rows) - top };
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: State,
  art: NonNullable<ReturnType<typeof useCardArt>>,
  back: number,
) {
  const table = PAYTABLES[state.type]!;
  const rows = table.hands.length + 1;

  // Win and Balance (FUN_0040c8a0, FUN_0040c9c0).
  ctx.font = `bold 16px ${ARIAL}`;
  for (const [text, y] of [
    ['Win', 10],
    ['Balance', 100],
  ] as const) {
    centred(ctx, text, { x: 0, y, w: 109, h: 20 }, (x, cy) => outlined(ctx, text, x, cy, '#ffffff', '#000000'));
  }
  ctx.font = `bold 30px ${ARIAL}`;
  for (const [amount, y] of [
    [state.win, 30],
    [state.balance, 120],
  ] as const) {
    const text = `$${amount}`;
    centred(ctx, text, { x: 0, y, w: 109, h: 70 }, (x, cy) => outlined(ctx, text, x, cy, '#00ff00', '#000000'));
  }

  // The hands column (FUN_0040e0d0) and the five bet columns (FUN_0040d910, FUN_0040dac0).
  ctx.font = `bold 15px ${ARIAL}`;
  ctx.textBaseline = 'middle';
  const columns: [Rect, boolean][] = [
    [HANDS, false],
    ...[1, 2, 3, 4, 5].map((b) => [column(b), b === state.bet] as [Rect, boolean]),
  ];
  columns.forEach(([r, selected], c) => {
    ctx.fillStyle = selected ? '#ffff00' : '#ffffff';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(r.x, r.y, 1, r.h);
    for (let row = 0; row < rows; row++) {
      const cell = rowRect(r, row, rows);
      ctx.fillStyle = '#000000';
      if (row > 0) ctx.fillRect(r.x, cell.y - 1, r.w, 1);
      const hit = row > 0 && state.payline === row - 1;
      if (hit) ctx.fillRect(cell.x, cell.y, cell.w, cell.h - 1);
      const text =
        row === 0
          ? c === 0
            ? table.name
            : `Bet $${c}`
          : c === 0
            ? HAND_NAMES[table.hands[row - 1]!]!
            : String(payout(table, row - 1, c));
      ctx.fillStyle = hit ? '#ffffff' : row === 0 ? '#800000' : c === 0 ? '#000080' : '#000000';
      if (c === 0) ctx.fillText(text, cell.x + 4, cell.y + cell.h / 2);
      else centred(ctx, text, cell, (x, y) => ctx.fillText(text, x, y - 1));
    }
    ctx.fillStyle = '#000000';
    ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
  });
  ctx.fillRect(WIDTH - 1, 0, 1, 200);

  // "Click a payline to change your bet", between hands (FUN_0040c7f0).
  if (state.balance !== 0 && state.phase !== 'draw') {
    ctx.font = `bold 16px ${ARIAL}`;
    const text = 'Click a payline to change your bet';
    centred(ctx, text, { x: 300, y: 200, w: 300, h: 20 }, (x, y) => outlined(ctx, text, x, y, '#ffffff', '#000000'));
  }

  // The cards (face down before the first deal and while discarded), their labels (FUN_0040e710).
  for (let i = 0; i < 5; i++) {
    const { x, y } = cardAt(i);
    const card = state.hand[i];
    if (card && state.held[i]) drawCard(ctx, art, card, x, y);
    else drawBack(ctx, art, back, x, y);
    const r = label(i);
    panel(ctx, r, '#c0c0c0');
    if (state.phase !== 'new') {
      ctx.font = `bold 20px ${ARIAL}`;
      ctx.fillStyle = '#000080';
      const text = state.held[i] ? 'Hold' : 'Discard';
      centred(ctx, text, r, (cx, cy) => ctx.fillText(text, cx, cy));
    }
  }

  // The Deal button.
  panel(ctx, DEAL, '#c0c0c0');
  ctx.font = `bold 15px ${ARIAL}`;
  ctx.fillStyle = '#000000';
  centred(ctx, buttonLabel(state), DEAL, (x, y) => ctx.fillText(buttonLabel(state), x, y));

  // The panel between hands (FUN_0040e450): "Game Over", 'Press "Deal" for a new game'.
  if (state.phase !== 'draw') {
    panel(ctx, PANEL, '#c0c0c0');
    ctx.font = `bold 20px ${ARIAL}`;
    const lines = state.fresh ? ['Press "Deal" for a new game'] : ['Game Over', 'Press "Deal" for a new game'];
    lines.forEach((text, i) => {
      const r = { ...PANEL, y: PANEL.y + 2 + (i * (PANEL.h - 4)) / lines.length, h: (PANEL.h - 4) / lines.length };
      centred(ctx, text, r, (x, y) => {
        ctx.fillStyle = '#808080';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = '#000080';
        ctx.fillText(text, x, y);
      });
    });
  }
}

export function Machine(props: {
  state: State;
  look: CardLook;
  background: number;
  onDeal: () => void;
  onCard: (i: number) => void;
  onBet: (bet: number) => void;
}) {
  const { state, look } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const art = useCardArt(look.face);
  const paintBackground = useBackground(props.background);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !art || !paintBackground) return;
    ctx.imageSmoothingEnabled = false;
    paintBackground(ctx, WIDTH, HEIGHT);
    draw(ctx, state, art, look.back);
  });

  const press = (x: number, y: number) => {
    if (inside(DEAL, x, y)) return props.onDeal();
    for (let i = 0; i < 5; i++) {
      if (inside({ ...cardAt(i), w: CARD_W, h: CARD_H }, x, y) || inside(label(i), x, y)) return props.onCard(i);
    }
    for (let bet = 1; bet <= 5; bet++) if (inside(column(bet), x, y)) return props.onBet(bet);
  };

  const hand = state.phase === 'new' ? 'no cards dealt' : state.hand.map(cardName).join(', ');
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        tabIndex={0}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label={`Poker machine. Bet $${state.bet}, balance $${state.balance}, ${hand}. Enter deals.`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const [x, y] = canvasPoint(e.currentTarget, e);
          press(x, y);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          props.onDeal();
        }}
      />
    </div>
  );
}
