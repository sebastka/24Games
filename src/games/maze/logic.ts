// Rules of MazeRace, as the original maze.exe implements them (see docs/games/maze.md for the
// functions this follows). Pure and immutable: every action returns a new state.
//
// The maze is `width` × `height` cells; each cell (x, y) holds the wall on its top and the wall
// on its left, so that the cells of column `width` and row `height` hold the right and bottom
// borders. Hector (the white mouse, player 1) starts top left, Nestor (the brown mouse, player
// 2 or the computer) top right; the cheese is on the bottom row.

/** Cell bits (a byte per cell, `0x144 + x × 51 + y` in the window object). */
export const Bit = {
  Top: 0x01,
  Left: 0x02,
  /** The way to the cheese: 0 up, 1 down, 2 left, 3 right, in bits 2-3. */
  Way: 0x0c,
  Visible: 0x10,
  Cheese: 0x20,
  /** A white dot: it throws the mouse that steps on it. */
  PlayerThrower: 0x40,
  /** A black dot: it throws the other mouse. */
  OpponentThrower: 0x80,
} as const;

export type Direction = 'up' | 'down' | 'left' | 'right';
const WAYS: Direction[] = ['up', 'down', 'left', 'right'];

/** Walls of Options: all visible, some (the middle half hidden), none. */
export const Visibility = { All: 0, Some: 1, None: 2 } as const;

export interface Mouse {
  x: number;
  y: number;
  /** Facing left (pieces 1, 3) or right (pieces 2, 4). */
  left: boolean;
}

export interface Options {
  width: number;
  height: number;
  visibility: number;
  playerThrowers: boolean;
  opponentThrowers: boolean;
}

export interface State extends Options {
  /** (width + 1) × (height + 1) cells, index x × (height + 1) + y. */
  cells: readonly number[];
  /** Hector (0) and Nestor (1). */
  mice: readonly [Mouse, Mouse];
  /** Wins of each mouse since the options were last changed. */
  wins: readonly [number, number];
  /** A race is on (otherwise "Press F2 to begin the game"). */
  active: boolean;
}

export type Sound =
  'Begin New Game' | 'White Mouse Thrown' | 'Brown Mouse Thrown' | 'White Mouse Win' | 'Brown Mouse Win';

/** A random number in [0, 1); `rand() % n` of the original is `Math.floor(random() * n)`. */
export type Random = () => number;
const below = (random: Random, n: number): number => Math.floor(random() * n);

export const at = (s: { height: number }, x: number, y: number): number => x * (s.height + 1) + y;
const cell = (s: State, x: number, y: number): number => s.cells[at(s, x, y)] ?? 0;

/** Whether a mouse at (x, y) can go that way (FUN_0040ab60). */
export function canGo(s: State, x: number, y: number, d: Direction): boolean {
  if (d === 'up') return (cell(s, x, y) & Bit.Top) === 0;
  if (d === 'down') return (cell(s, x, y + 1) & Bit.Top) === 0;
  if (d === 'left') return (cell(s, x, y) & Bit.Left) === 0;
  return (cell(s, x + 1, y) & Bit.Left) === 0;
}

/**
 * A perfect maze (FUN_0040a4a0): every wall up; a random first cell; then, as many times as
 * there are other cells, a random cell not yet in the maze but next to it is joined to it by a
 * random wall (FUN_0040a700: up, down or left as drawn if possible, else the right
 * neighbour if possible, else another draw).
 */
