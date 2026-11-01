// The poker hand evaluator linked into Poker Patience and Poker Machine (FUN_0040441e and its
// helpers FUN_004046c6 … FUN_00404a48 in pokergrd.exe), wild cards included. Pure: no DOM.
import { Rank, type Card } from './cards.ts';

/** Hands, in the original's numbering (FUN_00404b0e names them). */
export const Hand = {
  Nothing: 0,
  Pair: 1,
  JacksOrBetter: 2,
  KingsOrBetter: 3,
  TwoPair: 4,
  Flush: 5,
  ThreeOfAKind: 6,
  Straight: 7,
  FullHouse: 8,
  FourOfAKind: 9,
  StraightFlush: 10,
  RoyalFlush: 11,
  FiveOfAKind: 12,
  FourWildCards: 13,
  NaturalRoyalFlush: 14,
} as const;

export const HAND_NAMES = [
  'Nothing',
  'Pair',
  'Pair (Jacks or better)',
  'Pair (Kings or better)',
  'Two Pair',
  'Flush',
  'Three of a Kind',
  'Straight',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
  'Five of a Kind',
  'Four Wild Cards',
  'Royal Flush (No Wilds)',
];

/** Largest number of real cards of one rank (FUN_00404768); `sorted` is by rank. */
function largestGroup(sorted: readonly number[]): number {
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1] === sorted[i]) run++;
    else {
      best = Math.max(best, run);
      run = 1;
    }
  }
  return Math.max(best, run);
}

/** No two real cards of a rank, and all of them within five ranks (FUN_00404821). */
function straight(sorted: readonly number[]): boolean {
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1] === sorted[i]) return false;
  return sorted.at(-1)! - sorted[0]! < 5;
}

/** A straight up to the ace, aces counted high (FUN_004048ae): ten to ace, wilds filling in. */
function highStraight(ranks: readonly number[], wilds: number): boolean {
  const sorted = ranks.map((r) => (r === Rank.Ace ? 14 : r)).sort((a, b) => a - b);
  return straight(sorted) && sorted.at(-1)! + wilds >= 14;
}

/** What a test of `matches` needs to know about five cards. */
function analyse(cards: readonly Card[], wild: (card: Card) => boolean) {
  const real = cards.filter((c) => !wild(c));
  const ranks = real.map((c) => c.rank).sort((a, b) => a - b);
  const wilds = cards.length - real.length;
  const count = (rank: number) => ranks.filter((r) => r === rank).length;
  // A pair of `a` or `b`: two of them, or one and a single wild card.
  const pairOf = (a: number, b: number) =>
    wilds === 1 ? count(a) === 1 || count(b) === 1 : count(a) === 2 || count(b) === 2;
  return {
    real,
    ranks,
    wilds,
    suited: real.every((c) => c.suit === real[0]!.suit),
    group: largestGroup(ranks) + wilds,
    anyStraight: () => straight(ranks) || highStraight(ranks, wilds),
    pairOf,
  };
}

/**
 * Whether five cards make `hand`, each hand tested on its own (the tests of FUN_0040441e, which
 * Poker Machine also runs one by one on its paylines, FUN_0040b300): three of a kind is exactly
 * three alike, jacks or better includes kings and aces…
 */
export function matches(hand: number, cards: readonly Card[], wild: (card: Card) => boolean = () => false): boolean {
  const h = analyse(cards, wild);
  switch (hand) {
    case Hand.NaturalRoyalFlush:
      return h.wilds === 0 && h.suited && highStraight(h.ranks, 0);
    case Hand.FourWildCards:
      return h.real.length <= 1;
    case Hand.FiveOfAKind:
      return h.group === 5;
    case Hand.RoyalFlush:
      return h.suited && highStraight(h.ranks, h.wilds);
    case Hand.StraightFlush:
      return h.suited && h.anyStraight();
    case Hand.FourOfAKind:
      return h.group === 4;
    case Hand.FullHouse:
      return fullHouse(h.ranks, h.wilds);
    case Hand.Flush:
      return h.suited;
    case Hand.Straight:
      return h.anyStraight();
    case Hand.ThreeOfAKind:
      return h.group === 3;
    case Hand.TwoPair:
      return h.wilds === 0 && twoPair(h.ranks);
    case Hand.KingsOrBetter:
      return h.pairOf(Rank.King, Rank.Ace);
    case Hand.JacksOrBetter:
      return h.pairOf(Rank.King, Rank.Ace) || h.pairOf(Rank.Jack, Rank.Queen);
    case Hand.Pair:
      return h.group === 2;
    default:
      return false;
  }
}

/** The order FUN_0040441e tries the hands in. */
const ORDER = [
  Hand.NaturalRoyalFlush,
  Hand.FourWildCards,
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
  Hand.JacksOrBetter,
  Hand.Pair,
];

/**
 * The best hand of five cards, `wild` telling which cards are wild (jokers, deuces); they are
 * left out and stand for whatever helps.
 */
export function evaluate(cards: readonly Card[], wild: (card: Card) => boolean = () => false): number {
  return ORDER.find((hand) => matches(hand, cards, wild)) ?? Hand.Nothing;
}

/** FUN_004047aa: three and two, or two pairs and a wild card. */
function fullHouse(r: readonly number[], wilds: number): boolean {
  if (wilds === 1) return r[0] === r[1] && r[2] === r[3];
  if (wilds === 0) return r[0] === r[1] && r[3] === r[4] && (r[1] === r[2] || r[2] === r[3]);
  return false;
}

/** FUN_004049dc, five real cards. */
function twoPair(r: readonly number[]): boolean {
  return (r[0] === r[1] && (r[2] === r[3] || r[3] === r[4])) || (r[1] === r[2] && r[3] === r[4]);
}
