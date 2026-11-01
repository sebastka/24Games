// Playing cards, as the card games of the CD model them (the card class each game links in:
// FUN_00402540 builds a card, FUN_004041be a deck, FUN_004043b6 shuffles it in pokergrd.exe).
// Pure: no DOM.

/** Card size in pixels. */
export const CARD_W = 71;
export const CARD_H = 96;

/** Suits, in the order of the pip bitmaps: clubs, spades (black), diamonds, hearts (red). */
export const Suit = { Clubs: 0, Spades: 1, Diamonds: 2, Hearts: 3 } as const;

/** Ranks 1 (ace) to 13 (king); the two jokers have their own ranks. */
export const Rank = { Ace: 1, Jack: 11, Queen: 12, King: 13, Joker: 15, BlackJoker: 16 } as const;

export interface Card {
  rank: number;
  suit: number;
}

/** A random number in [0, 1), injectable so that tests are deterministic. */
export type Random = () => number;

export const isRed = (card: Card): boolean => card.suit >= Suit.Diamonds;
export const isJoker = (card: Card): boolean => card.rank >= Rank.Joker;
export const sameCard = (a: Card, b: Card): boolean => a.rank === b.rank && a.suit === b.suit;

/**
 * A new deck in the original order: clubs, spades, diamonds, hearts, each from ace to king; then,
 * with `jokers`, the two jokers.
 */
export function newDeck(jokers = false): Card[] {
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });
  }
  if (jokers) deck.push({ rank: Rank.Joker, suit: 0 }, { rank: Rank.BlackJoker, suit: 0 });
  return deck;
}

/** The original's shuffle: each position in turn swapped with a random one (rand() % n). */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = 0; i < out.length; i++) {
    const j = Math.floor(random() * out.length);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const RANK_NAMES = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const COURT = ['Jack', 'Queen', 'King'];
const SUIT_NAMES = ['Clubs', 'Spades', 'Diamonds', 'Hearts'];

/** "Queen of Hearts", "Joker": for screen readers. */
export function cardName(card: Card): string {
  if (isJoker(card)) return 'Joker';
  const rank = card.rank <= 10 ? RANK_NAMES[card.rank] : COURT[card.rank - 11];
  return `${rank} of ${SUIT_NAMES[card.suit]}`;
}