export function carve(width: number, height: number, random: Random): number[] {
  const s = { height };
  const cells = Array<number>((width + 1) * (height + 1)).fill(Bit.Top | Bit.Left);
  const inMaze = (x: number, y: number) => (cells[at(s, x, y)]! & Bit.Visible) !== 0;
  const y0 = below(random, height);
  cells[at(s, below(random, width), y0)]! |= Bit.Visible;
  for (let n = width * height - 1; n > 0; n--) {
    let x: number;
    let y: number;
    for (;;) {
      y = below(random, height);
      x = below(random, width);
      if (inMaze(x, y)) continue;
      const touches =
        (y > 0 && inMaze(x, y - 1)) ||
        (y < height && inMaze(x, y + 1)) ||
        (x > 0 && inMaze(x - 1, y)) ||
        (x < width && inMaze(x + 1, y));
      if (touches) break;
    }
    for (;;) {
      const r = below(random, 4);
      if (r === 0 && y > 0 && inMaze(x, y - 1)) {
        cells[at(s, x, y)]! &= ~Bit.Top;
        break;
      }
      if (r === 1 && y < height && inMaze(x, y + 1)) {
        cells[at(s, x, y + 1)]! &= ~Bit.Top;
        break;
      }
      if (r === 2 && x > 0 && inMaze(x - 1, y)) {
        cells[at(s, x, y)]! &= ~Bit.Left;
        break;
      }
      // Whatever was drawn, the right neighbour is tried last.
      if (x < width && inMaze(x + 1, y)) {
        cells[at(s, x + 1, y)]! &= ~Bit.Left;
        break;
      }
    }
    cells[at(s, x, y)]! |= Bit.Visible;
  }
  return cells.map((c) => c & ~Bit.Visible);
}

/**
 * The way to the cheese from every cell (FUN_0040ac10, which peels the maze's dead ends until
 * only the cheese is left: in a perfect maze, each cell's way leads to the cheese).
 */
function ways(s: State, cheese: { x: number; y: number }): number[] {
  const cells = [...s.cells];
  const seen = new Set([at(s, cheese.x, cheese.y)]);
  const queue = [cheese];
  const step: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const opposite: Record<Direction, number> = { up: 1, down: 0, left: 3, right: 2 };
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const d of WAYS) {
      if (!canGo(s, x, y, d)) continue;
      const [dx, dy] = step[d];
      const n = { x: x + dx, y: y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= s.width || n.y >= s.height || seen.has(at(s, n.x, n.y))) continue;
      seen.add(at(s, n.x, n.y));
      // From the neighbour, the way back here.
      cells[at(s, n.x, n.y)] = (cells[at(s, n.x, n.y)]! & ~Bit.Way) | (opposite[d] << 2);
      queue.push(n);
    }
  }
  return cells;
}

/**
 * A new maze (FUN_00402640): walls, visibility, (width + height) / 4 throwers of each colour
 * on random cells off the bottom row, the cheese on the bottom row, the mice in the top corners.
 */
export function newMaze(o: Options, wins: readonly [number, number], random: Random): State {
  const { width, height } = o;
  let cells = carve(width, height, random);
  const s0 = { height };
  for (let x = 0; x <= width; x++) {
    for (let y = 0; y <= height; y++) {
      const hidden =
        o.visibility === Visibility.None ||
        (o.visibility === Visibility.Some &&
          x >= width >> 2 &&
          x <= (width * 3) >> 2 &&
          y >= height >> 2 &&
          y <= (height * 3) >> 2);
      if (!hidden) cells[at(s0, x, y)]! |= Bit.Visible;
    }
  }
  const spot = () => {
    const y = below(random, height - 1);
    return at(s0, below(random, width), y);
  };
  for (let n = Math.trunc((width + height) / 4); n > 0; n--) {
    let i = spot();
    cells[i] = (cells[i]! & ~Bit.OpponentThrower) | Bit.PlayerThrower;
    i = spot();
    cells[i] = (cells[i]! & ~Bit.PlayerThrower) | Bit.OpponentThrower;
  }
  const cheese = { x: below(random, width), y: height - 1 };
  const c = at(s0, cheese.x, cheese.y);
  cells[c] = (cells[c]! & ~(Bit.PlayerThrower | Bit.OpponentThrower)) | Bit.Cheese;
  const mice: [Mouse, Mouse] = [
    { x: 0, y: 0, left: false },
    { x: width - 1, y: 0, left: false },
  ];
  for (const m of mice) cells[at(s0, m.x, m.y)]! &= ~(Bit.PlayerThrower | Bit.OpponentThrower);
  const s: State = { ...o, cells, mice, wins, active: false };
  cells = ways(s, cheese);
  return { ...s, cells };
}

/** The way the computer's mouse goes from its cell (FUN_00401310). */
export const wayOf = (s: State, m: Mouse): Direction => WAYS[(cell(s, m.x, m.y) & Bit.Way) >> 2]!;

