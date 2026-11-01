// Rules of Cheesy Pursuit, as the original cheesy.exe implements them (see docs/games/cheesy.md
// for the functions this follows). Pure and immutable: every action returns a new state.
//
// The mouse moves from cell to cell of a board of 40×40 cells, by key presses; the cats are
// 36×36 sprites that enter from the edges and cross the board in straight lines, moved by a
// 50 ms timer (`step`). Coordinates are pixels from the board's top-left corner.

export const CELL = 40;
export const CAT = 36;
/** The mouse sprite (32×32) is drawn 4 pixels inside its cell, and caught there. */
export const MOUSE = 32;
export const MOUSE_INSET = 4;
/** The cats' timer (StarView AutoTimer, `Timer::ChangeTimeout(0x32)`). */
export const TICK_MS = 50;
/** At most this many cats at once (and at most level + 1). */
export const MAX_CATS = 10;
/** An extra mouse every 20,000 points (the rules text says 10,000; the code adds 20,000). */
export const EXTRA_LIFE = 20000;

/** Board sizes of Options › Board Size: columns × rows. */
export const SIZES = [
  { cols: 5, rows: 3, label: '5 x 3' },
  { cols: 7, rows: 5, label: '7 x 5' },
  { cols: 9, rows: 7, label: '9 x 7' },
] as const;

