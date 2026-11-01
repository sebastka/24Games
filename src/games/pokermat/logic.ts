// Rules of Poker Machine, as the original pokermat.exe implements them (see
// docs/games/pokermat.md for the functions this follows). Pure and immutable.
import { newDeck, Rank, shuffle, type Card, type Random } from '../../shell/cards/cards.ts';
import { Hand, matches } from '../../shell/cards/poker.ts';

export const GameType = { Straight: 0, JokersWild: 1, DeucesWild: 2 } as const;

export interface Paytable {
  /** The game's name, at the head of the hands column. */
  name: string;
  /** The paying hands, best first. */
  hands: number[];
  /** What each hand pays for a $1 bet; a bet of n pays n times, except the top hand at $5. */
  pays: number[];
  /** The top hand's pay for a $5 bet. */
  jackpot: number;
  /** Which cards are wild. */
  wild: (card: Card) => boolean;
  jokers: boolean;
}

/** FUN_0040b8b0: the three games' paylines. */
export const PAYTABLES: Paytable[] = [
  {
    name: 'Straight Poker',
    hands: [
      Hand.RoyalFlush,
      Hand.StraightFlush,
      Hand.FourOfAKind,
      Hand.FullHouse,
      Hand.Flush,
      Hand.Straight,
      Hand.ThreeOfAKind,
      Hand.TwoPair,
      Hand.JacksOrBetter,
    ],
    pays: [250, 50, 25, 8, 5, 4, 3, 2, 1],
    jackpot: 4000,
    wild: () => false,
    jokers: false,
  },
  {
    name: 'Jokers Wild Poker',
    hands: [
      Hand.NaturalRoyalFlush,
      Hand.FiveOfAKind,
      Hand.RoyalFlush,
      Hand.StraightFlush,
      Hand.FourOfAKind,
      Hand.FullHouse,
      Hand.Flush,
      Hand.Straight,
      Hand.ThreeOfAKind,
      Hand.TwoPair,
      Hand.KingsOrBetter,
    ],
    pays: [400, 200, 100, 50, 15, 7, 5, 3, 2, 1, 1],
    jackpot: 4700,
    wild: (c) => c.rank >= Rank.Joker,
    jokers: true,
  },
  {
    name: 'Deuces Wild Poker',
    hands: [
      Hand.NaturalRoyalFlush,
      Hand.FourWildCards,
      Hand.RoyalFlush,
      Hand.FiveOfAKind,
      Hand.StraightFlush,
      Hand.FourOfAKind,
      Hand.FullHouse,
      Hand.Flush,
      Hand.Straight,
      Hand.ThreeOfAKind,
    ],
    pays: [250, 200, 20, 10, 10, 4, 4, 3, 2, 1],
    jackpot: 4000,
    wild: (c) => c.rank === 2,
    jokers: false,
  },
];

/** What payline `row` pays for a bet of `bet` dollars (the columns' values). */
export function payout(table: Paytable, row: number, bet: number): number {
  return row === 0 && bet === 5 ? table.jackpot : table.pays[row]! * bet;
}

/**
 * FUN_0040b300: the payline of a hand, the highest one whose test passes (the tests are run one
 * by one, so a pair of kings is "Jacks or better" in straight poker); null if none.
 */
export function paylineOf(table: Paytable, hand: readonly Card[]): number | null {
  const row = table.hands.findIndex((h) => matches(h, hand, table.wild));
  return row < 0 ? null : row;
}

/** `new`: cards face down until the first deal; `draw`: choosing the cards to hold; `over`. */
export type Phase = 'new' | 'draw' | 'over';

export interface State {
  type: number;
  phase: Phase;
  /** No hand dealt yet since signing in: the panel only says "Press Deal". */
  fresh: boolean;
  deck: readonly Card[];
  /** The next card of the deck to deal. */
  next: number;
  hand: readonly Card[];
  /** Per card: held (face up) or discarded (face down) for the redeal. */
  held: readonly boolean[];
  /** The bet, 1-5 dollars (the selected column). */
  bet: number;
  balance: number;
  win: number;
  /** The payline of the hand on the table. */
  payline: number | null;
}

/** FUN_0040cc60: signing in, with $100; the bet column stays. */
export function signIn(type: number, bet = 1): State {
  return {
    type,
    phase: 'new',
    fresh: true,
    deck: [],
    next: 0,
    hand: [],
    held: Array<boolean>(5).fill(true),
    bet,
    balance: 100,
    win: 0,
    payline: null,
  };
}

/** The Deal button's two jobs (FUN_0040c250): deal, or redeal. */
export const buttonLabel = (state: State): string => (state.phase === 'draw' ? 'Redeal' : 'Deal');

/**
 * Deal: the bet paid from the balance, a shuffled deck (with the jokers in Jokers Wild), five
 * cards. Null when broke (the original beeps).
 */
export function deal(state: State, random: Random): State | null {
  if (state.phase === 'draw' || state.balance === 0) return null;
  const table = PAYTABLES[state.type]!;
  const deck = shuffle(newDeck(table.jokers), random);
  const hand = deck.slice(0, 5);
  return {
    ...state,
    phase: 'draw',
    fresh: false,
    deck,
    next: 5,
    hand,
    held: Array<boolean>(5).fill(true),
    balance: state.balance - state.bet,
    win: 0,
    payline: paylineOf(table, hand),
  };
}

/** FUN_0040e5c0: a click on a card flips it between held and discarded, while drawing. */
export function toggle(state: State, i: number): State | null {
  if (state.phase !== 'draw') return null;
  return { ...state, held: state.held.map((h, j) => (j === i ? !h : h)) };
}

/**
 * Redeal: the discarded cards replaced from the deck; the hand's payline pays the bet's column.
 * When the balance no longer covers the bet, the bet drops to the balance.
 */
export function redeal(state: State): State {
  const table = PAYTABLES[state.type]!;
  let next = state.next;
  const hand = state.hand.map((c, i) => (state.held[i] ? c : state.deck[next++]!));
  const payline = paylineOf(table, hand);
  const win = payline === null ? 0 : payout(table, payline, state.bet);
  const balance = state.balance + win;
  const bet = state.bet > balance && balance > 0 ? balance : state.bet;
  return {
    ...state,
    phase: 'over',
    deck: state.deck,
    next,
    hand,
    held: hand.map(() => true),
    payline,
    win,
    balance,
    bet,
  };
}

export const isBroke = (state: State): boolean => state.phase === 'over' && state.balance === 0;

/** FUN_0040d690: a click on a payline column, between hands, if the balance covers it. */
export function setBet(state: State, bet: number): State | null {
  if (state.balance === 0 || state.phase === 'draw' || bet > state.balance) return null;
  return { ...state, bet };
}
