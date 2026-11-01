// Rules of Vanishing Cross, as the original vcross.exe implements them (see
// docs/games/vcross.md for the functions this follows). Pure and immutable.
import { newDeck, Rank, shuffle, type Card, type Random } from '../../shell/cards/cards.ts';

/** Piles: 0 the stock (face down), 1 the waste, 2-5 the foundations (corners), 6-10 the cross. */
export const STOCK = 0;
export const WASTE = 1;
export const FOUNDATIONS = [2, 3, 4, 5];
export const CROSS = [6, 7, 8, 9, 10];
export const isFoundation = (pile: number): boolean => pile >= 2 && pile <= 5;

export interface Move {
  from: number;
  to: number;
}

export interface State {
  /** The 11 piles, bottom card first; only top cards show. */
  piles: readonly (readonly Card[])[];
  /** Options › Build on given foundation value: the rank every foundation starts with. */
  base: number | null;
  /** False once won. */
  playing: boolean;
  /** The last move, which Game › Undo Last Move takes back. */
  last: Move | null;
}

/**
 * FUN_0040b0f8: five cards to the cross (top, left, centre, right, bottom), then, building on a
 * given value, the next to the first foundation (its rank is the base of all four), the rest to
 * the stock.
 */
export function deal(buildOnInitial: boolean, random: Random): State {
  const deck = shuffle(newDeck(), random);
  const piles: Card[][] = Array.from({ length: 11 }, () => []);
  CROSS.forEach((pile, i) => piles[pile]!.push(deck[i]!));
  let next = CROSS.length;
  let base: number | null = null;
  if (buildOnInitial) {
    base = deck[next]!.rank;
    piles[FOUNDATIONS[0]!]!.push(deck[next++]!);
  }
  piles[STOCK]!.push(...deck.slice(next));
  return { piles, base, playing: true, last: null };
}

export const top = (state: State, pile: number): Card | undefined => state.piles[pile]!.at(-1);

/** The rank after `rank`, a king followed by an ace. */
const above = (rank: number): number => (rank === Rank.King ? Rank.Ace : rank + 1);

/**
 * Where the top card of `from` may go (FUN_00409e8d builds these drop zones). The cross: onto
 * an empty pile, or a card one rank higher (a king onto an ace), whatever the suit. A
 * foundation: the next card of its suit (an ace on a king); an empty one takes the base rank,
 * or, building on values you select, any card of a suit no foundation has yet.
 */
export function canMove(state: State, from: number, to: number): boolean {
  const card = top(state, from);
  if (!state.playing || !card || from === to || !(from === WASTE || CROSS.includes(from))) return false;
  const onto = top(state, to);
  if (CROSS.includes(to)) return !onto || onto.rank === above(card.rank);
  if (!isFoundation(to)) return false;
  if (onto) return onto.suit === card.suit && card.rank === above(onto.rank);
  if (state.base !== null) return card.rank === state.base;
  return FOUNDATIONS.every((f) => top(state, f)?.suit !== card.suit);
}

const moved = (state: State, from: number, to: number): State => {
  const card = top(state, from)!;
  const piles = state.piles.map((p, i) => (i === from ? p.slice(0, -1) : i === to ? [...p, card] : p));
  return { ...state, piles, last: { from, to } };
};

/** True when the stock, the waste and the cross are empty. */
export const isWon = (state: State): boolean => [STOCK, WASTE, ...CROSS].every((p) => state.piles[p]!.length === 0);

/** A move, then the end of the game if it emptied the table (FUN_0040b358). */
function after(state: State): State {
  return isWon(state) ? { ...state, playing: false, last: null } : state;
}

/** FUN_0040a2d9: the top card of `from` onto `to`. */
export const move = (state: State, from: number, to: number): State => after(moved(state, from, to));

/** A click on the stock (FUN_0040a682): its top card face up onto the waste. */
export function dealFromStock(state: State): State {
  if (!state.playing || state.piles[STOCK]!.length === 0) return state;
  return after(moved(state, STOCK, WASTE));
}

/**
 * The foundation a double-click sends the top card of `from` (the waste or the cross) to
 * (FUN_0040a682): the first empty one if the card can start it, else one of its suit it follows.
 */
export function foundationFor(state: State, from: number): number | null {
  const card = top(state, from);
  if (!state.playing || !card || !(from === WASTE || CROSS.includes(from))) return null;
  const empty = FOUNDATIONS.find((f) => state.piles[f]!.length === 0);
  if (empty !== undefined && canMove(state, from, empty)) return empty;
  return FOUNDATIONS.findLast((f) => top(state, f) && canMove(state, from, f)) ?? null;
}

export const canUndo = (state: State): boolean => state.playing && state.last !== null;

/** Game › Undo Last Move: the last moved card back (face down, if it came from the stock). */
export function undo(state: State): State {
  if (!canUndo(state)) return state;
  const { from, to } = state.last!;
  return { ...moved(state, to, from), last: null };
}

const RANK_NAMES = ['', 'Ace', 'Deuce', 'Three', 'Four', 'Five', 'Sixe', 'Seven', 'Eight', 'Nine', 'Ten'];
const COURT = ['Jack', 'Queen', 'King'];

/** FUN_0040adc9's caption: "Building" over "on Deuces" ("Sixe" + "s" for sixes). */
export function caption(base: number): [string, string] {
  const name = base <= 10 ? RANK_NAMES[base] : COURT[base - 11];
  return ['Building', `on ${name}s`];
}
