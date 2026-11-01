import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flip,
  isSolved,
  origin,
  perfectScore,
  perfectText,
  solve,
  squareAt,
  start,
  tableOf,
} from '../src/games/quinto/logic.ts';

test('a click changes the piece and the four next to it, within the board', () => {
  const s = flip(start(5, 5), 0, 0);
  assert.equal(s.moves, 1);
  assert.deepEqual(
    [0, 1, 5, 6].map((i) => s.pieces[i]),
    [false, false, false, true],
  );
  const centre = flip(start(5, 5), 2, 2);
  assert.equal(centre.pieces.filter((p) => !p).length, 5);
  assert.ok(centre.active);
});

test('every board size can be solved; solving ends the game', () => {
  for (let w = 5; w <= 8; w++) {
    for (let h = 5; h <= 8; h++) {
      const presses = solve(w, h);
      assert.ok(presses, `${w}x${h}`);
      let s = start(w, h);
      presses.forEach((p, i) => {
        if (p) s = flip(s, i % w, Math.floor(i / w));
      });
      assert.ok(isSolved(s), `${w}x${h}`);
      assert.ok(!s.active);
    }
  }
});

test('the perfect score of 5×5 is 15, and is reached', () => {
  assert.equal(perfectScore(5, 5), 15);
  assert.equal(solve(5, 5)!.filter(Boolean).length, 15);
  let s = start(5, 5);
  solve(5, 5)!.forEach((p, i) => {
    if (p) s = flip(s, i % 5, Math.floor(i / 5));
  });
  assert.equal(perfectText(s), 'Perfect Score!');
  assert.equal(perfectText({ ...s, moves: 16 }), 'Perfect Score : 15');
});

test("the original's perfect score of 7×8 (32) can be beaten", () => {
  assert.equal(perfectScore(7, 8), 32);
  assert.ok(solve(7, 8)!.filter(Boolean).length < 32);
});

test('high score tables by number of squares; squares by position', () => {
  assert.equal(tableOf(5, 8), tableOf(8, 5));
  assert.deepEqual([tableOf(5, 5), tableOf(6, 6), tableOf(5, 8), tableOf(8, 8)], [0, 4, 3, 9]);
  assert.deepEqual(origin({ width: 5, height: 5 }), { x: 71, y: 71 });
  assert.deepEqual(squareAt({ width: 5, height: 5 }, 71, 111), { col: 0, row: 1 });
  assert.equal(squareAt({ width: 5, height: 5 }, 70, 100), null);
  assert.equal(squareAt({ width: 5, height: 5 }, 271, 100), null);
});
