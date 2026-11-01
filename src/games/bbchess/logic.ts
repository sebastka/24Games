// Rules of Black Box Chess, as the original bbchess.exe implements them (see docs/games/bbchess.md
// for the functions this follows). Pure and immutable: every action returns a new state.

/** The five hidden pieces, in the palette's order (and pieces.bmp's). */
export const Piece = { King: 0, Queen: 1, Rook: 2, Knight: 3, Bishop: 4 } as const;
export const PIECES = 5;

export interface Point {
  x: number;
  y: number;
}

/** A square: not looked at yet, the number of pieces threatening it, or a hidden piece's ("?"). */
export type Square = { kind: 'unknown' } | { kind: 'count'; count: number } | { kind: 'hidden' };

export interface State {
  /** Row-major 8×8. */
  squares: readonly Square[];
  /** Where each piece really is. */
  secret: readonly Point[];
  /** Where the player put each piece (null: still in the palette). */
  placed: readonly (Point | null)[];
  score: number;
  /** False once guessed or given up. */
  active: boolean;
}

const same = (a: Point | null | undefined, b: Point | null | undefined) => !!a && !!b && a.x === b.x && a.y === b.y;

/**
 * A new game (`FUN_00401b50`): each piece in turn on a random square, `rand() % 8` for the row
 * then for the column, again until no other piece is there; their squares show "?". Score 100.
 */
export function deal(random: () => number = Math.random): State {
  const rand = () => Math.floor(random() * 32768) % 8;
  const secret: Point[] = [];
  for (let i = 0; i < PIECES; i++) {
    let p: Point;
    do {
      const y = rand();
      p = { x: rand(), y };
    } while (secret.some((s) => same(s, p)));
    secret.push(p);
  }
  const squares: Square[] = Array.from({ length: 64 }, (_, i) =>
    secret.some((s) => s.x === i % 8 && s.y === Math.floor(i / 8)) ? { kind: 'hidden' } : { kind: 'unknown' },
  );
  return { squares, secret, placed: secret.map(() => null), score: 100, active: true };
}

/**
 * Whether `piece` at `from` threatens `to` (`FUN_004011b4`): by its moves alone, the other
 * pieces never block it.
 */
export function threatens(piece: number, from: Point, to: Point): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  switch (piece) {
    case Piece.King:
      return dx < 2 && dy < 2;
    case Piece.Queen:
      return dx === 0 || dy === 0 || dx === dy;
    case Piece.Rook:
      return dx === 0 || dy === 0;
    case Piece.Knight:
      return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
    default:
      return dx === dy;
  }
}

/** The score never goes below 0 (the original's unsigned score wraps, then is set to 0). */
const lower = (score: number, by: number) => Math.max(0, score - by);

/**
 * A click on a square not looked at yet (`FUN_004032a0`): it shows how many pieces threaten it;
 * 2 points less. Null for any other square.
 */
export function reveal(state: State, at: Point): State | null {
  const i = at.y * 8 + at.x;
  if (!state.active || state.squares[i]?.kind !== 'unknown') return null;
  const count = state.secret.filter((p, piece) => threatens(piece, p, at)).length;
  const squares = [...state.squares];
  squares[i] = { kind: 'count', count };
  return { ...state, squares, score: lower(state.score, 2) };
}

/** Where `piece` may be dropped (`FUN_00402941`): a "?" square no piece is on, or the palette (null). */
export function canDrop(state: State, piece: number, to: Point | null): boolean {
  if (to === null) return true;
  return state.squares[to.y * 8 + to.x]?.kind === 'hidden' && !state.placed.some((p) => same(p, to));
}

/** A piece put on a square, or back in the palette (`FUN_00402de8`). */
export function place(state: State, piece: number, to: Point | null): State {
  const placed = [...state.placed];
  placed[piece] = to;
  return { ...state, placed };
}

/** Guess is possible once every piece is on the board (`FUN_0040255d`). */
export const canGuess = (state: State): boolean => state.active && state.placed.every((p) => p !== null);

/**
 * Game › Guess (`FUN_00401f62`): right if every piece is on its square; the game is over. Wrong:
 * 5 points less.
 */
export function guess(state: State): { state: State; right: boolean } {
  if (state.placed.every((p, i) => same(p, state.secret[i])))
    return { state: { ...state, active: false }, right: true };
  return { state: { ...state, score: lower(state.score, 5) }, right: false };
}

/** Game › Give Up (`FUN_004021c0`): the pieces go to their squares; the game is over. */
export const giveUp = (state: State): State => ({ ...state, placed: state.secret, active: false });
