// Where things are in the game window (512×322 client area), from sechseck.exe.

export const WIDTH = 512;
export const HEIGHT = 322;

/** A cell is a 42×48 hexagon with 12-pixel slanted edges; rows overlap by 12 (FUN_00408f60). */
export const HEX_W = 42;
export const HEX_H = 48;
export const HEX_SLANT = 12;

/** Top left of the board per size (FUN_0040a100). */
const ORIGIN: Record<number, { x: number; y: number }> = {
  4: { x: 90, y: 80 },
  6: { x: 50, y: 40 },
  8: { x: 11, y: 11 },
};

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The bounding box of cell (col, row): odd rows shifted right by half a cell. */
export function cellRect(size: number, col: number, row: number): Rect {
  const o = ORIGIN[size] ?? ORIGIN[6]!;
  const left = o.x + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
  const top = o.y + row * (HEX_H - HEX_SLANT);
  return { left, top, right: left + HEX_W - 1, bottom: top + HEX_H - 1 };
}

/** The hexagon's corners (FUN_00408e90), clockwise from the left of the top edge. */
export function hexagon(r: Rect): [number, number][] {
  const mid = r.left + Math.trunc((r.right - r.left) / 2);
  return [
    [r.left, r.top + HEX_SLANT],
    [mid, r.top],
    [r.right, r.top + HEX_SLANT],
    [r.right, r.bottom - HEX_SLANT],
    [mid, r.bottom],
    [r.left, r.bottom - HEX_SLANT],
  ];
}

/**
 * Where a piece can be dropped on a cell (FUN_0040a490): two rectangles approximating the
 * hexagon, a wide one and a tall one.
 */
export function dropZones(r: Rect): Rect[] {
  return [
    { left: r.left, top: r.top + 10, right: r.right, bottom: r.bottom - 10 },
    { left: r.left + 11, top: r.top + 4, right: r.right - 11, bottom: r.bottom - 4 },
  ];
}

/** The four pieces offered, staggered in the right-hand box (FUN_004095e0). */
export const SLOT_POSITIONS: readonly { x: number; y: number }[] = [
  { x: 400, y: 157 },
  { x: 450, y: 188 },
  { x: 400, y: 219 },
  { x: 450, y: 250 },
];

/** A piece (piece.bmp) is 37×40. */
export const PIECE_W = 37;
export const PIECE_H = 40;

export const slotRect = (slot: number): Rect => {
  const p = SLOT_POSITIONS[slot]!;
  return { left: p.x, top: p.y, right: p.x + PIECE_W - 1, bottom: p.y + PIECE_H - 1 };
};

export const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

/**
 * The cell whose drop zone is under (x, y), if any (the last matching zone, as the original);
 * only the cells accepted by `free` have drop zones.
 */
export function cellAt(size: number, x: number, y: number, free: (cell: number) => boolean): number | null {
  let found: number | null = null;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = row * size + col;
      if (free(cell) && dropZones(cellRect(size, col, row)).some((z) => inside(z, x, y))) found = cell;
    }
  }
  return found;
}

/** The boxes of the right-hand side (FUN_0040b3e0): the time bar, the score, the pieces. */
export const TIME_BOX: Rect = { left: 378, top: 4, right: 510, bottom: 36 };
export const TIME_BAR: Rect = { left: 382, top: 8, right: 506, bottom: 32 };
export const SCORE_BOX: Rect = { left: 378, top: 40, right: 509, bottom: 119 };
export const SCORE_INNER: Rect = { left: 386, top: 48, right: 501, bottom: 111 };
export const SCORE_LABEL: Rect = { left: 390, top: 55, right: 498, bottom: 73 };
export const SCORE_VALUE: Rect = { left: 390, top: 76, right: 498, bottom: 104 };
export const PIECES_BOX: Rect = { left: 378, top: 125, right: 509, bottom: 317 };
export const PIECES_INNER: Rect = { left: 386, top: 133, right: 501, bottom: 309 };
