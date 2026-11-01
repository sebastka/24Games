import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Card } from '../src/shell/cards/cards.ts';
import {
  canMove,
  canUndo,
  caption,
  deal,
  dealFromStock,
  foundationFor,
  isWon,
  move,
  undo,
  type State,
} from '../src/games/vcross/logic.ts';

const c = (rank: number, suit: number): Card => ({ rank, suit });
const empty = (): Card[][] => Array.from({ length: 11 }, () => []);
const state = (piles: Card[][], base: number | null = null): State => ({ piles, base, playing: true, last: null });

test('the deal: five cards in the cross, the base on the first foundation, the rest in the stock', () => {
  const s = deal(true, Math.random);
  assert.deepEqual(
    s.piles.map((p) => p.length),
    [46, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1],
  );
  assert.equal(s.base, s.piles[2]![0]!.rank);
  const free = deal(false, Math.random);
  assert.equal(free.base, null);
  assert.equal(free.piles[0]!.length, 47);
});

test('the stock turns over onto the waste; undo puts the card back', () => {
  const s0 = deal(true, Math.random);
  const s1 = dealFromStock(s0);
  assert.deepEqual(s1.piles[1], [s0.piles[0]!.at(-1)]);
  assert.equal(s1.piles[0]!.length, 45);
  assert.ok(canUndo(s1));
  assert.deepEqual(undo(s1).piles, s0.piles);
});

test('the cross builds down regardless of suit, a king on an ace', () => {
  const piles = empty();
  piles[1] = [c(7, 0)];
  piles[6] = [c(8, 3)];
  piles[7] = [c(9, 3)];
  piles[9] = [c(1, 2)];
  piles[10] = [c(13, 1)];
  const s = state(piles, 5);
  assert.ok(canMove(s, 1, 6));
  assert.ok(!canMove(s, 1, 7));
  assert.ok(canMove(s, 1, 8), 'empty cross pile');
  assert.ok(canMove(s, 10, 9), 'king on ace');
  assert.ok(!canMove(s, 9, 10), 'not an ace on a king');
});

test('foundations: the base rank, then up in suit, an ace after a king', () => {
  const piles = empty();
  piles[1] = [c(5, 2)];
  piles[6] = [c(1, 3)];
  piles[7] = [c(6, 2)];
  piles[3] = [c(13, 3)];
  const s = state(piles, 5);
  assert.ok(canMove(s, 1, 2), 'the base rank on an empty foundation');
  assert.ok(!canMove(s, 7, 2));
  assert.ok(canMove(s, 6, 3), 'ace on king');
  assert.ok(canMove(move(s, 1, 2), 7, 2));
  // Building on values you select: any card of a suit not yet on a foundation.
  const free = state(piles, null);
  assert.ok(canMove(free, 7, 2));
  assert.ok(!canMove(free, 6, 2), 'hearts are on a foundation already');
});

test('a double-click goes to an empty foundation first, then to the suit', () => {
  const piles = empty();
  piles[1] = [c(5, 2)];
  piles[6] = [c(1, 3)];
  piles[3] = [c(13, 3)];
  const s = state(piles, 5);
  assert.equal(foundationFor(s, 1), 2);
  assert.equal(foundationFor(s, 6), 3);
  assert.equal(foundationFor(state(piles, 9), 1), null);
});

test('the game is won when only the foundations hold cards', () => {
  const piles = empty();
  piles[2] = [c(5, 0)];
  piles[1] = [c(6, 0)];
  const s = move(state(piles, 5), 1, 2);
  assert.ok(isWon(s));
  assert.ok(!s.playing);
  assert.ok(!canUndo(s));
});

test('the caption names the base rank', () => {
  assert.deepEqual(caption(2), ['Building', 'on Deuces']);
  assert.deepEqual(caption(6), ['Building', 'on Sixes']);
  assert.deepEqual(caption(12), ['Building', 'on Queens']);
});
