import { test } from 'node:test';
import assert from 'node:assert/strict';
import layouts from '../src/assets/pegoplis/layouts.json' with { type: 'json' };
import {
  cellOf,
  jump,
  matchesGoal,
  movable,
  piecesLeft,
  start,
  targets,
  type Cell,
  type Layout,
} from '../src/games/pegoplis/logic.ts';

const LAYOUTS = layouts as Layout[];
const byName = (name: string) => start(LAYOUTS.find((l) => l.name === name)!);

test('the 23 layouts', () => {
  assert.equal(LAYOUTS.length, 23);
  assert.equal(LAYOUTS.filter((l) => l.flags[3]).length, 7, 'seven score layouts, the others have a goal');
  assert.ok(LAYOUTS.every((l) => l.flags[3] === !l.goal));
  assert.equal(piecesLeft(byName('Classic English')), 32);
  assert.equal(piecesLeft(byName('Classic French')), 36);
  assert.equal(piecesLeft(byName('Restaraunt')), 14);
});

test('cell codes', () => {
  assert.deepEqual(cellOf(0), { square: null, piece: null });
  assert.deepEqual(cellOf(1), { square: 1, piece: null });
  assert.deepEqual(cellOf(2), { square: 0, piece: null });
  assert.deepEqual(cellOf(4), { square: 0, piece: 0 });
  assert.deepEqual(cellOf(5), { square: 1, piece: 1 });
});

test('English: four first moves into the centre, straight jumps only', () => {
  const s = byName('Classic English');
  assert.equal(movable(s).length, 4);
  assert.deepEqual(targets(s, { x: 3, y: 1 }), [{ x: 3, y: 3 }]);
  const r = jump(s, { x: 3, y: 1 }, { x: 3, y: 3 })!;
  assert.equal(r.outcome, null);
  assert.equal(piecesLeft(r.state), 31);
  assert.equal(r.state.cells[2 * 7 + 3]!.piece, null, 'the piece jumped over is gone');
  assert.equal(jump(s, { x: 3, y: 1 }, { x: 3, y: 2 }), null, 'not a jump');
});

test('Restaurant allows diagonal jumps', () => {
  const s = byName('Restaraunt');
  // The empty square is (3, 2): reached diagonally from (1, 4), straight from (3, 4).
  assert.deepEqual(movable(s), [
    { x: 1, y: 4 },
    { x: 3, y: 4 },
  ]);
  assert.deepEqual(targets(s, { x: 1, y: 4 }), [{ x: 3, y: 2 }]);
  assert.deepEqual(targets({ ...s, diagonal: false }, { x: 1, y: 4 }), []);
});

test('a score layout ends "stuck" when no jump is left', () => {
  const s = byName('Restaraunt');
  let state = s;
  let outcome = null;
  // Always take the first possible jump until none is left.
  for (let i = 0; i < 20 && state.active; i++) {
    const [from] = movable(state);
    const r = jump(state, from!, targets(state, from!)[0]!)!;
    ({ state, outcome } = r);
  }
  assert.equal(outcome, 'stuck');
  assert.ok(!state.active);
});

test('pattern layouts: matched, or too many pieces removed', () => {
  const center = byName('The Center');
  assert.ok(!center.score);
  assert.ok(!matchesGoal(center));
  // A board one jump away from the goal: pieces at (3,1) and (3,2) only, (3,3) empty.
  const cells: Cell[] = center.cells.map((c) => ({ ...c, piece: null }));
  cells[1 * 7 + 3] = { ...cells[1 * 7 + 3]!, piece: 0 };
  cells[2 * 7 + 3] = { ...cells[2 * 7 + 3]!, piece: 0 };
  const near = { ...center, cells };
  assert.equal(jump(near, { x: 3, y: 1 }, { x: 3, y: 3 })!.outcome, 'matched');
  // Elsewhere: one piece left, not in the centre.
  const wrongCells: Cell[] = cells.map((c, i) => (i === 2 * 7 + 3 ? { ...c, piece: null } : c));
  wrongCells[0 * 7 + 3] = { ...wrongCells[0 * 7 + 3]!, piece: 0 };
  const wrong = { ...center, cells: wrongCells };
  assert.equal(jump(wrong, { x: 3, y: 0 }, { x: 3, y: 2 })!.outcome, 'tooMany');
});
