import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/shell/cards/cards.ts';
import {
  canClaim,
  canMove,
  canUndo,
  claim,
  deal,
  foundationFor,
  isWon,
  move,
  undo,
  type State,
} from '../src/games/siege/logic.ts';

const c = (rank: number, suit: number): Card => ({ rank, suit });
const state = (piles: Card[][]): State => ({ piles, playing: true, last: null, claimed: false });
const empty = (): Card[][] => Array.from({ length: 12 }, () => []);

test('the deal: aces on their foundations and six cards per wing pile, or seven in the corners', () => {
  const placed = deal(true, Math.random);
  for (let suit = 0; suit < 4; suit++) assert.deepEqual(placed.piles[suit], [c(1, suit)]);
  assert.deepEqual(
    placed.piles.slice(4).map((p) => p.length),
    Array(8).fill(6),
  );
  const tableau = deal(false, Math.random);
  assert.deepEqual(
    tableau.piles.map((p) => p.length),
    [0, 0, 0, 0, 7, 6, 6, 7, 7, 6, 6, 7],
  );
});

test('wings take a card one rank lower, of any suit; empty wings take anything', () => {
  const piles = empty();
  piles[4] = [c(9, 0)];
  piles[5] = [c(10, 3)];
  piles[6] = [c(8, 1)];
  const s = state(piles);
  assert.ok(canMove(s, 4, 5));
  assert.ok(!canMove(s, 4, 6));
  assert.ok(canMove(s, 4, 8), 'empty pile');
  assert.ok(!canMove(s, 4, 4));
  assert.ok(!canMove(s, 0, 4), 'nothing leaves a foundation');
});

test('foundations take an ace, then the next card of their suit', () => {
  const piles = empty();
  piles[4] = [c(1, 2)];
  piles[5] = [c(2, 2)];
  piles[6] = [c(2, 1)];
  let s = state(piles);
  assert.ok(canMove(s, 4, 0));
  assert.ok(!canMove(s, 5, 0));
  s = move(s, 4, 0);
  assert.ok(canMove(s, 5, 0));
  assert.ok(!canMove(s, 6, 0), 'another suit');
});

test('a double-click sends a card to its suit, or an ace to the first empty foundation', () => {
  const piles = empty();
  piles[0] = [c(1, 0)];
  piles[4] = [c(2, 0)];
  piles[5] = [c(1, 3)];
  piles[6] = [c(5, 3)];
  const s = state(piles);
  assert.equal(foundationFor(s, 4), 0);
  assert.equal(foundationFor(s, 5), 1);
  assert.equal(foundationFor(s, 6), null);
});

test('undo takes the card back, except from the first foundation (the original treats pile 0 as none)', () => {
  const piles = empty();
  piles[4] = [c(9, 0)];
  piles[5] = [c(10, 3)];
  piles[1] = [c(1, 1)];
  piles[6] = [c(2, 1)];
  const s0 = state(piles);
  const s1 = move(s0, 4, 5);
  assert.ok(canUndo(s1));
  assert.deepEqual(undo(s1).piles, s0.piles);
  assert.ok(!canUndo(undo(s1)));
  assert.ok(canUndo(move(s0, 6, 1)));
  const toClubs = state([[c(1, 0)], [], [], [], [c(2, 0)], [c(5, 1)], [], [], [], [], [], []]);
  assert.ok(!canUndo(move(toClubs, 4, 0)));
});

test('the game is won when the wings are empty, and can be claimed when they are in order', () => {
  const piles = empty();
  piles[0] = [c(1, 0)];
  piles[4] = [c(2, 0)];
  const won = move(state(piles), 4, 0);
  assert.ok(isWon(won));
  assert.ok(!won.playing);
  const ordered = empty();
  ordered[4] = [c(13, 0), c(9, 1), c(9, 2), c(2, 3)];
  ordered[5] = [c(5, 0), c(6, 1)];
  assert.ok(!canClaim(state(ordered)));
  ordered[5] = [c(6, 1), c(5, 0)];
  const s = state(ordered);
  assert.ok(canClaim(s));
  const claimed = claim(s);
  assert.ok(!claimed.playing);
  assert.ok(!canClaim(claimed), 'claimed once');
});
