// Rules of Push-Pull and its computer player, as pushpull.exe implements them (see
// docs/games/pushpull.md for the functions this follows). A 7×7 board: the player's pieces on
// the top and bottom rows, the computer's on the left and right columns (corners empty). A
// marker moves one square at a time in any direction onto a square not yet visited; landing on
// a piece captures it, for its owner. Pure and immutable.

export const SIZE = 7;

/** Square states, as the original stores them (`+4` of each square). */
export const Square = {
  Empty: 0,
  /** One of the player's pieces (top and bottom rows). */
  Player: 1,
  /** One of the computer's pieces (left and right columns). */
  Computer: 2,
  /** Visited by the marker. */
  Visited: 3,
  /** A player's piece captured: a point for the player. */
  PlayerCaptured: 4,
  /** A computer's piece captured: a point for the computer. */
  ComputerCaptured: 5,
} as const;

/** Captures that end the game: all the pieces of a side. */
export const ALL = 10;

export interface State {
  /** 49 squares, row by row. */
  squares: readonly number[];
  /** The marker's square, or -1 before it is placed. */
  marker: number;
}

export const index = (x: number, y: number): number => y * SIZE + x;

/** The board at the start (`FUN_0040a280`). */
export function start(): State {
  const squares: number[] = Array(SIZE * SIZE).fill(Square.Empty);
  for (let i = 1; i < SIZE - 1; i++) {
    squares[index(i, 0)] = Square.Player;
    squares[index(i, SIZE - 1)] = Square.Player;
    squares[index(0, i)] = Square.Computer;
    squares[index(SIZE - 1, i)] = Square.Computer;
  }
  return { squares, marker: -1 };
}

/** The eight directions, in the order of the original's table (`0x413340`). */
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

/** The squares the marker can go to from `marker`: neighbours not visited nor captured. */
function neighbours(squares: readonly number[], marker: number): number[] {
  const x = marker % SIZE;
  const y = Math.floor(marker / SIZE);
  const out: number[] = [];
  for (const [dx, dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && squares[index(nx, ny)]! < Square.Visited) {
      out.push(index(nx, ny));
    }
  }
  return out;
}

/** Where the marker can go: any empty square to place it, then the free neighbours. */
export function moves(state: State): number[] {
  if (state.marker < 0) return state.squares.flatMap((s, i) => (s === Square.Empty ? [i] : []));
  return neighbours(state.squares, state.marker);
}

export function captures(state: State): { player: number; computer: number } {
  return {
    player: state.squares.filter((s) => s === Square.PlayerCaptured).length,
    computer: state.squares.filter((s) => s === Square.ComputerCaptured).length,
  };
}

export type MoveEvent = 'marker' | 'capturePlayer' | 'captureComputer';

/** The marker goes to `square` (`FUN_0040aa20`); a piece there is captured for its owner. */
export function move(state: State, square: number): { state: State; event: MoveEvent } {
  const squares = [...state.squares];
  const was = squares[square]!;
  squares[square] = was + Square.Visited;
  const event: MoveEvent =
    was === Square.Player ? 'capturePlayer' : was === Square.Computer ? 'captureComputer' : 'marker';
  return { state: { squares, marker: square }, event };
}

/** The game ends when the marker cannot move, or when a side has its 10 pieces captured. */
export function isOver(state: State): boolean {
  const { player, computer } = captures(state);
  return player === ALL || computer === ALL || (state.marker >= 0 && moves(state).length === 0);
}

/**
 * The depth of the computer's look-ahead (`FUN_0040a7c0`): 1, 3, 5 or 7 by skill level, plus 1
 * four times in ten and plus 2 twice in ten (`rand() % 10`).
 */
export function depthFor(skill: number, random: () => number): number {
  const base = [1, 3, 5, 7][skill - 1]!;
  const r = Math.floor(random() * 10);
  return base + (r >= 8 ? 2 : r >= 4 ? 1 : 0);
}

const LOST = -32000;

/**
 * The look-ahead (`FUN_0040c3b0`), as the original writes it: a negamax over the captures
 * (computer's minus player's, × `sign`, × 1000 when the game is over), pruned by an optimistic
 * bound (the side to move capturing at every remaining ply) against `alpha`. The two bounds
 * swap at each ply without being negated, and a pruned position is worth −32000 to its mover
 * (so +32000 to the one before): kept as is. The moves are tried in the order of the
 * directions; the first strictly better one is kept, and the loop stops past 100.
 */
function search(
  squares: number[],
  counts: [number, number],
  marker: number,
  depth: number,
  sign: number,
  alpha: number,
  beta: number,
  out: { move: number },
): number {
  const [player, computer] = counts;
  out.move = -1;
  if (depth === 0) return (computer - player) * sign;
  depth--;
  if (computer === ALL || player === ALL) return (computer - player) * sign * 1000;
  const [mine, theirs] = sign > 0 ? [computer, player] : [player, computer];
  const reach = mine + depth;
  const bound = reach >= ALL ? (ALL - theirs) * 1000 : reach - theirs;
  if (bound <= alpha) return LOST;
  const options = neighbours(squares, marker);
  if (options.length === 0) return (computer - player) * sign * 1000;
  let best = LOST;
  let bestMove = options[0]!;
  const child = { move: -1 };
  for (const square of options) {
    const was = squares[square]!;
    squares[square] = was + Square.Visited;
    const next: [number, number] = [
      player + (was === Square.Player ? 1 : 0),
      computer + (was === Square.Computer ? 1 : 0),
    ];
    const v = -search(squares, next, square, depth, -sign, beta, alpha, child);
    squares[square] = was;
    if (alpha < v) alpha = v;
    if (v > best) {
      best = v;
      bestMove = square;
    }
    if (v > 100) break;
  }
  out.move = bestMove;
  return best;
}

/**
 * The computer's move (`FUN_0040c230`): with no marker yet, one of four squares at random
 * ((1, 2), (1, 4), (5, 2) or (5, 4)), otherwise the look-ahead's choice at `depth`.
 */
export function computerMove(state: State, depth: number, random: () => number): number {
  if (state.marker < 0) {
    const second = random() < 0.5 ? 0 : 14;
    const right = random() < 0.5 ? 0 : 4;
    return 15 + second + right;
  }
  const { player, computer } = captures(state);
  const out = { move: -1 };
  search([...state.squares], [player, computer], state.marker, depth, 1, LOST, LOST, out);
  return out.move;
}
