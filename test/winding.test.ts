import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  board,
  computerMove,
  computerPlacement,
  draggable,
  isFirstStretch,
  moveComputer,
  movePlayer,
  nimMove,
  PATH,
  placeComputer,
  playerCanMove,
  start,
  stretches,
  targets,
  type State,
} from '../src/games/winding/logic.ts';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

/** A position with the pieces on the given squares. */
const position = (player: number[], computer: number[]): State => ({ player, computer });

test('the path is a closed loop of 64 neighbouring squares', () => {
  assert.equal(PATH.length, 64);
  assert.equal(new Set(PATH.map(([x, y]) => `${x},${y}`)).size, 64);
  PATH.forEach(([x, y], i) => {
    const [nx, ny] = PATH[(i + 1) % 64]!;
    assert.equal(Math.abs(nx - x) + Math.abs(ny - y), 1, `square ${i}`);
  });
  assert.ok(isFirstStretch(0) && isFirstStretch(49) && !isFirstStretch(8) && !isFirstStretch(63));
});

test('placing: two pieces in each of the stretches of the side', () => {
  const s0 = start();
  assert.deepEqual(draggable(s0), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(targets(s0, 0, true).length, 32);
  assert.equal(targets(s0, 0, false).length, 32);
  assert.ok(targets(s0, 0, false).includes(63));
  const s1 = movePlayer(movePlayer(s0, 0, 0), 1, 5);
  // The first stretch (0-7) is full: none of its squares is offered any more.
  assert.ok(!targets(s1, 2, true).some((i) => i <= 7));
  assert.deepEqual(draggable(s1), [2, 3, 4, 5, 6, 7]);
});

test('the computer places its n-th piece in its stretch n / 2, at random', () => {
  let s = start();
  s = placeComputer(
    s,
    computerPlacement(s, true, () => 0),
  );
  assert.equal(s.computer[0], 8);
  // A square of its own is drawn again.
  s = placeComputer(s, computerPlacement(s, true, seq(0, 0.99)));
  assert.equal(s.computer[1], 13);
  assert.equal(
    computerPlacement(s, true, () => 0),
    22,
  );
  assert.deepEqual(stretches(false)[3], [50, 63]);
});

test('moving: any number of free squares either way, over no piece', () => {
  const s = position([10, 11, 30, 31, 40, 41, 60, 61], [20, 21, 0, 1, 2, 3, 50, 51]);
  assert.deepEqual(
    targets(s, 1, true).sort((a, b) => a - b),
    [12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.deepEqual(targets(s, 0, true), [9, 8, 7, 6, 5, 4]);
  assert.ok(playerCanMove(s));
});

test('the player is stuck when every piece is blocked on both sides', () => {
  // Pairs of each side, touching: 11 22 11 22 … all around (with one gap between computer pieces).
  const player = [0, 1, 4, 5, 8, 9, 12, 13];
  const computer = [2, 3, 6, 7, 10, 11, 14, 63];
  const s = position(player, computer);
  assert.ok(!playerCanMove(s));
});

test('nim on the gaps: a winning move at the skill percentage, otherwise any', () => {
  // Gaps 3 and 1: nim-sum 2; the winning moves bring the 3 down to 1.
  const gaps = [3, 1, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(nimMove(gaps, 40, seq(0.1, 0)), [0, 2]);
  // Missed the roll (rand % 100 above 40): any move, here the first listed (gap 0 by 3).
  assert.deepEqual(nimMove(gaps, 40, seq(0.5, 0)), [0, 3]);
  // A zero nim-sum: any move, without rolling for the percentage.
  assert.deepEqual(nimMove([2, 2, 0, 0, 0, 0, 0, 0], 99, seq(0.99)), [1, 1]);
  assert.deepEqual(nimMove([0, 0, 0, 0, 0, 0, 0, 0], 99, seq(0.5)), [0, 0]);
});

test("the computer's move: a computer piece towards the player's, by the nim move", () => {
  // 1 1 at 0-1, gap of 3, 2 2 at 5-6, then everything else packed except one gap of 1.
  const s = position([0, 1, 9, 10, 17, 18, 25, 26], [5, 6, 13, 14, 21, 22, 29, 30]);
  const b = board(s);
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const m = computerMove(s, 4, seq(0, r));
    assert.ok(typeof m === 'object');
    assert.equal(b[m.from], '2');
    assert.equal(b[m.to], '0');
    const after = moveComputer(s, m.from, m.to);
    assert.equal(board(after).filter((c) => c === '2').length, 8);
  }
});

test('with every gap between sides closed, Difficult resigns and Easy shuffles or is stuck', () => {
  // The free squares are all inside the pairs: 1 … 1 2 … 2 around the loop.
  const closed = position([0, 8, 17, 24, 33, 40, 49, 56], [9, 16, 25, 32, 41, 48, 57, 63]);
  assert.equal(computerMove(closed, 3, Math.random), 'resign');
  assert.equal(computerMove(closed, 4, Math.random), 'resign');
  // Easy: the first computer piece that can move (backwards first) slides as far as it goes.
  assert.deepEqual(computerMove(closed, 1, Math.random), { from: 9, to: 15 });
  // The computer's pairs touching, every free square between the player's pieces: stuck.
  const blocks = [0, 16, 32, 48];
  const stuck = position(
    blocks.flatMap((b) => [b, b + 13]),
    blocks.flatMap((b) => [b + 14, b + 15]),
  );
  assert.equal(computerMove(stuck, 2, Math.random), 'stuck');
  assert.equal(computerMove(stuck, 4, Math.random), 'resign');
});
