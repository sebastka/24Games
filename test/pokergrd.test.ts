import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Suit, type Card } from '../src/shell/cards/cards.ts';
import { Hand } from '../src/shell/cards/poker.ts';
import {
  deal,
  isOver,
  lineHand,
  place,
  placeSelected,
  points,
  score,
  tableOf,
  type State,
} from '../src/games/pokergrd/logic.ts';

test('dealing into one pile of 52 or two of 26', () => {
  const one = deal({ twoPiles: false, faceUp: false }, Math.random);
  assert.equal(one.piles.length, 1);
  assert.equal(one.piles[0]!.length, 52);
  const two = deal({ twoPiles: true, faceUp: true }, Math.random);
  assert.deepEqual(
    two.piles.map((p) => p.length),
    [26, 26],
  );
  assert.equal(two.grid.filter((c) => c).length, 0);
  assert.equal(two.selected, 0);
});

test('placing takes the top card of a pile into an empty cell only', () => {
  const s0 = deal({ twoPiles: true, faceUp: false }, Math.random);
  const top = s0.piles[1]![0];
  const s1 = place(s0, 1, 7);
  assert.equal(s1.grid[7], top);
  assert.equal(s1.piles[1]!.length, 25);
  assert.equal(s1.piles[0]!.length, 26);
  assert.equal(place(s1, 0, 7), s1, 'a full cell takes nothing');
  const s2 = placeSelected({ ...s1, selected: 0 }, 0);
  assert.equal(s2.grid[0], s0.piles[0]![0]);
});

test('the game ends when the 25 cells are full', () => {
  let s: State = deal({ twoPiles: false, faceUp: false }, Math.random);
  for (let cell = 0; cell < 25; cell++) {
    assert.ok(!isOver(s));
    s = placeSelected(s, cell);
  }
  assert.ok(isOver(s));
  assert.equal(s.piles[0]!.length, 27);
});

test('English scoring, pairs of any rank alike', () => {
  const { Clubs: C, Hearts: H, Spades: S } = Suit;
  const kings: Card[] = [
    { rank: 13, suit: C },
    { rank: 13, suit: H },
    { rank: 2, suit: S },
    { rank: 5, suit: S },
    { rank: 9, suit: S },
  ];
  assert.equal(lineHand(kings), Hand.Pair);
  const royal: Card[] = [10, 11, 12, 13, 1].map((rank) => ({ rank, suit: S }));
  assert.equal(lineHand(royal), Hand.RoyalFlush);
  assert.deepEqual(
    [Hand.Pair, Hand.TwoPair, Hand.Flush, Hand.ThreeOfAKind, Hand.FullHouse, Hand.Straight, Hand.FourOfAKind].map(
      points,
    ),
    [1, 3, 5, 6, 10, 12, 16],
  );
  assert.equal(points(Hand.StraightFlush), 30);
  assert.equal(points(Hand.RoyalFlush), 30);
  assert.equal(points(Hand.Nothing), 0);
});

test('a grid scores its rows and its columns', () => {
  // Rows 0-3 are one suit each, with the same ranks: four of a kind in every column; row 4 is
  // a fifth flush, of other ranks.
  const grid: Card[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) grid.push({ rank: [2, 5, 8, 11, 13][c]!, suit: r });
  for (const rank of [3, 6, 9, 12, 1]) grid.push({ rank, suit: Suit.Clubs });
  const s: State = { grid, piles: [[]], selected: 0 };
  const result = score(s);
  assert.deepEqual(
    result.rows.map((l) => l.hand),
    Array(5).fill(Hand.Flush),
  );
  assert.deepEqual(
    result.columns.map((l) => l.hand),
    Array(5).fill(Hand.FourOfAKind),
  );
  assert.equal(result.total, 5 * 5 + 5 * 16);
});

test('one high score table per variant', () => {
  assert.equal(tableOf({ twoPiles: false, faceUp: false }), 0);
  assert.equal(tableOf({ twoPiles: true, faceUp: false }), 1);
  assert.equal(tableOf({ twoPiles: false, faceUp: true }), 2);
  assert.equal(tableOf({ twoPiles: true, faceUp: true }), 3);
});
