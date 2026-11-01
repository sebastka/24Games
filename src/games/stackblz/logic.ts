// Rules of StackBlitz, as the original stackblz.exe implements them (see docs/games/stackblz.md
// for the functions this follows). Pure and immutable: every call returns a new state, and the
// events (named after the game's sound events) that happened.
//
// Time is simulated in steps of 1 ms: the game is driven by one StarView timer whose timeout
// (1000 ms at level 1, down to 2 ms) is a whole number of milliseconds.

export const COLS = 6;
/** Rows of the grid: 13 visible (0 at the bottom), and 2 hidden above where a stack can stick out. */
export const ROWS = 15;
export const VISIBLE_ROWS = 13;
/** The falling stack starts with its bottom piece on the top visible row. */
const TOP = VISIBLE_ROWS - 1;

/** Piece codes: 0 empty, 1-6 the six colours (of the chosen set), then the special pieces. */
export const Piece = {
  Empty: 0,
  /** Removes every piece of the colour it lands on. */
  Wipe: 7,
  /** Removes the piece it lands on. */
  Bomb: 8,
  /** Removes the whole column under it. */
  Drill: 9,
} as const;

/** Timer timeouts per level, in ms (stackblz.exe 0x411370): level = stacks / 10 + 1, at most 18. */
export const PERIODS = [1000, 850, 700, 600, 500, 425, 350, 300, 250, 200, 150, 100, 50, 30, 20, 10, 5, 2];

export const STEP_MS = 1;

/** The C runtime's rand(): an integer in 0..32767. Injected, so that tests are deterministic. */
export type Rand = () => number;

export const randomRand: Rand = () => Math.floor(Math.random() * 32768);

/** A stack, bottom piece first. Special pieces come alone: [special, 0, 0]. */
export type Stack = readonly [number, number, number];

export type Action = 'left' | 'right' | 'rotateUp' | 'rotateDown' | 'drop';

/** What happened, by the name of its sound event. */
export type GameEvent =
  | 'Rotate Up'
  | 'Rotate Down'
  | 'Piece Landing'
  | 'Vertical Stack'
  | 'Horizontal Stack'
  | 'Diagonal Stack'
  | 'Bomb'
  | 'New Level'
  | 'Game Over';

export interface State {
  /** Column-major, as the original: `grid[col * ROWS + row]`, row 0 at the bottom. */
  grid: readonly number[];
  /** The falling stack and where its bottom piece is. */
  stack: Stack;
  col: number;
  row: number;
  next: Stack;
  playing: boolean;
  score: number;
  stacks: number;
  /** 1-18; the piece values and bonuses are multiples of it. Updated as the original does (see `updateLevel`). */
  level: number;
  /** The timer's timeout, in ms. */
  period: number;
  /** Time since the timer was last started, in ms. */
  clock: number;
}

export interface Result {
  state: State;
  events: GameEvent[];
}

/** The points of a piece (1-6) at a level, as shown next to it. */
export const pieceValue = (piece: number, level: number): number => piece * level;
export const horizontalBonus = (level: number): number => 2 * level;
export const diagonalBonus = (level: number): number => 3 * level;

/** The cell at (col, row), 0 outside the visible grid (FUN_00407aa0). */
export function cell(grid: readonly number[], col: number, row: number): number {
  return col >= 0 && col < COLS && row >= 0 && row < VISIBLE_ROWS ? grid[col * ROWS + row]! : 0;
}

/**
 * A new random stack (FUN_00407ae0): one time in ten a special piece, alone; otherwise three
 * colours, weighted 12, 12, 11, 6, 4 and 3 out of 48.
 */
export function randomStack(rand: Rand): Stack {
  if (rand() % 10 === 0) return [Piece.Wipe + (rand() % 3), 0, 0];
  const piece = () => {
    const r = rand() % 48;
    return r < 12 ? 1 : r < 24 ? 2 : r < 35 ? 3 : r < 41 ? 4 : r < 45 ? 5 : 6;
  };
  const a = piece();
  const b = piece();
  return [a, b, piece()];
}

