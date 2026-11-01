import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAT,
  Cheese,
  detonate,
  EXTRA_LIFE,
  loseMouse,
  move,
  newGame,
  nextLevel,
  pounceTarget,
  step,
  type State,
} from '../src/games/cheesy/logic.ts';

/** A random function replaying `values` (then 0.5). */
const replay =
  (...values: number[]) =>
  () =>
    values.shift() ?? 0.5;
/** A random function that never places a gouda or a bomb. */
const plain = () => 0;

test('a new game: 7 x 5 cheddar, the mouse in the middle, 3 mice, 1 bomb, 10 points a slice', () => {
  const s = newGame(1, plain);
  assert.equal(s.cols, 7);
  assert.equal(s.rows, 5);
  assert.equal(s.level, 1);
  assert.deepEqual(s.mouse, { x: 3, y: 2 });
  assert.equal(s.cells[2 * 7 + 3], Cheese.None);
  assert.equal(s.cells.filter((c) => c === Cheese.Cheddar).length, 34);
  assert.equal(s.lives, 3);
  assert.equal(s.bombs, 1);
  assert.equal(s.cheeseValue, 10);
  assert.equal(s.catSpeed, 2);
  assert.equal(s.running, false);
});

test('gouda and bombs land on random cells (row, then column)', () => {
  // Four gouda tries (yes at (row 0, col 1), no, no, no), then a bomb at (row 4, col 6).
  const s = newGame(1, replay(0.9, 0, 1 / 7, 0, 0, 0, 0.9, 0.99, 0.99));
  assert.equal(s.cells[1], Cheese.Gouda);
  assert.equal(s.cells[4 * 7 + 6], Cheese.Bomb);
});

test('moving eats: cheddar scores, gouda raises the value, a bomb adds a bomb', () => {
  let s = newGame(1, plain);
  const cells = [...s.cells];
  cells[2 * 7 + 4] = Cheese.Gouda;
  cells[2 * 7 + 5] = Cheese.Bomb;
  s = { ...s, cells };
  let r = move(s, 'up');
  assert.deepEqual(r.sounds, ['Eat Cheese']);
  assert.equal(r.state.score, 10);
  assert.equal(r.state.running, true, 'the first move starts the cats');
  r = move(move(r.state, 'down').state, 'right');
  assert.deepEqual(r.sounds, ['Eat Gouda']);
  assert.equal(r.state.cheeseValue, 20);
  assert.equal(r.state.facing, 1);
  r = move(r.state, 'right');
  assert.deepEqual(r.sounds, ['Eat CheeseBomb']);
  assert.equal(r.state.bombs, 2);
});

test('the mouse cannot leave the board, nor step onto a cat', () => {
  const s = { ...newGame(0, plain), mouse: { x: 0, y: 0 } };
  assert.deepEqual(move(s, 'left').state.mouse, { x: 0, y: 0 });
  assert.equal(move(s, 'left').state.facing, 0);
  const cat = { x: 40 + 30, y: 0, vx: 0, vy: 0 };
  assert.deepEqual(move({ ...s, cats: [cat] }, 'right').state.mouse, { x: 0, y: 0 });
});

test('eating the last cheddar completes the level; the next one is worth more', () => {
  const s0 = newGame(0, plain);
  const cells = s0.cells.map((): number => Cheese.None);
  cells[1 * 5 + 3] = Cheese.Cheddar;
  const r = move({ ...s0, cells, running: true }, 'right');
  assert.equal(r.complete, true);
  assert.deepEqual(r.sounds, ['Eat Cheese', 'Level Complete']);
  assert.equal(r.state.running, false);
  const next = nextLevel(r.state, plain);
  assert.equal(next.level, 2);
  assert.equal(next.cheeseValue, 12);
  assert.equal(next.score, 10);
  assert.equal(next.cats.length, 0);
});

test('cats speed up from level 11, up to 10 pixels a tick', () => {
  let s: State = newGame(1, plain);
  const speeds = [];
  for (let level = 2; level <= 20; level++) {
    s = nextLevel(s, plain);
    speeds.push(s.catSpeed);
  }
  assert.deepEqual(speeds, [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10]);
});

