// Rules of Bulldozer, as the original bulldoze.exe implements them (see
// docs/reverse-engineering.md for the functions this follows). Pure and immutable: every
// action returns a new state.

export const COLS = 20;
export const ROWS = 12;

/** Tile codes: the hexadecimal digits of the level data, and the index in the piece sheet. */
export const Tile = {
  Floor: 0,
  Target: 1,
  Rock: 2,
  RockOnTarget: 3,
  DozerUp: 4,
  DozerDown: 5,
  DozerLeft: 6,
  DozerRight: 7,
  // 8-15: walls, eight looks.
} as const;

export type Direction = 'up' | 'down' | 'left' | 'right';

const STEP: Record<Direction, { dx: number; dy: number; dozer: number }> = {
  up: { dx: 0, dy: -1, dozer: Tile.DozerUp },
  down: { dx: 0, dy: 1, dozer: Tile.DozerDown },
  left: { dx: -1, dy: 0, dozer: Tile.DozerLeft },
  right: { dx: 1, dy: 0, dozer: Tile.DozerRight },
};

export interface Point {
  x: number;
  y: number;
}

export interface Level {
  /** Row-major tiles without the dozer (its start tile is floor). */
  tiles: readonly number[];
  start: Point;
  /** The dozer tile (DozerUp…DozerRight) at the start. */
  facing: number;
  /** Targets without a rock at the start. */
  targets: number;
}

/** What the last action can be undone to: only a push, and the dozer's step with it. */
interface Undo {
  /** The two cells a push changed (the dozer's new cell and the rock's), as they were. */
  rock: { cells: [number, number]; tiles: [number, number] } | null;
  /** The dozer's previous position and facing. */
  dozer: { at: Point; facing: number } | null;
  /** `remaining` before the last move. */
  remaining: number;
}

export interface State {
  level: Level;
  tiles: readonly number[];
  at: Point;
  facing: number;
  /** Targets still without a rock; the level is complete at 0. */
  remaining: number;
  undo: Undo;
}

/** What a move did, for its sound. */
export type MoveEvent = 'move' | 'rock' | 'rockOnTarget' | 'turn';

const index = ({ x, y }: Point): number => y * COLS + x;
const inside = ({ x, y }: Point): boolean => x >= 0 && x < COLS && y >= 0 && y < ROWS;

/** A level from its 12 rows of 20 hexadecimal digits. */
export function parseLevel(rows: readonly string[]): Level {
  if (rows.length !== ROWS || rows.some((r) => !/^[0-9A-F]{20}$/.test(r))) throw new Error('invalid level');
  const tiles = rows.flatMap((r) => [...r].map((c) => parseInt(c, 16)));
  const i = tiles.findIndex((t) => t >= Tile.DozerUp && t <= Tile.DozerRight);
  if (i < 0) throw new Error('level without a dozer');
  const facing = tiles[i]!;
  tiles[i] = Tile.Floor;
  return {
    tiles,
    start: { x: i % COLS, y: Math.floor(i / COLS) },
    facing,
    targets: tiles.filter((t) => t === Tile.Target).length,
  };
}

/**
 * The level at its start (also Game › Restart Level). `endless` is for the "THE END" screen
 * after level 60: it has no target, and the original sets one remaining target so that it can
 * never be completed.
 */
export function start(level: Level, endless = false): State {
  const remaining = endless ? 1 : level.targets;
  return {
    level,
    tiles: level.tiles,
    at: level.start,
    facing: level.facing,
    remaining,
    undo: { rock: null, dozer: null, remaining },
  };
}

export const isComplete = (state: State): boolean => state.remaining === 0;

/** Whether Game › Undo Last Move is enabled: the original enables it only after a push. */
export const canUndo = (state: State): boolean => state.undo.rock !== null;

export function move(state: State, direction: Direction): { state: State; event: MoveEvent } {
  const { dx, dy, dozer } = STEP[direction];
  const to = { x: state.at.x + dx, y: state.at.y + dy };
  // The original refuses to move the dozer off the board (levels are walled in anyway).
  if (!inside(to)) return { state, event: 'turn' };
  const beyond = { x: to.x + dx, y: to.y + dy };
  const tile = state.tiles[index(to)]!;
  const next = inside(beyond) ? state.tiles[index(beyond)]! : 8;
  const step = (tiles: readonly number[], remaining: number, rock: Undo['rock'], event: MoveEvent) => ({
    state: {
      ...state,
      tiles,
      at: to,
      facing: dozer,
      remaining,
      undo: { rock, dozer: { at: state.at, facing: state.facing }, remaining: state.remaining },
    },
    event,
  });

  if (tile === Tile.Floor || tile === Tile.Target) {
    // A plain move forgets the last push: it can no longer be undone.
    return step(state.tiles, state.remaining, null, 'move');
  }
  const pushable = (tile === Tile.Rock || tile === Tile.RockOnTarget) && (next === Tile.Floor || next === Tile.Target);
  if (!pushable) {
    // Blocked: the dozer only turns. The undo state is left as it was.
    return { state: { ...state, facing: dozer }, event: 'turn' };
  }
  const tiles = [...state.tiles];
  tiles[index(to)] = tile === Tile.RockOnTarget ? Tile.Target : Tile.Floor;
  tiles[index(beyond)] = next === Tile.Target ? Tile.RockOnTarget : Tile.Rock;
  const remaining = state.remaining - (next === Tile.Target ? 1 : 0) + (tile === Tile.RockOnTarget ? 1 : 0);
  const rock: Undo['rock'] = { cells: [index(to), index(beyond)], tiles: [tile, next] };
  return step(tiles, remaining, rock, next === Tile.Target ? 'rockOnTarget' : 'rock');
}

/**
 * Game › Undo Last Move: puts the last pushed rock back, then the dozer. `beep` is set when
 * there was no dozer move to undo (the original beeps).
 */
export function undo(state: State): { state: State; beep: boolean } {
  let { tiles, remaining } = state;
  const { rock, dozer } = state.undo;
  if (rock) {
    const t = [...tiles];
    t[rock.cells[0]] = rock.tiles[0];
    t[rock.cells[1]] = rock.tiles[1];
    tiles = t;
    remaining = state.undo.remaining;
  }
  const undone = { ...state.undo, rock: null, dozer: null };
  if (!dozer) return { state: { ...state, tiles, remaining, undo: undone }, beep: true };
  return { state: { ...state, tiles, remaining, at: dozer.at, facing: dozer.facing, undo: undone }, beep: false };
}
