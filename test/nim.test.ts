import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computerMove,
  computerText,
  DEFAULT_PILES,
  endLines,
  isOver,
  isZero,
  selectionText,
  take,
} from '../src/games/nim/logic.ts';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

test('take removes pieces from one row', () => {
  assert.deepEqual(take(DEFAULT_PILES, { row: 5, count: 3 }), [2, 3, 4, 5, 6, 4]);
});

test('end of game: no piece left, or a single piece left when it must be left', () => {
  assert.ok(isOver([0, 0, 0, 0, 0, 0], true));
  assert.ok(!isOver([0, 0, 1, 0, 0, 0], true));
  assert.ok(isOver([0, 0, 1, 0, 0, 0], false));
  assert.ok(!isOver([0, 1, 1, 0, 0, 0], false));
  assert.ok(!isOver([0, 0, 2, 0, 0, 0], false));
  // Taking everything in "Leave the Last Piece" goes unnoticed, as in the original.
  assert.ok(!isOver([0, 0, 0, 0, 0, 0], false));
});

test('nim-sum', () => {
  assert.ok(isZero([1, 2, 3, 0, 0, 0]));
  assert.ok(!isZero(DEFAULT_PILES));
});

test('the computer leaves a nim-sum of 0, at random among such moves', () => {
  // 2^3^4^5^6^7 = 1: the winning moves take one piece from B (3), D (5) or F (7).
  const winning = [0, 0.5, 0.9].map((r) => computerMove(DEFAULT_PILES, true, () => r));
  assert.deepEqual(winning, [
    { row: 1, count: 1 },
    { row: 3, count: 1 },
    { row: 5, count: 1 },
  ]);
  for (const m of winning) assert.ok(isZero(take(DEFAULT_PILES, m)));
});

test('in a lost position, any move at random', () => {
  // [1, 2, 3]: moves A1, B2, B1, C3, C2, C1.
  assert.deepEqual(computerMove([1, 2, 3, 0, 0, 0], true, seq(0)), { row: 0, count: 1 });
  assert.deepEqual(computerMove([1, 2, 3, 0, 0, 0], true, seq(0.99)), { row: 2, count: 1 });
  assert.deepEqual(computerMove([1, 2, 3, 0, 0, 0], true, seq(0.2)), { row: 1, count: 2 });
});

test('leaving the last piece: with one row of several pieces, leave an odd number of single pieces', () => {
  // Two single rows and a big one (3 non-empty rows): leave one in the big row, three in all.
  assert.deepEqual(computerMove([1, 1, 5, 0, 0, 0], false, seq(0)), { row: 2, count: 4 });
  assert.deepEqual(computerMove([1, 0, 5, 0, 0, 0], false, seq(0)), { row: 2, count: 5 });
  // Otherwise the plain strategy.
  assert.deepEqual(computerMove([0, 0, 0, 0, 3, 3], false, seq(0)), computerMove([0, 0, 0, 0, 3, 3], true, seq(0)));
});

test('with nothing left, the computer "takes 0 pieces from row A"', () => {
  const m = computerMove([0, 0, 0, 0, 0, 0], false, seq(0.5));
  assert.deepEqual(m, { row: 0, count: 0 });
  assert.equal(computerText(m), 'Computer takes 0 piece from row A');
});

test('status line and end texts', () => {
  assert.equal(selectionText(false, null), 'Press F2 to begin a new game');
  assert.equal(selectionText(true, null), 'Choose the pieces to take & press ENTER');
  assert.equal(selectionText(true, { row: 1, count: 1 }), 'Take 1 piece from row B');
  assert.equal(selectionText(true, { row: 5, count: 3 }), 'Take 3 pieces from row F');
  assert.deepEqual(endLines('player', true), ['You took', 'the last piece!']);
  assert.deepEqual(endLines('computer', false), ['I forced you to', 'take the last piece!']);
});
