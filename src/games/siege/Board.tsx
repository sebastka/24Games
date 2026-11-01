import { useEffect, useMemo, useRef } from 'react';
import holderFoundation from '../../assets/siege/holder-foundation.png';
import holderLeft from '../../assets/siege/holder-left.png';
import holderRight from '../../assets/siege/holder-right.png';
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
import { drawCard, useCardArt, type CardLook } from '../../shell/cards/draw.ts';
import { useBackground } from '../../shell/cards/table.ts';
import { beep } from '../../shell/sound.ts';
import { canMove, isFoundation, rowOf, top, WINGS, type State } from './logic.ts';

/** The main window's client area (siege.exe's window resource). */
export const WIDTH = 620;
export const HEIGHT = 430;

/** A pile's card holder (cardhld*.bmp) and where its cards go, 13 pixels apart in the wings. */
const HOLDER_W = 81;
const HOLDER_H = 106;
const SPREAD = 13;

/** The holders' top left corners (measured on the original's 620×430 window). */
function holder(pile: number): { x: number; y: number } {
  const x = isFoundation(pile) ? 270 : pile < 8 ? 171 : 362;
  return { x, y: 1 + rowOf(pile) * (HOLDER_H + 1) };
}

/** Where card `i` of a pile goes: the left wing spreads leftwards, the right wing rightwards. */
function cardAt(pile: number, i: number): { x: number; y: number } {
  const { x, y } = holder(pile);
  const step = isFoundation(pile) ? 0 : pile < 8 ? -SPREAD : SPREAD;
  return { x: x + 5 + i * step, y: y + 5 };
}

/** FUN_0040b71f: a pile's area, its holder widened by its spread cards. */
function pileRect(state: State, pile: number): Rect {
  const { x, y } = holder(pile);
  const spread = isFoundation(pile) ? 0 : state.piles[pile]!.length * SPREAD;
  return { x: pile >= 4 && pile < 8 ? x - spread : x, y, w: HOLDER_W + spread, h: HOLDER_H };
}

export function Board(props: {
  state: State;
  look: CardLook;
  drag: DragOptions;
  background: number;
  onDragStart: () => void;
  onMove: (from: number, to: number) => void;
  onDoubleClick: (pile: number) => boolean;
}) {
  const { state } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const art = useCardArt(props.look.face);
  const holders = useImages([holderFoundation, holderLeft, holderRight]);
  const paintBackground = useBackground(props.background);

  // FUN_0040a875: the top card of each wing pile can be dragged.
  const dragZones = useMemo<Zone<number>[]>(
    () =>
      state.playing
        ? WINGS.filter((p) => state.piles[p]!.length > 0).map((p) => {
            const { x, y } = cardAt(p, state.piles[p]!.length - 1);
            return { id: p, rect: { x, y, w: CARD_W, h: CARD_H } };
          })
        : [],
    [state],
  );

  const dropZonesFor = (from: number): Zone<number>[] =>
    state.piles.flatMap((_, to) => (canMove(state, from, to) ? [{ id: to, rect: pileRect(state, to) }] : []));

  const dragging = useCardDrag<number, number>({
    canvas,
    dragZones,
    dropZones: dropZonesFor,
    onPress: () => {
      // FUN_0040a2ad: nothing moves once the game is won or claimed.
      if (state.playing) return false;
      beep();
      return true;
    },
    onDoublePress: (x, y) => {
      const pile = WINGS.find((p) => state.piles[p]!.length > 0 && inside(pileRect(state, p), x, y));
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
    state.piles.forEach((pile, p) => {
      const { x, y } = holder(p);
      ctx.drawImage(holders[isFoundation(p) ? 0 : p < 8 ? 1 : 2]!, x, y);
      pile.forEach((card, i) => {
        if (i === pile.length - 1 && drag?.from === p && props.drag.dragCards) return;
        const at = cardAt(p, i);
        drawCard(ctx, art, card, at.x, at.y);
      });
    });
    if (drag && props.drag.dragCards) {
      const card = top(state, drag.from);
      if (card) drawCard(ctx, art, card, drag.x, drag.y);
    }
    drawDragFeedback(ctx, dragging, props.drag, { drag: dragZones, drop: dropZones });
  });

  const tops = WINGS.map((p) => top(state, p))
    .filter((c) => c)
    .map((c) => cardName(c!));
  return (
    <div className="board" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label={`Play field. Cards that can be moved: ${tops.join(', ')}`}
        {...dragging.handlers}
      />
    </div>
  );
}