/** A mouse thrown to a random cell off the bottom row; that cell loses its throwers (FUN_00401370). */
function throwMouse(s: State, index: 0 | 1, random: Random): State {
  const y = below(random, s.height - 1);
  const x = below(random, s.width);
  const cells = [...s.cells];
  cells[at(s, x, y)]! &= ~(Bit.PlayerThrower | Bit.OpponentThrower);
  const mice = [...s.mice] as [Mouse, Mouse];
  mice[index] = { ...mice[index], x, y };
  return { ...s, cells, mice };
}

const clear = (s: State, m: Mouse, bit: number): State => {
  const cells = [...s.cells];
  cells[at(s, m.x, m.y)]! &= ~bit;
  return { ...s, cells };
};

export interface MoveResult {
  state: State;
  sounds: Sound[];
  /** The mouse that reached the cheese. */
  winner: 0 | 1 | null;
}

const STEP: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * A mouse moves one cell (FUN_00401610), then (FUN_00403900): the walls around both mice show;
 * mice on the same cell are both thrown; a mouse on the cheese wins; else a white dot throws the
 * mouse on it, a black dot the other one.
 */
export function move(s0: State, index: 0 | 1, d: Direction, random: Random): MoveResult {
  const none = { state: s0, sounds: [], winner: null };
  const m = s0.mice[index];
  if (!s0.active || !canGo(s0, m.x, m.y, d)) return none;
  const [dx, dy] = STEP[d];
  const mice = [...s0.mice] as [Mouse, Mouse];
  mice[index] = { x: m.x + dx, y: m.y + dy, left: d === 'left' ? true : d === 'right' ? false : m.left };
  let s: State = { ...s0, mice };
  const sounds: Sound[] = [];

  if (s.visibility !== Visibility.All) {
    const cells = [...s.cells];
    for (const mouse of s.mice) {
      for (let y = mouse.y - 1; y <= mouse.y + 1; y++) {
        for (let x = mouse.x - 1; x <= mouse.x + 1; x++) {
          if (x >= 0 && y >= 0 && x < s.width && y < s.height) cells[at(s, x, y)]! |= Bit.Visible;
        }
      }
    }
    s = { ...s, cells };
  }

  while (s.mice[0].x === s.mice[1].x && s.mice[0].y === s.mice[1].y) {
    sounds.push('Brown Mouse Thrown');
    s = throwMouse(throwMouse(s, 0, random), 1, random);
  }

  const [white, brown] = s.mice;
  const w = cell(s, white.x, white.y);
  const b = cell(s, brown.x, brown.y);
  const win = (winner: 0 | 1): MoveResult => {
    const wins = [...s.wins] as [number, number];
    wins[winner] += 1;
    sounds.push(winner === 0 ? 'White Mouse Win' : 'Brown Mouse Win');
    return { state: { ...s, wins, active: false }, sounds, winner };
  };
  if (w & Bit.Cheese) return win(0);
  if (b & Bit.Cheese) return win(1);
  if (w & Bit.PlayerThrower && s.playerThrowers) {
    sounds.push('White Mouse Thrown');
    s = throwMouse(clear(s, white, Bit.PlayerThrower), 0, random);
  } else if (b & Bit.PlayerThrower && s.playerThrowers) {
    sounds.push('Brown Mouse Thrown');
    s = throwMouse(clear(s, brown, Bit.PlayerThrower), 1, random);
  } else if (w & Bit.OpponentThrower && s.opponentThrowers) {
    sounds.push('Brown Mouse Thrown');
    s = throwMouse(clear(s, white, Bit.OpponentThrower), 1, random);
  } else if (b & Bit.OpponentThrower && s.opponentThrowers) {
    sounds.push('White Mouse Thrown');
    s = throwMouse(clear(s, brown, Bit.OpponentThrower), 0, random);
  }
  return { state: s, sounds, winner: null };
}

/** The computer's opponent timer, by skill 1 (slow) … 10 (fast), in ms (table at 0x411000). */
export const COMPUTER_MS = [1500, 1000, 800, 650, 500, 350, 200, 150, 100, 50];
