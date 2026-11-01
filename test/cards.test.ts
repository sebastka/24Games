import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardName, newDeck, Rank, shuffle, Suit, type Card } from '../src/shell/cards/cards.ts';
import { evaluate, Hand, HAND_NAMES } from '../src/shell/cards/poker.ts';
import { insertScore, placeOf, type ScoreEntry } from '../src/shell/cards/scores.ts';

const { Clubs: C, Spades: S, Diamonds: D, Hearts: H } = Suit;
/** "10H", "AS", "KD", "2C", "JK" (joker)… */
function cards(text: string): Card[] {
  return text.split(' ').map((t) => {
    if (t === 'JK') return { rank: Rank.Joker, suit: 0 };
    const rank = { A: 1, J: 11, Q: 12, K: 13 }[t.slice(0, -1)] ?? Number(t.slice(0, -1));
    return { rank, suit: { C, S, D, H }[t.at(-1) as 'C']! };
  });
}
const jokers = (c: Card) => c.rank >= Rank.Joker;
const deuces = (c: Card) => c.rank === 2;

test('a deck in the original order, shuffled by swapping each card with a random one', () => {
  const deck = newDeck();
  assert.equal(deck.length, 52);
  assert.deepEqual(deck[0], { rank: 1, suit: C });
  assert.deepEqual(deck[13], { rank: 1, suit: S });
  assert.deepEqual(deck[51], { rank: 13, suit: H });
  assert.equal(newDeck(true).length, 54);
  // random() = 0 swaps every card with the first one: the deck rotates by one.
  const rotated = shuffle(deck, () => 0);
  assert.deepEqual(rotated[0], deck[51]);
  assert.deepEqual(rotated[1], deck[0]);
  assert.equal(new Set(shuffle(deck, Math.random).map(cardName)).size, 52);
  assert.equal(cardName({ rank: 12, suit: H }), 'Queen of Hearts');
});

test('natural hands', () => {
  const cases: [string, number][] = [
    ['2C 5D 9H JS KC', Hand.Nothing],
    ['2C 2D 9H JS KC', Hand.Pair],
    ['JC JD 9H 3S KC', Hand.JacksOrBetter],
    ['QC QD 9H 3S 4C', Hand.JacksOrBetter],
    ['KC KD 9H 3S 4C', Hand.KingsOrBetter],
    ['AC AD 9H 3S 4C', Hand.KingsOrBetter],
    ['2C 2D 9H 9S KC', Hand.TwoPair],
    ['2C 3D 3H 9S 9C', Hand.TwoPair],
    ['2C 2D 2H 9S KC', Hand.ThreeOfAKind],
    ['AC 2D 3H 4S 5C', Hand.Straight],
    ['10C JD QH KS AC', Hand.Straight],
    ['9C 10D JH QS KC', Hand.Straight],
    ['JC QD KH AS 2C', Hand.Nothing],
    ['2H 7H 9H JH KH', Hand.Flush],
    ['2C 2D 2H 9S 9C', Hand.FullHouse],
    ['2C 2D 9H 9S 9C', Hand.FullHouse],
    ['2C 2D 2H 2S 9C', Hand.FourOfAKind],
    ['5S 6S 7S 8S 9S', Hand.StraightFlush],
    ['AS 2S 3S 4S 5S', Hand.StraightFlush],
    ['10S JS QS KS AS', Hand.NaturalRoyalFlush],
  ];
  for (const [hand, expected] of cases) assert.equal(HAND_NAMES[evaluate(cards(hand))], HAND_NAMES[expected], hand);
});

test('hands with wild cards', () => {
  const cases: [string, (c: Card) => boolean, number][] = [
    ['JK 5D 9H JS 3C', jokers, Hand.JacksOrBetter],
    ['JK 5D 9H KS 3C', jokers, Hand.KingsOrBetter],
    ['JK 5D 9H 7S 3C', jokers, Hand.Pair],
    ['JK 5D 5H 7S 3C', jokers, Hand.ThreeOfAKind],
    ['JK 5D 5H 7S 7C', jokers, Hand.FullHouse],
    ['JK 4D 5H 7S 8C', jokers, Hand.Straight],
    ['JK JS QS KS AS', jokers, Hand.RoyalFlush],
    // The original's quirk: the wild card counts both for the missing jack and above the king.
    ['JK 9S QS KS 10S', jokers, Hand.RoyalFlush],
    ['JK 8S 9S 10S QS', jokers, Hand.StraightFlush],
    ['2C 2D 5S 5H 5C', deuces, Hand.FiveOfAKind],
    ['2C 2D 2S 2H 5C', deuces, Hand.FourWildCards],
    ['2C 2D 9S 7H 4C', deuces, Hand.ThreeOfAKind],
    ['2C 2D 9S 7H 5C', deuces, Hand.Straight],
    ['2C 2D 9S 9H 5C', deuces, Hand.FourOfAKind],
    ['2C 3H 9H 7H 5H', deuces, Hand.Flush],
  ];
  for (const [hand, wild, expected] of cases) {
    assert.equal(HAND_NAMES[evaluate(cards(hand), wild)], HAND_NAMES[expected], hand);
  }
});

test('high score tables: higher scores first, ties below, ten entries', () => {
  const table: ScoreEntry[] = [
    { name: 'a', score: 30 },
    { name: 'b', score: 20 },
  ];
  assert.equal(placeOf(table, 25), 1);
  assert.equal(placeOf(table, 20), 2, 'a tie goes below');
  assert.equal(placeOf([], 0), 0);
  assert.equal(placeOf(table, 25, true), 0, 'lower is better');
  const full = Array.from({ length: 10 }, (_, i) => ({ name: `${i}`, score: 100 - i }));
  assert.equal(placeOf(full, 91), null);
  const after = insertScore(full, 0, { name: 'top', score: 200 });
  assert.equal(after.length, 10);
  assert.equal(after[0]!.name, 'top');
  assert.equal(after[9]!.name, '8');
});
