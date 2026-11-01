import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  at,
  Bit,
  canGo,
  carve,
  COMPUTER_MS,
  move,
  newMaze,
  Visibility,
  wayOf,
  type Direction,
  type Options,
  type State,
} from '../src/games/maze/logic.ts';

const seeded = (seed: number) => () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const OPTIONS: Options = { width: 20, height: 20, visibility: 0, playerThrowers: true, opponentThrowers: true };

/** The cells reachable from (0, 0). */
function reachable(s: State): number {
  const seen = new Set<number>();
  const stack = [{ x: 0, y: 0 }];
  const step: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(at(s, c.x, c.y))) continue;
    seen.add(at(s, c.x, c.y));
    for (const d of Object.keys(step) as Direction[]) {
      if (canGo(s, c.x, c.y, d)) stack.push({ x: c.x + step[d][0], y: c.y + step[d][1] });
    }
  }
  return seen.size;
}

test('a perfect maze: every cell reachable, closed borders, as many openings as cells - 1', () => {
  for (const seed of [1, 2, 3]) {
    const s = newMaze(OPTIONS, [0, 0], seeded(seed));
    assert.equal(reachable(s), 400);
    let openings = 0;
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        if (y > 0 && canGo(s, x, y, 'up')) openings++;
        if (x > 0 && canGo(s, x, y, 'left')) openings++;
      }
      assert.ok(!canGo(s, x, 0, 'up') && !canGo(s, x, 19, 'down'));
      assert.ok(!canGo(s, 0, x, 'left') && !canGo(s, 19, x, 'right'));
    }
    assert.equal(openings, 399);
  }
  const cells = carve(5, 5, seeded(9));
  assert.equal(cells.length, 36);
});

test('a new maze: the mice in the top corners, the cheese on the bottom row, (w + h) / 4 throwers of each', () => {
  const s = newMaze(OPTIONS, [0, 0], seeded(4));
  assert.deepEqual(s.mice, [
    { x: 0, y: 0, left: false },
    { x: 19, y: 0, left: false },
  ]);
  const cheese = s.cells.findIndex((c) => c & Bit.Cheese);
  assert.equal(cheese % 21, 19);
  assert.ok(s.cells.filter((c) => c & Bit.PlayerThrower).length <= 10);
  assert.ok(s.cells.filter((c) => c & Bit.OpponentThrower).length >= 1);
  // No thrower on the bottom row.
  for (let x = 0; x < 20; x++) assert.equal(s.cells[at(s, x, 19)]! & (Bit.PlayerThrower | Bit.OpponentThrower), 0);
  assert.equal(s.active, false);
});

test('following the ways leads to the cheese', () => {
  const s = {
    ...newMaze({ ...OPTIONS, playerThrowers: false, opponentThrowers: false }, [0, 0], seeded(5)),
    active: true,
  };
  let state: State = { ...s, mice: [{ x: 0, y: 19, left: false }, s.mice[1]] };
  let winner = null;
  for (let i = 0; i < 400 && winner === null; i++) {
    const r = move(state, 1, wayOf(state, state.mice[1]), seeded(i));
    state = r.state;
    winner = r.winner;
  }
  assert.equal(winner, 1);
  assert.equal(state.wins[1], 1);
  assert.equal(state.active, false);
});

test('walls stop the mice; only during a race', () => {
  const s = newMaze(OPTIONS, [0, 0], seeded(6));
  assert.equal(move(s, 0, 'down', seeded(1)).state, s, 'no race yet');
  const live = { ...s, active: true };
  assert.equal(move(live, 0, 'up', seeded(1)).state, live, 'the border');
  const r = move(live, 0, canGo(live, 0, 0, 'right') ? 'right' : 'down', seeded(1));
  assert.notDeepEqual(r.state.mice[0], live.mice[0]);
});

/** A 5 × 5 maze without walls inside, for thrower tests. */
function open(): State {
  const s = newMaze({ ...OPTIONS, width: 5, height: 5 }, [0, 0], seeded(7));
  const cells = s.cells.map((c, i) => {
    const x = Math.floor(i / 6);
    const y = i % 6;
    let v = c & ~(Bit.Top | Bit.Left | Bit.PlayerThrower | Bit.OpponentThrower | Bit.Cheese);
    if (y === 0 || y === 5) v |= Bit.Top;
    if (x === 0 || x === 5) v |= Bit.Left;
    return v;
  });
  return { ...s, cells, active: true };
}

test('a white dot throws the mouse on it, a black dot the other one', () => {
  const s = open();
  const cells = [...s.cells];
  cells[at(s, 1, 0)]! |= Bit.PlayerThrower;
  cells[at(s, 0, 1)]! |= Bit.OpponentThrower;
  const white = move({ ...s, cells }, 0, 'right', seeded(2));
  assert.deepEqual(white.sounds, ['White Mouse Thrown']);
  assert.equal(white.state.cells[at(s, 1, 0)]! & Bit.PlayerThrower, 0, 'the dot is used up');
  assert.notDeepEqual([white.state.mice[0].x, white.state.mice[0].y], [1, 0]);
  const black = move({ ...s, cells }, 0, 'down', seeded(2));
  assert.deepEqual(black.sounds, ['Brown Mouse Thrown']);
  assert.deepEqual(black.state.mice[0], { x: 0, y: 1, left: false });
  assert.ok(black.state.mice[1].y < 4, 'thrown off the bottom row');
  // Throwers switched off in the options: nothing happens.
  assert.deepEqual(move({ ...s, cells, playerThrowers: false }, 0, 'right', seeded(2)).sounds, []);
});

test('mice meeting on a cell are both thrown', () => {
  const s = {
    ...open(),
    mice: [
      { x: 1, y: 1, left: false },
      { x: 2, y: 1, left: false },
    ] as State['mice'],
  };
  const r = move(s, 0, 'right', seeded(3));
  assert.ok(r.sounds[0] === 'Brown Mouse Thrown');
  assert.ok(r.state.mice[0].x !== r.state.mice[1].x || r.state.mice[0].y !== r.state.mice[1].y);
});

test('hidden walls show around the mice as they go', () => {
  const s = { ...newMaze({ ...OPTIONS, visibility: Visibility.None }, [0, 0], seeded(8)), active: true };
  assert.equal(s.cells.filter((c) => c & Bit.Visible).length, 0);
  const d = (['right', 'down'] as const).find((x) => canGo(s, 0, 0, x))!;
  const r = move(s, 0, d, seeded(1));
  assert.ok(r.state.cells[at(s, 0, 0)]! & Bit.Visible);
  assert.ok(r.state.cells[at(s, 18, 1)]! & Bit.Visible, 'around Nestor too');
  const some = newMaze({ ...OPTIONS, visibility: Visibility.Some }, [0, 0], seeded(8));
  assert.equal(some.cells[at(some, 10, 10)]! & Bit.Visible, 0);
  assert.ok(some.cells[at(some, 0, 0)]! & Bit.Visible);
});

test('the computer speeds', () => {
  assert.equal(COMPUTER_MS.length, 10);
  assert.equal(COMPUTER_MS[2], 800);
});