/** What a cell holds (the index in cheese.png is the value - 1). */
export const Cheese = { None: 0, Cheddar: 1, Gouda: 2, Bomb: 3 } as const;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cat {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface State {
  cols: number;
  rows: number;
  level: number;
  /** Row-major cell contents (Cheese values). */
  cells: readonly number[];
  mouse: { x: number; y: number };
  /** The mouse looks left (0) or right (1). */
  facing: 0 | 1;
  cats: readonly Cat[];
  score: number;
  /** Points per cheddar slice: 2 × level + 8, raised by as much by each gouda. */
  cheeseValue: number;
  bombs: number;
  lives: number;
  /** Score of the next extra mouse. */
  nextLife: number;
  /** Speed of new cats, in pixels per tick. */
  catSpeed: number;
  /** The cats' timer runs: it starts at the mouse's first move of a level or life. */
  running: boolean;
  /** A game is in progress (false once all the mice are lost: keys do nothing). */
  active: boolean;
}

export type Sound =
  | 'Eat Cheese'
  | 'Eat Gouda'
  | 'Eat CheeseBomb'
  | 'Detonate CheeseBomb'
  | 'Out of CheeseBombs'
  | 'Cat Gets Mouse'
  | 'Level Complete'
  | 'Defeat';

/** A random number in [0, 1); `rand() % n` of the original is `Math.floor(random() * n)`. */
export type Random = () => number;
const below = (random: Random, n: number): number => Math.floor(random() * n);

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const rect = (x: number, y: number, w: number, h: number): Rect => ({
  left: x,
  top: y,
  right: x + w - 1,
  bottom: y + h - 1,
});
/** StarView's Rectangle::IsOver: the rectangles (inclusive bounds) share a pixel. */
const overlaps = (a: Rect, b: Rect): boolean =>
  a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
const catRect = (c: { x: number; y: number }): Rect => rect(c.x, c.y, CAT, CAT);
const cellRect = (x: number, y: number): Rect => rect(x * CELL, y * CELL, CELL, CELL);
export const mouseRect = (s: State): Rect =>
  rect(s.mouse.x * CELL + MOUSE_INSET, s.mouse.y * CELL + MOUSE_INSET, MOUSE, MOUSE);
const fieldRect = (s: State): Rect => rect(0, 0, s.cols * CELL, s.rows * CELL);
/** The opposite speed (without a negative zero). */
const back = (v: number): number => (v === 0 ? 0 : -v);

/** Whether a cell is on the board's edge: drawn with the left tile of the board bitmap. */
export const isEdge = (s: { cols: number; rows: number }, x: number, y: number): boolean =>
  y === 0 || y === s.rows - 1 || x === 0 || x === s.cols - 1;

/**
 * The next level (FUN_00402040): every cell a cheddar slice; four times, one chance in two of a
 * gouda on a random cell; one chance in two of a CheeseBomb on a random cell; the mouse in the
 * middle, its cell empty. The cats are gone and wait for the mouse's first move.
 */
export function nextLevel(s: State, random: Random): State {
  const level = s.level + 1;
  // From level 11, new cats are faster: level - 8 pixels per tick, at most 10.
  const catSpeed = level > 10 ? Math.min(10, level - 8) : s.catSpeed;
  const cells: number[] = Array<number>(s.cols * s.rows).fill(Cheese.Cheddar);
  const randomCell = () => {
    const y = below(random, s.rows);
    return y * s.cols + below(random, s.cols);
  };
  for (let i = 0; i < 4; i++) {
    if (below(random, 2) === 1) cells[randomCell()] = Cheese.Gouda;
  }
  if (below(random, 2) === 1) cells[randomCell()] = Cheese.Bomb;
  const mouse = { x: Math.floor(s.cols / 2), y: Math.floor(s.rows / 2) };
  cells[mouse.y * s.cols + mouse.x] = Cheese.None;
  return { ...s, level, catSpeed, cells, mouse, cats: [], cheeseValue: level * 2 + 8, running: false };
}

/** Game › New (FUN_00401c80): three mice, one CheeseBomb, level 1. */
export function newGame(size: number, random: Random): State {
  const { cols, rows } = SIZES[size] ?? SIZES[1];
  return nextLevel(
    {
      cols,
      rows,
      level: 0,
      cells: [],
      mouse: { x: 0, y: 0 },
      facing: 0,
      cats: [],
      score: 0,
      cheeseValue: 0,
      bombs: 1,
      lives: 3,
      nextLife: EXTRA_LIFE,
      catSpeed: 2,
      running: false,
      active: true,
    },
    random,
  );
}

const STEP: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export interface MoveResult {
  state: State;
  sounds: Sound[];
  /** The last cheddar slice is eaten: the level is complete. */
  complete: boolean;
}

/**
 * A key press moving the mouse (FUN_00403120): one cell, unless off the board or a cat is on
 * the cell. Left and right also turn the mouse. The mouse eats what is on its new cell; the
 * first move starts the cats' timer.
 */
export function move(s: State, direction: Direction): MoveResult {
  if (!s.active) return { state: s, sounds: [], complete: false };
  const [dx, dy] = STEP[direction];
  const facing = direction === 'left' ? 0 : direction === 'right' ? 1 : s.facing;
  const x = s.mouse.x + dx;
  const y = s.mouse.y + dy;
  const blocked =
    x < 0 || x >= s.cols || y < 0 || y >= s.rows || s.cats.some((c) => overlaps(catRect(c), cellRect(x, y)));
  if (blocked) return { state: { ...s, facing }, sounds: [], complete: false };

  let { score, cheeseValue, bombs, lives, nextLife } = s;
  const sounds: Sound[] = [];
  const content = s.cells[y * s.cols + x];
  if (content === Cheese.Cheddar) {
    score += cheeseValue;
    sounds.push('Eat Cheese');
    // Checked when the score is redrawn (FUN_00403ab0), i.e. after each cheddar slice.
    if (score >= nextLife) {
      lives += 1;
      nextLife += EXTRA_LIFE;
    }
  } else if (content === Cheese.Gouda) {
    cheeseValue += s.level * 2 + 8;
    sounds.push('Eat Gouda');
  } else if (content === Cheese.Bomb) {
    bombs += 1;
    sounds.push('Eat CheeseBomb');
  }
  const cells = [...s.cells];
  cells[y * s.cols + x] = Cheese.None;
  const state = { ...s, facing, mouse: { x, y }, cells, score, cheeseValue, bombs, lives, nextLife, running: true };
  // Only eating a cheddar slice can complete the level (gouda and bombs may be left).
  const complete = content === Cheese.Cheddar && !cells.includes(Cheese.Cheddar);
  if (complete) sounds.push('Level Complete');
  return { state: complete ? { ...state, running: false } : state, sounds, complete };
}

/**
 * The CheeseBomb key: every cat turns back. Only once the cats run, and with a bomb left;
 * otherwise the "Out of CheeseBombs" sound.
 */
export function detonate(s: State): { state: State; sounds: Sound[] } {
  if (!s.active) return { state: s, sounds: [] };
  if (!s.running || s.bombs === 0) return { state: s, sounds: ['Out of CheeseBombs'] };
  return {
    state: { ...s, bombs: s.bombs - 1, cats: s.cats.map((c) => ({ ...c, vx: back(c.vx), vy: back(c.vy) })) },
    sounds: ['Detonate CheeseBomb'],
  };
}

/**
 * A new cat on a random edge cell (FUN_00402380), unless a cat is already on that side of the
 * cell (up to 100 tries). It enters straight in, at the current speed; three times one chance
 * in four of one pixel per tick faster; one chance in five of going diagonally.
 */
function spawn(s: State, random: Random): Cat | null {
  const { cols, rows } = s;
  for (let attempt = 0; attempt < 100; attempt++) {
    const r = below(random, (cols + rows) * 2);
    let cat: Cat;
    let edge: Rect;
    if (r < cols) {
      const c = cellRect(r, 0);
      edge = { ...c, bottom: c.top };
      cat = { x: c.left + 2, y: c.top - CAT + 1, vx: 0, vy: s.catSpeed };
    } else if (r < cols * 2) {
      const c = cellRect(r - cols, rows - 1);
      edge = { ...c, top: c.bottom };
      cat = { x: c.left + 2, y: c.bottom - 1, vx: 0, vy: -s.catSpeed };
    } else if (r < cols * 2 + rows) {
      const c = cellRect(0, r - cols * 2);
      edge = { ...c, right: c.left };
      cat = { x: c.left - CAT + 1, y: c.top + 2, vx: s.catSpeed, vy: 0 };
    } else {
      const c = cellRect(cols - 1, r - cols * 2 - rows);
      edge = { ...c, left: c.right };
      cat = { x: c.right - 1, y: c.top + 2, vx: -s.catSpeed, vy: 0 };
    }
    if (s.cats.some((other) => overlaps(catRect(other), edge))) continue;
    const away = (v: number) => (v < 1 ? v - 1 : v + 1);
    for (let i = 0; i < 3; i++) {
      if (below(random, 4) === 0) {
        if (cat.vx === 0) cat.vy = away(cat.vy);
        else cat.vx = away(cat.vx);
      }
    }
    if (below(random, 5) === 0) {
      if (cat.vx === 0) cat.vx = below(random, 2) === 1 ? back(cat.vy) : cat.vy;
      else cat.vy = below(random, 2) === 1 ? back(cat.vx) : cat.vx;
    }
    return cat;
  }
  return null;
}

/**
 * One tick of the cats' timer (FUN_00402380): each cat moves, or turns back if it would run
 * into another; the cats off the board leave; maybe a new cat; then whether one has the mouse.
 * `caught` is the index of the cat that got the mouse (the last one found).
 */
export function step(s: State, random: Random): { state: State; caught: number | null } {
  if (!s.active || !s.running) return { state: s, caught: null };
  const cats = s.cats.map((c) => ({ ...c }));
  cats.forEach((cat, i) => {
    const moved = catRect({ x: cat.x + cat.vx, y: cat.y + cat.vy });
    if (cats.some((other, j) => j !== i && overlaps(catRect(other), moved))) {
      cat.vx = back(cat.vx);
      cat.vy = back(cat.vy);
    } else {
      cat.x += cat.vx;
      cat.y += cat.vy;
    }
  });
  // The original's loop removes cats while counting up, so the cat after a removed one is only
  // checked on the next tick.
  const field = fieldRect(s);
  for (let i = 0; i < cats.length; i++) {
    if (!overlaps(catRect(cats[i]!), field)) cats.splice(i, 1);
  }
  let state: State = { ...s, cats };
  if (cats.length < MAX_CATS && cats.length < s.level + 1) {
    const cat = spawn(state, random);
    if (cat) state = { ...state, cats: [...cats, cat] };
  }
  const mouse = mouseRect(state);
  let caught: number | null = null;
  state.cats.forEach((c, i) => {
    if (overlaps(catRect(c), mouse)) caught = i;
  });
  return { state, caught };
}

/** Where a cat that got the mouse ends its pounce: 2 pixels inside the mouse's cell. */
export const pounceTarget = (s: State): { x: number; y: number } => ({
  x: s.mouse.x * CELL + 2,
  y: s.mouse.y * CELL + 2,
});

/**
 * After the pounce: one mouse fewer. With mice left, the next one starts in the middle of the
 * board, the cats are gone and the timer waits for its first move; otherwise the game is over.
 */
export function loseMouse(s: State): State {
  const lives = s.lives - 1;
  if (lives === 0) return { ...s, lives, running: false, active: false, cats: [] };
  return {
    ...s,
    lives,
    running: false,
    cats: [],
    mouse: { x: Math.floor(s.cols / 2), y: Math.floor(s.rows / 2) },
  };
}
