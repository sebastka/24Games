import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL,
  captures,
  computerMove,
  depthFor,
  index,
  isOver,
  move,
  moves,
  Square,
  start,
  type State,
} from '../src/games/pushpull/logic.ts';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

test('the start: the player on the top and bottom rows, the computer on the sides', () => {
  const s = start();
  assert.equal(s.marker, -1);
  assert.equal(s.squares.filter((q) => q === Square.Player).length, 10);
  assert.equal(s.squares.filter((q) => q === Square.Computer).length, 10);
  assert.equal(s.squares[index(0, 0)], Square.Empty);
  assert.equal(s.squares[index(3, 0)], Square.Player);
  assert.equal(s.squares[index(6, 3)], Square.Computer);
  // The marker is first placed on any empty square: corners and the inner 5×5.
  assert.equal(moves(s).length, 29);
});

test('the marker moves to the free neighbours; a piece it lands on is captured for its owner', () => {
  const placed = move(start(), index(1, 1));
  assert.equal(placed.event, 'marker');
  assert.deepEqual(
    moves(placed.state).sort((a, b) => a - b),
    [0, 1, 2, 7, 9, 14, 15, 16],
  );
  const red = move(placed.state, index(1, 0));
  assert.equal(red.event, 'capturePlayer');
  assert.deepEqual(captures(red.state), { player: 1, computer: 0 });
  const green = move(red.state, index(0, 1));
  assert.equal(green.event, 'captureComputer');
  assert.deepEqual(captures(green.state), { player: 1, computer: 1 });
  // Visited and captured squares are closed.
  assert.ok(!moves(green.state).includes(index(1, 0)));
  assert.ok(!moves(green.state).includes(index(1, 1)));
});

test('the game ends when the marker is stuck or a side has lost its ten pieces', () => {
  // Corner (0,0) with its three neighbours visited.
  const squares = [...start().squares];
  for (const i of [index(1, 0), index(0, 1), index(1, 1)]) squares[i] = Square.Visited;
  squares[index(0, 0)] = Square.Visited;
  assert.ok(isOver({ squares, marker: index(0, 0) }));
  const all = start().squares.map((q) => (q === Square.Computer ? Square.ComputerCaptured : q));
  assert.equal(captures({ squares: all, marker: 24 }).computer, ALL);
  assert.ok(isOver({ squares: all, marker: 24 }));
});

test('look-ahead depth: 1, 3, 5, 7 by skill, plus 0-2 at random', () => {
  assert.equal(
    depthFor(1, () => 0),
    1,
  );
  assert.equal(
    depthFor(2, () => 0.5),
    4,
  );
  assert.equal(
    depthFor(4, () => 0.95),
    9,
  );
});

test('the first placement of the computer: one of four squares', () => {
  const squares = new Set([0, 0.6].flatMap((a) => [0, 0.6].map((b) => computerMove(start(), 3, seq(a, b)))));
  assert.deepEqual(
    [...squares].sort((a, b) => a - b),
    [15, 19, 29, 33],
  );
});

test("the computer's replies match the original's (Wine: marker placed on (1, 1), Easy)", () => {
  const s: State = move(start(), index(1, 1)).state;
  // Depth 1 grabs the first green piece in the directions' order; depth 2 (Easy + 1, observed
  // under Wine) avoids the square next to a red piece.
  assert.equal(computerMove(s, 1, Math.random), index(0, 1));
  assert.equal(computerMove(s, 2, Math.random), index(0, 2));
});

test('the computer is deterministic for a given depth', () => {
  let s = move(start(), index(3, 3)).state;
  for (let i = 0; i < 6 && !isOver(s); i++) {
    const m = computerMove(s, 7, Math.random);
    assert.equal(m, computerMove(s, 7, Math.random));
    assert.ok(moves(s).includes(m));
    s = move(s, m).state;
  }
});
