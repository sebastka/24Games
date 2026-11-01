import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMove, cell, isOver, KEYS, maxDigit, move, newGame, type State } from '../src/games/voracity/logic.ts';

/** A board from rows of digits (the target at its '0'). */
function board(rows: string[], score = 0): State {
  const size = rows.length;
  const cells = Array<number>(size * size).fill(0);
  let x = 0;
  let y = 0;
  rows.forEach((row, r) =>
    [...row].forEach((c, col) => {
      cells[col * size + r] = c === '.' ? 0 : Number(c);
      if (c === '0') [x, y] = [col, r];
    }),
  );
  return { size, cells, x, y, score };
}

test('new boards: digits up to a third of the side, the target on an eaten square', () => {
  assert.deepEqual(
    [15, 19, 22, 25].map((n) => maxDigit(n)),
    [5, 7, 8, 9],
  );
  const s = newGame(19, () => 0.999);
  assert.equal(s.cells.filter((c) => c === 7).length, 19 * 19 - 1);
  assert.equal(cell(s, s.x, s.y), 0);
  assert.deepEqual([s.x, s.y], [18, 18]);
});

test('a move eats the squares crossed and scores their number', () => {
  const s = board(['0411', '2111', '1111', '1111']);
  assert.ok(!canMove(s, 1, 0), '4 to the right would leave the board');
  assert.ok(canMove(s, 0, 1));
  const m = move(s, 0, 1);
  // Two squares down: (0,0) and (0,1) eaten, the target on (0,2).
  assert.deepEqual([m.x, m.y], [0, 2]);
  assert.equal(m.score, 2);
  assert.equal(cell(m, 0, 1), 0);
  assert.equal(cell(m, 0, 2), 1, 'the landing square keeps its digit until the target leaves');
  const n = move(m, 1, 0);
  assert.equal(cell(n, 0, 2), 0);
  assert.deepEqual([n.x, n.y], [1, 2]);
});

test('no move across an eaten square', () => {
  const s = board(['03.1', '1111', '1111', '1111']);
  assert.ok(!canMove(s, 1, 0));
  assert.ok(canMove(s, 1, 1));
});

test('the game ends when no direction is open', () => {
  const s = board(['0.', '..']);
  assert.ok(isOver(s));
  assert.ok(!isOver(board(['01', '..'])));
});

test('the numeric keypad and the arrows', () => {
  assert.deepEqual(KEYS['8'], [0, -1]);
  assert.deepEqual(KEYS['1'], [-1, 1]);
  assert.deepEqual(KEYS.ArrowRight, [1, 0]);
});
