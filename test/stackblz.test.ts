import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act,
  cell,
  COLS,
  initial,
  newGame,
  PERIODS,
  Piece,
  randomStack,
  ROWS,
  step,
  type GameEvent,
  type Rand,
  type State,
} from '../src/games/stackblz/logic.ts';
import { actionFor, loadSettings } from '../src/games/stackblz/settings.ts';
import { cleared, insert, loadScores, rankOf } from '../src/games/stackblz/highscores.ts';

/** A rand() returning the given values in turn, then 1 (no special piece, piece 1, column 3). */
const seq = (...values: number[]): Rand => {
  let i = 0;
  return () => values[i++] ?? 1;
};

/** A game in progress with the given columns (bottom first) and falling stack. */
function playing(columns: number[][], stack: [number, number, number], col: number, row: number): State {
  const grid = Array<number>(COLS * ROWS).fill(0);
  columns.forEach((pieces, c) => pieces.forEach((p, r) => (grid[c * ROWS + r] = p)));
  return { ...initial(seq()), grid, stack, col, row, playing: true, next: [1, 1, 1] };
}

/** Runs `ms` milliseconds of the simulation. */
function run(s: State, ms: number, rand: Rand = seq()) {
  const events: GameEvent[] = [];
  let state = s;
  for (let i = 0; i < ms; i++) {
    const r = step(state, [], rand);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

test('stacks are weighted colours, or one special piece in ten', () => {
  // rand() % 10 == 0: a special piece, 7 + rand() % 3, alone.
  assert.deepEqual(randomStack(seq(10, 2)), [Piece.Drill, 0, 0]);
  // Otherwise three pieces from rand() % 48: 0-11 → 1, 12-23 → 2, 24-34 → 3, 35-40 → 4, 41-44 → 5, 45-47 → 6.
  assert.deepEqual(randomStack(seq(1, 11, 12, 34)), [1, 2, 3]);
  assert.deepEqual(randomStack(seq(1, 35, 44, 47)), [4, 5, 6]);
});

test('a new game takes the next stack, draws another and drops it from column 2 or 3', () => {
  const s0 = initial(seq(1, 0, 0, 0, 1, 12, 12, 12));
  assert.deepEqual(s0.next, [2, 2, 2]);
  const { state, events } = newGame({ ...s0, score: 50, stacks: 25 }, seq(1, 24, 24, 24, 7));
  assert.deepEqual(events, []);
  assert.deepEqual(state.stack, [2, 2, 2]);
  assert.deepEqual(state.next, [3, 3, 3]);
  assert.equal(state.col, 3);
  assert.equal(state.row, 12);
  assert.equal(state.score, 0);
  assert.equal(state.level, 1);
  assert.equal(state.period, 1000);
});

test('the stack falls one row per timer tick, and lands on the next tick', () => {
  let s = playing([], [1, 2, 3], 0, 1);
  s = run(s, 999).state;
  assert.equal(s.row, 1);
  s = run(s, 1).state;
  assert.equal(s.row, 0);
  const landed = run(s, 1000);
  assert.deepEqual(landed.events, ['Piece Landing']);
  assert.deepEqual(
    [0, 1, 2].map((r) => cell(landed.state.grid, 0, r)),
    [1, 2, 3],
  );
  // The next stack appears at the top, and the timer restarts.
  assert.equal(landed.state.row, 12);
  assert.equal(landed.state.clock, 0);
});

test('moves are blocked by the walls and by the pieces beside the bottom of the stack', () => {
  const s = playing([[4, 4], [], [5, 5]], [1, 2, 3], 1, 1);
  assert.equal(act(s, 'left', seq()).state.col, 1);
  assert.equal(act(s, 'right', seq()).state.col, 1);
  assert.equal(act({ ...s, row: 2 }, 'right', seq()).state.col, 2);
  assert.equal(act({ ...s, col: 5 }, 'right', seq()).state.col, 5);
  assert.equal(act({ ...s, col: 0, row: 3 }, 'left', seq()).state.col, 0);
});

test('rotating moves the pieces down or up in the stack; special pieces do not rotate', () => {
  const s = playing([], [1, 2, 3], 2, 5);
  assert.deepEqual(act(s, 'rotateUp', seq()), { state: { ...s, stack: [2, 3, 1] }, events: ['Rotate Up'] });
  assert.deepEqual(act(s, 'rotateDown', seq()), { state: { ...s, stack: [3, 1, 2] }, events: ['Rotate Down'] });
  const bomb = playing([], [Piece.Bomb, 0, 0], 2, 5);
  assert.deepEqual(act(bomb, 'rotateUp', seq()).events, []);
});

test('dropping lands at once on top of the column', () => {
  const { state, events } = act(playing([[], [4, 5]], [1, 2, 3], 1, 10), 'drop', seq());
  assert.deepEqual(events, ['Piece Landing']);
  assert.deepEqual(
    [2, 3, 4].map((r) => cell(state.grid, 1, r)),
    [1, 2, 3],
  );
});

test('three in a row vanish: piece values, bonuses for horizontal and diagonal stacks', () => {
  // Vertical: no bonus, 3 × value of piece 2 at level 1.
  let r = act(playing([[2, 2]], [2, 4, 5], 0, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Piece Landing', 'Vertical Stack']);
  assert.equal(r.state.score, 6);
  assert.equal(r.state.stacks, 1);
  assert.deepEqual(
    [0, 1].map((row) => cell(r.state.grid, 0, row)),
    [4, 5],
  );
  // Horizontal: bonus 2 + 3 × 3.
  r = act(playing([[3], [3]], [3, 1, 2], 2, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Piece Landing', 'Horizontal Stack']);
  assert.equal(r.state.score, 11);
  // Diagonal: bonus 3 + 3 × 1; the pieces above fall into the holes.
  r = act(playing([[1], [5, 1], [6, 4]], [1, 2, 3], 2, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Piece Landing', 'Diagonal Stack']);
  assert.equal(r.state.score, 6);
  assert.deepEqual(
    [0, 1, 2].map((row) => cell(r.state.grid, 2, row)),
    [6, 4, 2],
  );
  assert.equal(cell(r.state.grid, 1, 1), 0);
});

test('four in a row are two stacks; falling pieces make chain reactions', () => {
  let r = act(playing([[3], [3], [3]], [3, 1, 2], 3, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Piece Landing', 'Horizontal Stack', 'Horizontal Stack']);
  assert.equal(r.state.stacks, 2);
  assert.equal(r.state.score, 2 * 2 + 4 * 3);
  // Three 4s in column 2 vanish; the 5 above them falls in line with the 5s of columns 0 and 1.
  r = act(
    playing(
      [
        [1, 5],
        [1, 5],
        [2, 4, 4],
      ],
      [4, 5, 6],
      2,
      12,
    ),
    'drop',
    seq(),
  );
  assert.deepEqual(r.events, ['Piece Landing', 'Vertical Stack', 'Horizontal Stack']);
  assert.deepEqual(
    [0, 1, 2].map((c) => cell(r.state.grid, c, 1)),
    [0, 0, 6],
  );
});

test('special pieces: the bomb, the drill and the colour wipe', () => {
  let r = act(playing([[1, 2, 3]], [Piece.Bomb, 0, 0], 0, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Bomb']);
  assert.deepEqual(
    [0, 1, 2, 3].map((row) => cell(r.state.grid, 0, row)),
    [1, 2, 0, 0],
  );
  assert.equal(r.state.score, 3);
  r = act(playing([[1, 2, 3]], [Piece.Drill, 0, 0], 0, 12), 'drop', seq());
  assert.deepEqual(
    [0, 1, 2].map((row) => cell(r.state.grid, 0, row)),
    [0, 0, 0],
  );
  assert.equal(r.state.score, 6);
  r = act(playing([[4, 2], [2, 6], [1]], [Piece.Wipe, 0, 0], 0, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Bomb']);
  assert.equal(r.state.score, 4);
  assert.deepEqual([cell(r.state.grid, 0, 0), cell(r.state.grid, 0, 1), cell(r.state.grid, 1, 0)], [4, 0, 6]);
  // A special piece is never left in the grid; on the floor it does nothing.
  r = act(playing([], [Piece.Wipe, 0, 0], 0, 12), 'drop', seq());
  assert.equal(cell(r.state.grid, 0, 0), 0);
});

test('levels: every 10 stacks, but only recomputed when the count is not a multiple of 10', () => {
  // The 10th stack: still level 1.
  let r = act({ ...playing([[2, 2]], [2, 4, 5], 0, 12), stacks: 9 }, 'drop', seq());
  assert.equal(r.state.stacks, 10);
  assert.equal(r.state.level, 1);
  // The 11th: level 2, the timer at 850 ms; values double.
  r = act({ ...r.state, stack: [4, 4, 4], col: 1, row: 12 }, 'drop', seq());
  assert.equal(r.state.stacks, 11);
  assert.ok(r.events.includes('New Level'));
  assert.equal(r.state.level, 2);
  assert.equal(r.state.period, PERIODS[1]);
  // Scored at level 1: the level changes after the round.
  assert.equal(r.state.score, 3 * 2 + 3 * 4);
  // Level 18 at most.
  r = act({ ...playing([[2, 2]], [2, 4, 5], 0, 12), stacks: 500 }, 'drop', seq());
  assert.equal(r.state.level, 18);
  assert.equal(r.state.period, 2);
});

test('the game is over when a stack lands with a piece on the top visible row', () => {
  const column = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  const r = act(playing([column], [3, 4, 5], 0, 12), 'drop', seq());
  assert.deepEqual(r.events, ['Piece Landing', 'Game Over']);
  assert.equal(r.state.playing, false);
  // Nothing runs any more.
  assert.equal(run(r.state, 5000).state, r.state);
  assert.equal(act(r.state, 'left', seq()).state, r.state);
});

test('settings: the default keys, letters matched case-insensitively', () => {
  const { keys } = loadSettings();
  assert.equal(actionFor(keys, 'ArrowLeft'), 'left');
  assert.equal(actionFor(keys, 'ArrowDown'), 'rotateUp');
  assert.equal(actionFor(keys, 'ArrowUp'), 'rotateDown');
  assert.equal(actionFor(keys, ' '), 'drop');
  assert.equal(actionFor({ ...keys, drop: 26 }, 'q'), undefined);
  assert.equal(actionFor({ ...keys, drop: 30 }, 'q'), 'drop');
});

test('hall of fame: ten places, higher scores first, free places take any score', () => {
  let hall = loadScores('test');
  assert.equal(rankOf(hall, 0), 0);
  hall = insert(hall, 0, 'Ann', 100);
  hall = insert(hall, rankOf(hall, 50), 'Bob', 50);
  hall = insert(hall, rankOf(hall, 100), 'Cy', 100);
  assert.deepEqual(
    hall.entries.slice(0, 3).map((e) => `${e.name} ${e.score}`),
    ['Ann 100', 'Cy 100', 'Bob 50'],
  );
  assert.equal(hall.player, 'Cy');
  for (let i = 0; i < 7; i++) hall = insert(hall, rankOf(hall, 10), 'X', 10);
  assert.equal(rankOf(hall, 10), -1);
  assert.equal(rankOf(hall, 11), 3);
  assert.equal(cleared(hall).entries[0]!.score, null);
  assert.equal(cleared(hall).player, 'X');
});