test('an extra mouse every 20,000 points', () => {
  const s = { ...newGame(1, plain), score: EXTRA_LIFE - 10 };
  const r = move(s, 'up');
  assert.equal(r.state.lives, 4);
  assert.equal(r.state.nextLife, 2 * EXTRA_LIFE);
});

test('the bomb turns every cat back, once the cats run and while bombs last', () => {
  const s = { ...newGame(1, plain), cats: [{ x: 0, y: 0, vx: 2, vy: -3 }] };
  assert.deepEqual(detonate(s).sounds, ['Out of CheeseBombs']);
  const r = detonate({ ...s, running: true });
  assert.deepEqual(r.sounds, ['Detonate CheeseBomb']);
  assert.deepEqual(r.state.cats[0], { x: 0, y: 0, vx: -2, vy: 3 });
  assert.equal(r.state.bombs, 0);
  assert.deepEqual(detonate(r.state).sounds, ['Out of CheeseBombs']);
});

test('a cat enters from the chosen edge, straight in, then moves each tick', () => {
  const s = { ...newGame(1, plain), running: true };
  // Edge 0: above column 0; no speed-ups, no diagonal.
  const r = step(s, replay(0, 0.5, 0.5, 0.5, 0.5));
  assert.deepEqual(r.state.cats, [{ x: 2, y: 1 - CAT, vx: 0, vy: 2 }]);
  // Edge 2 × 7 + 5 = 19 is the right side of row 0 (7 + 7 + 5 rows): enters leftwards.
  const r2 = step(s, replay(19 / 24, 0.5, 0.5, 0.5, 0.5));
  assert.deepEqual(r2.state.cats, [{ x: 7 * 40 - 2, y: 2, vx: -2, vy: 0 }]);
  const r3 = step(r.state, replay(0, 0.5, 0.5, 0.5, 0.5));
  assert.equal(r3.state.cats[0]!.y, 3 - CAT, 'moved 2 pixels down');
  assert.equal(r3.state.cats.length, 2, 'level 1: up to 2 cats; that edge is taken, the next try is used');
  assert.equal(step(r3.state, plain).state.cats.length, 2);
});

test('speed-ups and diagonals of a new cat', () => {
  const s = { ...newGame(1, plain), running: true };
  // Above column 0, twice faster (rand % 4 == 0), then diagonal (rand % 5 == 0), leftwards.
  const r = step(s, replay(0, 0, 0, 0.5, 0, 0.9));
  assert.deepEqual(r.state.cats, [{ x: 2, y: 1 - CAT, vx: -4, vy: 4 }]);
});

test('cats about to collide both turn back (the second sees the first unmoved); cats off the board leave', () => {
  const s = {
    ...newGame(1, plain),
    running: true,
    level: 0,
    cats: [
      { x: 100, y: 100, vx: 3, vy: 0 },
      { x: 138, y: 100, vx: -3, vy: 0 },
      { x: -36, y: 50, vx: -2, vy: 0 },
    ],
  };
  const r = step(s, plain);
  assert.deepEqual(r.state.cats, [
    { x: 100, y: 100, vx: -3, vy: 0 },
    { x: 138, y: 100, vx: 3, vy: 0 },
  ]);
});

test('a cat on the mouse catches it; the mouse is lost', () => {
  const s0 = newGame(1, plain);
  const s = { ...s0, running: true, level: 0, cats: [{ x: 3 * 40 + 4 + 31, y: 2 * 40, vx: 0, vy: 0 }] };
  const r = step(s, plain);
  assert.equal(r.caught, 0);
  assert.deepEqual(pounceTarget(r.state), { x: 122, y: 82 });
  const after = loseMouse({ ...r.state, mouse: { x: 0, y: 0 } });
  assert.equal(after.lives, 2);
  assert.deepEqual(after.mouse, { x: 3, y: 2 });
  assert.equal(after.cats.length, 0);
  assert.equal(after.active, true);
  const over = loseMouse({ ...after, lives: 1 });
  assert.equal(over.active, false);
  assert.equal(move(over, 'up').state, over, 'no more moves after the last mouse');
  // One pixel further right: no catch.
  assert.equal(step({ ...s, cats: [{ x: 3 * 40 + 4 + 32, y: 80, vx: 0, vy: 0 }] }, plain).caught, null);
});
