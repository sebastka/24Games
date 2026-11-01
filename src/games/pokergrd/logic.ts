// Rules of Poker Patience, as the original pokergrd.exe implements them (see
// docs/games/pokergrd.md for the functions this follows). Pure and immutable.
import { newDeck, shuffle, type Card, type Random } from '../../shell/cards/cards.ts';
import { evaluate, Hand } from '../../shell/cards/poker.ts';

export const SIZE = 5;
export const CELLS = SIZE * SIZE;

export interface Variant {
  /** Two piles of 26 cards to draw from, instead of one of 52 (ShowTwoDecks). */
  twoPiles: boolean;
  /** The piles' cards face up (ShowCardFronts), or only their top cards. */
  faceUp: boolean;
}

export interface State {
  /** Row-major, null for an empty cell (cell 0 is A, cell 24 is Y). */
  grid: readonly (Card | null)[];
  /** The piles, their top card first. */
  piles: readonly (readonly Card[])[];
  /** The pile cards are taken from (the arrow between two piles points to it). */
  selected: number;
}

/** FUN_0040654c: a shuffled deck, dealt into one or two piles. */
export function deal(variant: Variant, random: Random): State {
  const deck = shuffle(newDeck(), random);
  return {
    grid: Array<Card | null>(CELLS).fill(null),
    piles: variant.twoPiles ? [deck.slice(0, 26), deck.slice(26)] : [deck],
    selected: 0,
  };
}

export const isOver = (state: State): boolean => state.grid.every((c) => c !== null);

/** FUN_00405a11: the top card of pile `pile` into the empty cell `cell`. */
export function place(state: State, pile: number, cell: number): State {
  const card = state.piles[pile]?.[0];
  if (!card || state.grid[cell] !== null) return state;
  const grid = [...state.grid];
  grid[cell] = card;
  return { ...state, grid, piles: state.piles.map((p, i) => (i === pile ? p.slice(1) : p)) };
}

/** The selected pile's top card into `cell` (a click on the cell, or its letter). */
export const placeSelected = (state: State, cell: number): State => place(state, state.selected, cell);

/** The hands of the rows (top to bottom) then of the columns (left to right). */
export function lines(state: State): Card[][] {
  const at = (row: number, col: number) => state.grid[row * SIZE + col]!;
  const rows = Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (_, c) => at(r, c)));
  const cols = Array.from({ length: SIZE }, (_, c) => Array.from({ length: SIZE }, (_, r) => at(r, c)));
  return [...rows, ...cols];
}

/**
 * The hand of a line as Poker Patience shows and scores it (FUN_00405bfd): no jacks-or-better
 * distinction, and no "no wilds" royal flush.
 */
export function lineHand(cards: readonly Card[]): number {
  const hand = evaluate(cards);
  if (hand === Hand.JacksOrBetter || hand === Hand.KingsOrBetter) return Hand.Pair;
  if (hand === Hand.NaturalRoyalFlush) return Hand.RoyalFlush;
  return hand;
}

/**
 * Points of a hand (FUN_00404be0 with its "English" table, the one Poker Patience uses). The
 * other table (pair 2, two pair 5, three 10, straight 15, flush 20, full house 25, four 50,
 * straight flush 75, royal flush 100) is in the executable but unused.
 */
const POINTS: Record<number, number> = {
  [Hand.Pair]: 1,
  [Hand.TwoPair]: 3,
  [Hand.Flush]: 5,
  [Hand.ThreeOfAKind]: 6,
  [Hand.Straight]: 12,
  [Hand.FullHouse]: 10,
  [Hand.FourOfAKind]: 16,
  [Hand.StraightFlush]: 30,
  [Hand.RoyalFlush]: 30,
};
export const points = (hand: number): number => POINTS[hand] ?? 0;

export interface LineScore {
  hand: number;
  points: number;
}

/** The score of a full grid: its rows, its columns and their total. */
export function score(state: State): { rows: LineScore[]; columns: LineScore[]; total: number } {
  const all = lines(state).map((cards) => {
    const hand = lineHand(cards);
    return { hand, points: points(hand) };
  });
  return { rows: all.slice(0, SIZE), columns: all.slice(SIZE), total: all.reduce((n, l) => n + l.points, 0) };
}

/** The high score table of a variant: one per combination of the options (as the original). */
export const tableOf = (variant: Variant): number => (variant.faceUp ? 2 : 0) + (variant.twoPiles ? 1 : 0);
