import { useEffect, useMemo, useRef } from 'react';
import holderCross from '../../assets/vcross/holder-cross.png';
import holderFoundation from '../../assets/vcross/holder-foundation.png';
import holderStock from '../../assets/vcross/holder-stock.png';
import { useFitScale, useImages } from '../../shell/canvas.ts';
import { CARD_H, CARD_W, cardName } from '../../shell/cards/cards.ts';
import {
  drawDragFeedback,
  inside,
  useCardDrag,
  type DragOptions,
  type Rect,
  type Zone,
} from '../../shell/cards/drag.ts';
import { drawBack, drawCard, useCardArt, type CardLook } from '../../shell/cards/draw.ts';
import { useBackground } from '../../shell/cards/table.ts';
import { beep } from '../../shell/sound.ts';
import { canMove, caption, CROSS, isFoundation, STOCK, top, WASTE, type State } from './logic.ts';

/** The main window's client area (vcross.exe's window resource). */
export const WIDTH = 374;
export const HEIGHT = 354;

/** The piles' holders (FUN_004098fb): stock and waste on the right, the cross, the corners. */
const HOLDERS: [number, number][] = [
  [287, 65],
  [287, 183],
  [6, 6],
  [192, 6],
  [6, 242],
  [192, 242],
  [99, 6],
  [6, 124],
  [99, 124],
  [192, 124],
  [99, 242],
];
const HOLDER: Rect = { x: 0, y: 0, w: 81, h: 106 };

const cardAt = (pile: number) => ({ x: HOLDERS[pile]![0] + 5, y: HOLDERS[pile]![1] + 5 });
const cardRect = (pile: number): Rect => ({ ...cardAt(pile), w: CARD_W, h: CARD_H });
/** The area a click on a pile's top card counts in (the holder's size, from the card). */
const clickRect = (pile: number): Rect => ({ ...cardAt(pile), w: HOLDER.w, h: HOLDER.h });

/** The caption's two lines (FUN_0040adc9): bold Arial, yellow outlined in dark red. */
function drawCaption(ctx: CanvasRenderingContext2D, lines: [string, string]) {
  ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    const x = 273 + 101 / 2;
    const y = 12 + i * 18 + 9;
    ctx.fillStyle = '#800000';
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const) {
      ctx.fillText(line, x + dx, y + dy);
    }
    ctx.fillStyle = '#ffff00';
    ctx.fillText(line, x, y);
  });
  ctx.textAlign = 'start';
}

export function Board(props: {
  state: State;
  look: CardLook;
  drag: DragOptions;
  background: number;
  onStock: () => void;
  onDragStart: () => void;
  onMove: (from: number, to: number) => void;
  onDoubleClick: (pile: number) => boolean;
}) {
  const { state, look } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const art = useCardArt(look.face);
  const holders = useImages([holderStock, holderFoundation, holderCross]);
  const paintBackground = useBackground(props.background);

  // FUN_0040b358: the waste's and the cross's top cards can be dragged.
  const dragZones = useMemo<Zone<number>[]>(
    () =>
      state.playing
        ? [WASTE, ...CROSS].filter((p) => state.piles[p]!.length > 0).map((p) => ({ id: p, rect: cardRect(p) }))
        : [],
    [state],
  );
  const dropZonesFor = (from: number): Zone<number>[] =>
    state.piles.flatMap((_, to) => (canMove(state, from, to) ? [{ id: to, rect: cardRect(to) }] : []));

  const dragging = useCardDrag<number, number>({
    canvas,
    dragZones,
    dropZones: dropZonesFor,
    onPress: (x, y) => {
      // FUN_0040a682: nothing moves once the game is won; a click on the stock deals a card.
      if (!state.playing) {
        beep();
        return true;
      }
      if (state.piles[STOCK]!.length > 0 && inside(clickRect(STOCK), x, y)) {
        props.onStock();
        return true;
      }
      return false;
    },
    onDoublePress: (x, y) => {
      const pile = [WASTE, ...CROSS].find((p) => state.piles[p]!.length > 0 && inside(clickRect(p), x, y));
      return pile !== undefined && props.onDoubleClick(pile);
    },
    onMiss: beep,
    onStart: props.onDragStart,
    onDrop: props.onMove,
  });
  const { drag } = dragging;
  const dropZones = drag ? dropZonesFor(drag.from) : [];

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !art || !holders || !paintBackground) return;
    ctx.imageSmoothingEnabled = false;
    paintBackground(ctx, WIDTH, HEIGHT);
    if (state.base !== null) drawCaption(ctx, caption(state.base));
    // Each pile shows its holder and its top card only; a dragged card shows the one under it.
    state.piles.forEach((pile, p) => {
      const [x, y] = HOLDERS[p]!;
      ctx.drawImage(holders[p <= WASTE ? 0 : isFoundation(p) ? 1 : 2]!, x, y);
      const dragged = drag?.from === p && props.drag.dragCards;
      const card = pile[pile.length - (dragged ? 2 : 1)];
      if (!card) return;
      const at = cardAt(p);
      if (p === STOCK) drawBack(ctx, art, look.back, at.x, at.y);
      else drawCard(ctx, art, card, at.x, at.y);
    });
    if (drag && props.drag.dragCards) {
      const card = top(state, drag.from);
      if (card) drawCard(ctx, art, card, drag.x, drag.y);
    }
    drawDragFeedback(ctx, dragging, props.drag, { drag: dragZones, drop: dropZones });
  });

  const tops = [WASTE, ...CROSS]
    .map((p) => top(state, p))
    .filter((c) => c)
    .map((c) => cardName(c!));
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label={`Play field. Cards that can be moved: ${tops.join(', ')}. Stock: ${state.piles[STOCK]!.length} cards`}
        {...dragging.handlers}
      />
    </div>
  );
}