/** The game window as it opens (FUN_00407c80): the current and next stacks drawn, not playing. */
export function initial(rand: Rand): State {
  const stack = randomStack(rand);
  return {
    grid: Array<number>(COLS * ROWS).fill(0),
    stack,
    col: 0,
    row: TOP,
    next: randomStack(rand),
    playing: false,
    score: 0,
    stacks: 0,
    level: 1,
    period: PERIODS[0]!,
    clock: 0,
  };
}

/** The next stack falls from column 2 or 3; a new next stack is drawn. */
function spawn(s: State, rand: Rand): State {
  const next = randomStack(rand);
  return { ...s, stack: s.next, next, col: 2 + (rand() % 2), row: TOP, clock: 0 };
}

/** Game › New (menu handler FUN_0040ae70, item 11). */
export function newGame(s: State, rand: Rand): Result {
  const events: GameEvent[] = [];
  const cleared: State = {
    ...s,
    grid: Array<number>(COLS * ROWS).fill(0),
    score: 0,
    stacks: 0,
    playing: true,
    period: PERIODS[0]!,
  };
  return { state: spawn(updateLevel(cleared, events), rand), events };
}

/**
 * The level from the stack count (FUN_00408940): a new timer timeout ("New Level") when it
 * changes, and the piece values and bonuses of the level.
 */
function updateLevel(s: State, events: GameEvent[]): State {
  const index = Math.min(Math.floor(s.stacks / 10), PERIODS.length - 1);
  const period = PERIODS[index]!;
  if (period !== s.period) events.push('New Level');
  return { ...s, level: index + 1, period };
}

/** Pieces fall into the holes under them (FUN_00409750); the hidden rows are left alone. */
function settle(grid: number[]): void {
  for (let moved = true; moved;) {
    moved = false;
    for (let row = 1; row < VISIBLE_ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const at = col * ROWS + row;
        if (grid[at] !== 0 && grid[at - 1] === 0) {
          grid[at - 1] = grid[at]!;
          grid[at] = 0;
          moved = true;
        }
      }
    }
  }
}

const DIRECTIONS = [
  { dc: 0, dr: 1, min: 0, max: COLS, event: 'Vertical Stack' },
  { dc: 1, dr: 0, min: 0, max: COLS - 2, event: 'Horizontal Stack' },
  { dc: 1, dr: 1, min: 0, max: COLS - 2, event: 'Diagonal Stack' },
  { dc: -1, dr: 1, min: 2, max: COLS, event: 'Diagonal Stack' },
] as const;

/**
 * One round of matches (FUN_00408fb0): every line of three same pieces, vertical, horizontal or
 * diagonal (a longer line counts once per three in a row), is a stack. Each scores its bonus
 * (none for a vertical one), then each piece in a stack scores its value and goes, and the rest
 * falls. Returns how many stacks were found.
 */
function matchRound(s: State, events: GameEvent[]): { state: State; found: number } {
  const { grid, level } = s;
  const marked = new Set<number>();
  let { score, stacks } = s;
  let found = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const piece = cell(grid, col, row);
      if (piece === 0) continue;
      for (const d of DIRECTIONS) {
        if (col < d.min || col >= d.max) continue;
        if (cell(grid, col + d.dc, row + d.dr) !== piece || cell(grid, col + 2 * d.dc, row + 2 * d.dr) !== piece) {
          continue;
        }
        events.push(d.event);
        found++;
        stacks++;
        if (d.dr === 0) score += horizontalBonus(level);
        else if (d.dc !== 0) score += diagonalBonus(level);
        for (let i = 0; i < 3; i++) marked.add((col + i * d.dc) * ROWS + row + i * d.dr);
      }
    }
  }
  if (found === 0) return { state: s, found };
  const next = grid.slice();
  for (const at of marked) {
    score += pieceValue(next[at]!, level);
    next[at] = 0;
  }
  settle(next);
  let state: State = { ...s, grid: next, score, stacks };
  // Sic: the level is only recomputed when the count is not a multiple of 10 (the 10th stack
  // raises the level only with the next round of stacks).
  if (stacks % 10 !== 0) state = updateLevel(state, events);
  return { state, found };
}

