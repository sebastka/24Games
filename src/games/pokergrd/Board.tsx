import { useEffect, useMemo, useRef } from 'react';
import arrows from '../../assets/pokergrd/arrows.png';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { useBackground } from '../../shell/canvas.ts';
import { CARD_H, CARD_W, cardName, type Card } from '../../shell/cards/cards.ts';
import {
  drawDragFeedback,
  inside,
  useCardDrag,
  type DragOptions,
  type Rect,
  type Zone,
} from '../../shell/cards/drag.ts';
import { drawBack, drawCard, useCardArt, type CardLook } from '../../shell/cards/draw.ts';
import { beep } from '../../shell/sound.ts';
import { CELLS, isOver, SIZE, type State } from './logic.ts';

/** The main window's client area (pokergrd.exe's window resource). */
export const WIDTH = 400;
export const HEIGHT = 440;

/** FUN_0040654c: columns a fifth of the width apart, rows sharing the height left by the piles. */
const COLUMN = Math.max(CARD_W, Math.floor(WIDTH / SIZE));
const ROW = Math.max(0, Math.floor((HEIGHT - 207) / 4));
const cellAt = (cell: number) => ({
  x: (cell % SIZE) * COLUMN + Math.floor((COLUMN - CARD_W) / 2),
  y: 106 + Math.floor(cell / SIZE) * ROW,
});

/** The arrow between two piles (a static rectangle at 0x414028). */
const ARROW: Rect = { x: 188, y: 40, w: 25, h: 25 };
const PILE_Y = 5;
/** Spacing of the cards spread under a pile's top card. */
const SPREAD = 13;

/** FUN_004060a1: where the cards of each pile go, top card first. */
function pileOrigins(piles: number): { x: number; step: number }[] {
  if (piles === 1) return [{ x: WIDTH - 76, step: -SPREAD }];
  return [
    { x: Math.floor(WIDTH / 2) - 85, step: -SPREAD },
    { x: Math.floor(WIDTH / 2) + 14, step: SPREAD },
  ];
}

const cardRect = (x: number, y: number): Rect => ({ x, y, w: CARD_W, h: CARD_H });

export function Board(props: {
  state: State;
  faceUp: boolean;
  look: CardLook;
  drag: DragOptions;
  background: number;
  onSelect: (pile: number) => void;
  onPlace: (pile: number, cell: number) => void;
  onDragStart: () => void;
  onDrop: (pile: number, cell: number) => void;
}) {
  const { state, faceUp, look } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const art = useCardArt(look.face);
  const arrow = useImage(arrows);
  const paintBackground = useBackground(props.background);
  const over = isOver(state);
  const origins = useMemo(() => pileOrigins(state.piles.length), [state.piles.length]);

  const dragZones = useMemo<Zone<number>[]>(
    () =>
      over
        ? []
        : state.piles.flatMap((p, i) => (p.length > 0 ? [{ id: i, rect: cardRect(origins[i]!.x, PILE_Y) }] : [])),
    [over, state.piles, origins],
  );
  // A cell takes a card where it shows: down to the next row's top, the whole card on the last row.
  const dropZones = useMemo<Zone<number>[]>(
    () =>
      state.grid.flatMap((card, cell) => {
        if (card) return [];
        const { x, y } = cellAt(cell);
        return [{ id: cell, rect: { x, y, w: CARD_W, h: cell >= CELLS - SIZE ? CARD_H : ROW } }];
      }),
    [state.grid],
  );

  const dragging = useCardDrag<number, number>({
    canvas,
    dragZones,
    dropZones: () => dropZones,
    onPress: (x, y) => {
      // FUN_0040540f: the arrow switches piles; a click on an empty cell fills it, on a full
      // one beeps (the lowest row first: its cards are drawn over the row above).
      if (state.piles.length === 2 && inside(ARROW, x, y)) {
        props.onSelect(1 - state.selected);
        return true;
      }
      for (let cell = CELLS - 1; cell >= 0; cell--) {
        const { x: cx, y: cy } = cellAt(cell);
        if (!inside(cardRect(cx, cy), x, y)) continue;
        if (state.grid[cell] || over) beep();
        else props.onPlace(state.selected, cell);
        return true;
      }
      return false;
    },
    onMiss: beep,
    onStart: (pile) => {
      props.onSelect(pile);
      props.onDragStart();
    },
    onDrop: props.onDrop,
  });
  const { drag } = dragging;

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !art || !arrow || !paintBackground) return;
    ctx.imageSmoothingEnabled = false;
    paintBackground(ctx, WIDTH, HEIGHT);

    // The piles, their bottom card first; a dragged card is not on its pile any more.
    state.piles.forEach((pile, i) => {
      const { x, step } = origins[i]!;
      for (let j = pile.length - 1; j >= 0; j--) {
        if (j === 0 && drag?.from === i && props.drag.dragCards) continue;
        if (j === 0 || faceUp) drawCard(ctx, art, pile[j]!, x + j * step, PILE_Y);
        else drawBack(ctx, art, look.back, x + j * step, PILE_Y);
      }
    });
    if (state.piles.length === 2) {
      ctx.drawImage(arrow, state.selected === 0 ? 24 : 0, 0, 24, 24, ARROW.x, ARROW.y, 24, 24);
    }

    // FUN_00406252: an empty cell is a grey rounded rectangle with its letter.
    ctx.font = 'bold 11px Arial, Helvetica, sans-serif';
    ctx.textBaseline = 'alphabetic';
    for (let col = 0; col < SIZE; col++) {
      for (let row = 0; row < SIZE; row++) {
        const cell = row * SIZE + col;
        const { x, y } = cellAt(cell);
        const card = state.grid[cell];
        if (card) {
          drawCard(ctx, art, card, x, y);
          continue;
        }
        ctx.fillStyle = '#c0c0c0';
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, CARD_W - 3, CARD_H - 3, 3);
        ctx.fill();
        ctx.stroke();
        const letter = String.fromCharCode(65 + cell);
        ctx.fillStyle = '#000000';
        ctx.fillText(letter, x + Math.floor((CARD_W - ctx.measureText(letter).width) / 2), y + 15);
      }
    }

    if (drag && props.drag.dragCards) {
      const card = state.piles[drag.from]?.[0];
      if (card) drawCard(ctx, art, card, drag.x, drag.y);
    }
    drawDragFeedback(ctx, dragging, props.drag, { drag: dragZones, drop: dropZones });
  });

  const top = state.piles.map((p) => p[0]).filter((c): c is Card => !!c);
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label={`Play field. Cards to place: ${top.map(cardName).join(', ')}`}
        {...dragging.handlers}
      />
    </div>
  );
}
