import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellAt, cellRect, dropZones } from '../src/games/sechseck/layout.ts';
import {
  Cell,
  isFree,
  neighbour,
  newGame,
  place,
  resume,
  step,
  type GameEvent,
  type Rand,
  type State,
} from '../src/games/sechseck/logic.ts';
import { loadSettings, SOUND_EVENTS } from '../src/games/sechseck/settings.ts';

/** A rand() returning the given values in turn, then 0. */
const seq = (...values: number[]): Rand => {
  let i = 0;
  return () => values[i++] ?? 0;
};

/** A 4×4 game with the given cells (row by row) and pieces. */
function game(cells: number[], slots = [0, 0, 0, 0]): State {
  return { ...newGame(4, seq()), cells, slots };
}

/** Runs `ms` milliseconds of the simulation. */
function run(s: State, ms: number, rand: Rand = seq()) {
  const events: GameEvent[] = [];
  let state = s;
  for (let i = 0; i < ms; i++) {
    const r = step(state, rand);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const piece = (colour: number, shape: number) => shape * 4 + colour;

test('a new game: a quarter of the cells multipliers, four random pieces, the timer waiting', () => {
  // rand() % 13: 0-1 → ×4, 2-4 → ×3, else ×2; then the row and the column.
  const s = newGame(4, seq(1, 0, 0, 4, 1, 2, 12, 3, 3, 12, 3, 3, 17, 18, 19, 35));
  assert.equal(s.cells[0], Cell.Times4);
  assert.equal(s.cells[1 * 4 + 2], Cell.Times3);
  assert.equal(s.cells[15], Cell.Times2);
  assert.equal(s.cells.filter((c) => c !== Cell.Empty).length, 3);
  assert.deepEqual(s.slots, [1, 2, 3, 3]);
  assert.equal(s.running, false);
  assert.equal(run(s, 10000).state, s);
  assert.equal(newGame(8, seq()).cells.length, 64);
});

test('neighbours: odd rows are shifted right by half a cell', () => {
  const around = (col: number, row: number) => [0, 1, 2, 3, 4, 5].map((d) => neighbour(6, col, row, d));
  assert.deepEqual(around(2, 2), [
    [2, 1],
    [3, 2],
    [2, 3],
    [1, 3],
    [1, 2],
    [1, 1],
  ]);
  assert.deepEqual(around(2, 3), [
    [3, 2],
    [3, 3],
    [3, 4],
    [2, 4],
    [1, 3],
    [2, 2],
  ]);
  assert.deepEqual(around(0, 0), [null, [1, 0], [0, 1], null, null, null]);
});

test('placing scores 2^(matches - 1), times the multiplier of the cell', () => {
  // Cell (1,1) of a 4×4 board (odd row): neighbours (2,0), (2,1), (2,2), (1,2), (0,1), (1,0).
  const cells = Array<number>(16).fill(0);
  cells[0 * 4 + 2] = piece(1, 2) + 1; // same colour, same shape: 2 matches
  cells[1 * 4 + 2] = piece(1, 0) + 1; // same colour: 1
  cells[1 * 4 + 0] = piece(3, 2) + 1; // same shape: 1
  cells[0 * 4 + 1] = Cell.Skull; // nothing
  cells[2 * 4 + 1] = Cell.Times4; // nothing
  let r = place(game(cells, [piece(1, 2), 5, 6, 7]), 0, 1 * 4 + 1, seq(9));
  assert.deepEqual(r.events, ['Match 4']);
  assert.equal(r.state.score, 8);
  assert.equal(r.state.cells[5], piece(1, 2) + 1);
  assert.deepEqual(r.state.slots, [9, 5, 6, 7]);
  assert.equal(r.state.running, true);
  // On a ×3 cell: three times as much.
  cells[5] = Cell.Times3;
  r = place(game(cells, [piece(1, 2), 5, 6, 7]), 0, 5, seq());
  assert.equal(r.state.score, 24);
  // Occupied cells take nothing.
  assert.equal(place(r.state, 1, 5, seq()).state, r.state);
  assert.equal(place(r.state, 1, 1, seq()).state, r.state);
});

test('the score is a 16-bit counter', () => {
  const cells = Array<number>(16).fill(0);
  const r = place({ ...game(cells), score: 65535 }, 0, 5, seq());
  assert.equal(r.state.score, 65535);
  cells[4] = 1;
  assert.equal(place({ ...game(cells), score: 65535 }, 0, 5, seq()).state.score, 1);
});

test('after 5 seconds without a piece placed, a skull takes a random free cell', () => {
  const cells = Array<number>(16).fill(0);
  cells[0] = 1;
  cells[3] = Cell.Times2;
  let s = place(game(cells), 0, 1, seq()).state;
  // The bar follows the stopwatch on each 100 ms tick.
  s = run(s, 2550).state;
  assert.equal(s.bar, 2500);
  // rand() % 14 free cells + 1 = the 2nd free cell in row order: cell 3, the ×2.
  const r = run(s, 2450, seq(1));
  assert.deepEqual(r.events, ['Penalty']);
  assert.equal(r.state.cells[3], Cell.Skull);
  assert.equal(r.state.elapsed, 0);
  assert.equal(r.state.bar, 0);
  assert.equal(r.state.cells.filter((c) => c === Cell.Skull).length, 1);
  // And again 5 seconds later.
  assert.deepEqual(run(r.state, 5000).events, ['Penalty']);
});

test('the game ends when no cell is free, by a piece or by a skull', () => {
  const cells = Array<number>(16).fill(1);
  cells[15] = Cell.Times2;
  let r = place({ ...game(cells), running: true }, 0, 15, seq());
  assert.deepEqual(r.events, ['Match 4', 'Game Over']);
  assert.equal(r.state.playing, false);
  assert.equal(r.state.running, false);
  r = run({ ...game(cells), running: true, elapsed: 4950 }, 100);
  assert.deepEqual(r.events, ['Penalty', 'Game Over']);
  assert.equal(r.state.cells[15], Cell.Skull);
  assert.equal(place(r.state, 0, 15, seq()).state, r.state);
});

test('resuming after a pause fires the timer at once', () => {
  const s = { ...game(Array<number>(16).fill(0)), running: true, elapsed: 5030, tick: 40 };
  const r = resume(s, seq());
  assert.deepEqual(r.events, ['Penalty']);
  assert.equal(r.state.tick, 0);
  assert.equal(resume({ ...s, running: false }, seq()).state.running, false);
});

test('layout: cells, and drop zones only on free cells', () => {
  assert.deepEqual(cellRect(6, 0, 0), { left: 50, top: 40, right: 91, bottom: 87 });
  assert.deepEqual(cellRect(6, 0, 1), { left: 71, top: 76, right: 112, bottom: 123 });
  assert.deepEqual(cellRect(8, 7, 7).bottom, 11 + 7 * 36 + 47);
  const [wide, tall] = dropZones(cellRect(4, 0, 0));
  assert.deepEqual(wide, { left: 90, top: 90, right: 131, bottom: 117 });
  assert.deepEqual(tall, { left: 101, top: 84, right: 120, bottom: 123 });
  assert.equal(
    cellAt(4, 110, 100, () => true),
    0,
  );
  assert.equal(
    cellAt(4, 110, 100, () => false),
    null,
  );
  // Between the zones of two rows: nothing.
  assert.equal(
    cellAt(4, 92, 119, () => true),
    null,
  );
  assert.ok(isFree(Cell.Times4) && !isFree(Cell.Skull) && !isFree(1));
});

test('settings: defaults and the sound events of the original', () => {
  const s = loadSettings();
  assert.equal(s.boardSize, 1);
  assert.equal(s.dragBitmaps, true);
  assert.equal(Object.keys(SOUND_EVENTS).filter((e) => e.startsWith('Match ')).length, 13);
});
