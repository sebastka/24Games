// Dragging cards on a canvas, as the card games' window class does it (FUN_0040a0f6 on button
// down, FUN_00409d86 on move, FUN_0040a37c on button up in pokergrd.exe): the game declares
// "drag zones" (where a drag can start, e.g. the top card of a pile) and "drop zones" (where a
// dragged card can land); a press on a drag zone picks it up, the release over a drop zone drops
// it there, anywhere else puts it back. A press elsewhere beeps. With Options › Animation › Show
// Drag Zones, the drag zone under the pointer is outlined in inverted colours; with Show Drop
// Zones, the drop zone under a dragged card is inverted. Pointer events: works with a finger.
import { useLayoutEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Zone<Id> {
  id: Id;
  rect: Rect;
}

export const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

/** Options › Animation, common to the card games that drag cards. */
export interface DragOptions {
  /** Drag the card itself (true) or only its outline. */
  dragCards: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
}

export const DRAG_DEFAULTS: DragOptions = { dragCards: true, showDragZones: false, showDropZones: false };

export interface Drag<From, To> {
  from: From;
  /** The drag zone it started from. */
  zone: Rect;
  /** Top left corner of the dragged rectangle, in play field pixels. */
  x: number;
  y: number;
  /** The drop zone under the pointer. */
  over: To | null;
}

export interface CardDrag<From, To> {
  drag: Drag<From, To> | null;
  /** The drag zone under the pointer, when not dragging. */
  hover: From | null;
  handlers: {
    onPointerDown: (e: PointerEvent<HTMLCanvasElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLCanvasElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLCanvasElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLCanvasElement>) => void;
    onPointerLeave: () => void;
  };
}

/** The point of a pointer event in canvas pixels. */
export function canvasPoint(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }): [number, number] {
  const box = canvas.getBoundingClientRect();
  return [
    Math.floor(((e.clientX - box.left) * canvas.width) / box.width),
    Math.floor(((e.clientY - box.top) * canvas.height) / box.height),
  ];
}

export function useCardDrag<From, To>(props: {
  canvas: RefObject<HTMLCanvasElement | null>;
  dragZones: readonly Zone<From>[];
  /** Where the card dragged from `from` can be dropped. */
  dropZones: (from: From) => readonly Zone<To>[];
  /** A press, before any drag: return true when the game handled it (e.g. a click on a cell). */
  onPress?: (x: number, y: number) => boolean;
  /** The second press of a double-click (or double tap): return true when handled. */
  onDoublePress?: (x: number, y: number) => boolean;
  /** A press outside every drag zone and not handled by onPress (the original beeps). */
  onMiss?: () => void;
  onStart?: (from: From) => void;
  onDrop: (from: From, to: To) => void;
  onCancel?: (from: From) => void;
}): CardDrag<From, To> {
  const [drag, setDrag] = useState<Drag<From, To> | null>(null);
  const [hover, setHover] = useState<From | null>(null);
  const offset = useRef({ dx: 0, dy: 0 });
  const lastPress = useRef({ t: -1e9, x: 0, y: 0 });
  // The handlers see the latest zones and callbacks, and the drag as they last set it.
  const live = useRef(props);
  useLayoutEffect(() => {
    live.current = props;
  });
  const dragRef = useRef<Drag<From, To> | null>(null);
  const update = (next: Drag<From, To> | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const point = (e: PointerEvent<HTMLCanvasElement>) => canvasPoint(e.currentTarget, e);
  const dropAt = (from: From, x: number, y: number): To | null =>
    live.current.dropZones(from).find((z) => inside(z.rect, x, y))?.id ?? null;

  return {
    drag,
    hover,
    handlers: {
      onPointerDown(e) {
        if (e.button !== 0 || dragRef.current) return;
        const [x, y] = point(e);
        const p = live.current;
        // Windows' double-click: a second press within half a second, a few pixels away at most.
        const last = lastPress.current;
        const double = e.timeStamp - last.t < 500 && Math.abs(x - last.x) <= 4 && Math.abs(y - last.y) <= 4;
        lastPress.current = double ? { t: -1e9, x, y } : { t: e.timeStamp, x, y };
        if (double && p.onDoublePress?.(x, y)) return;
        if (p.onPress?.(x, y)) return;
        const zone = p.dragZones.find((z) => inside(z.rect, x, y));
        if (!zone) {
          p.onMiss?.();
          return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        offset.current = { dx: x - zone.rect.x, dy: y - zone.rect.y };
        setHover(null);
        update({ from: zone.id, zone: zone.rect, x: zone.rect.x, y: zone.rect.y, over: null });
        p.onStart?.(zone.id);
      },
      onPointerMove(e) {
        const [x, y] = point(e);
        const current = dragRef.current;
        if (!current) {
          setHover(live.current.dragZones.find((z) => inside(z.rect, x, y))?.id ?? null);
          return;
        }
        update({ ...current, x: x - offset.current.dx, y: y - offset.current.dy, over: dropAt(current.from, x, y) });
      },
      onPointerUp(e) {
        const current = dragRef.current;
        if (!current) return;
        const [x, y] = point(e);
        update(null);
        const to = dropAt(current.from, x, y);
        if (to !== null) live.current.onDrop(current.from, to);
        else live.current.onCancel?.(current.from);
      },
      onPointerCancel() {
        const current = dragRef.current;
        if (!current) return;
        update(null);
        live.current.onCancel?.(current.from);
      },
      onPointerLeave() {
        setHover(null);
      },
    },
  };
}

/** Inverts the colours of `r` (the original's XOR rectangles). */
export function invertRect(ctx: CanvasRenderingContext2D, r: Rect): void {
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** Inverts a `width` pixel wide outline along the inside of `r`. */
export function invertOutline(ctx: CanvasRenderingContext2D, r: Rect, width = 3): void {
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.rect(r.x + width, r.y + width, r.w - 2 * width, r.h - 2 * width);
  ctx.fill('evenodd');
  ctx.restore();
}

/**
 * What the drag options add over the play field: the outline of the dragged card (Drag
 * Outlines), the hovered drag zone, the drop zone under the drag.
 */
export function drawDragFeedback<From, To>(
  ctx: CanvasRenderingContext2D,
  state: CardDrag<From, To>,
  options: DragOptions,
  zones: { drag: readonly Zone<From>[]; drop: readonly Zone<To>[] },
): void {
  const { drag, hover } = state;
  if (!drag && hover !== null && options.showDragZones) {
    const zone = zones.drag.find((z) => z.id === hover);
    if (zone) invertOutline(ctx, zone.rect);
  }
  if (drag && drag.over !== null && options.showDropZones) {
    const zone = zones.drop.find((z) => z.id === drag.over);
    if (zone) invertRect(ctx, zone.rect);
  }
  if (drag && !options.dragCards) invertOutline(ctx, { ...drag.zone, x: drag.x, y: drag.y });
}