/** Removes the piece at (col, row), scoring its value (special pieces in the grid score nothing). */
function blast(grid: number[], col: number, row: number, level: number): number {
  const piece = cell(grid, col, row);
  grid[col * ROWS + row] = 0;
  return piece >= 1 && piece <= 6 ? pieceValue(piece, level) : 0;
}

/** The stack lands where it is (FUN_00409960, landing branch). */
function land(s: State, rand: Rand, events: GameEvent[]): State {
  const { col, row, level } = s;
  const grid = s.grid.slice();
  let score = s.score;
  const [bottom] = s.stack;
  if (bottom === Piece.Bomb) {
    events.push('Bomb');
    if (row > 0) score += blast(grid, col, row - 1, level);
  } else if (bottom === Piece.Drill) {
    events.push('Bomb');
    for (let r = row; r >= 0; r--) score += blast(grid, col, r, level);
  } else if (bottom === Piece.Wipe) {
    events.push('Bomb');
    if (row > 0) {
      const colour = cell(grid, col, row - 1);
      for (let r = 0; r < VISIBLE_ROWS; r++) {
        for (let c = 0; c < COLS; c++) if (cell(grid, c, r) === colour) score += blast(grid, c, r, level);
      }
      settle(grid);
    }
  } else {
    events.push('Piece Landing');
    s.stack.forEach((piece, i) => (grid[col * ROWS + row + i] = piece));
  }
  let state: State = { ...s, grid, score };
  for (;;) {
    const round = matchRound(state, events);
    state = round.state;
    if (round.found === 0) break;
  }
  if (Array.from({ length: COLS }, (_, c) => state.grid[c * ROWS + TOP]).some((p) => p !== 0)) {
    events.push('Game Over');
    return { ...state, playing: false };
  }
  return spawn(state, rand);
}

/** A timer tick (FUN_00409960): the stack lands if it rests on something, or moves down a row. */
function tick(s: State, rand: Rand, events: GameEvent[]): State {
  if (s.row === 0 || cell(s.grid, s.col, s.row - 1) !== 0) return land(s, rand, events);
  return { ...s, row: s.row - 1 };
}

/** A key of the game (FUN_0040a120), while playing. */
export function act(s: State, action: Action, rand: Rand): Result {
  const events: GameEvent[] = [];
  if (!s.playing) return { state: s, events };
  const { col, row } = s;
  const [a, b, c] = s.stack;
  switch (action) {
    case 'left':
      return { state: col > 0 && cell(s.grid, col - 1, row) === 0 ? { ...s, col: col - 1 } : s, events };
    case 'right':
      return { state: col < COLS - 1 && cell(s.grid, col + 1, row) === 0 ? { ...s, col: col + 1 } : s, events };
    case 'rotateUp':
      // The pieces move down, the bottom one to the top; special pieces do not turn.
      if (a > 6) return { state: s, events };
      events.push('Rotate Up');
      return { state: { ...s, stack: [b, c, a] }, events };
    case 'rotateDown':
      if (a > 6) return { state: s, events };
      events.push('Rotate Down');
      return { state: { ...s, stack: [c, a, b] }, events };
    case 'drop': {
      // To the lowest free cell of the column, and lands at once.
      let to = 0;
      while (to < row && cell(s.grid, col, to) !== 0) to++;
      return { state: land({ ...s, row: to }, rand, events), events };
    }
  }
}

/**
 * The fixed-step simulation: the actions (keys pressed since the last step), then 1 ms of time.
 * When the timer's timeout is reached it fires, and restarts.
 */
export function step(s: State, actions: readonly Action[], rand: Rand): Result {
  const events: GameEvent[] = [];
  let state = s;
  for (const action of actions) {
    const r = act(state, action, rand);
    state = r.state;
    events.push(...r.events);
  }
  if (!state.playing) return { state, events };
  const clock = state.clock + STEP_MS;
  if (clock < state.period) return { state: { ...state, clock }, events };
  const fired = tick({ ...state, clock: 0 }, rand, events);
  return { state: fired, events };
}

/** The timer restarts its count when the game resumes (after a dialog, or when the window comes back). */
export const restartTimer = (s: State): State => ({ ...s, clock: 0 });

/** Options › OK ends the game in progress (the grid stays, under "Press F2 To Begin"). */
export const stop = (s: State): State => ({ ...s, playing: false });
