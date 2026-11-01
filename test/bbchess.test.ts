import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canDrop,
  canGuess,
  deal,
  giveUp,
  guess,
  Piece,
  place,
  reveal,
  threatens,
  type State,
} from '../src/games/bbchess/logic.ts';

/** A random function returning `values` (as rand() results, 0-32767) in turn. */
const rands = (...values: number[]) => {
  let i = 0;
  return () => (values[i++ % values.length]! + 0.5) / 32768;
};

test('a deal: five pieces on distinct squares (row, then column), "?" there, score 100', () => {
  // Rows then columns: (0,1), the same again (redrawn), (2,3), (4,5), (6,7), (1,0).
  const s = deal(rands(1, 0, 1, 0, 3, 2, 5, 4, 7, 6, 0, 1));
  assert.deepEqual(s.secret, [
    { x: 0, y: 1 },
    { x: 2, y: 3 },
    { x: 4, y: 5 },
    { x: 6, y: 7 },
    { x: 1, y: 0 },
  ]);
  assert.equal(s.squares.filter((q) => q.kind === 'hidden').length, 5);
  assert.equal(s.squares[1 * 8 + 0]!.kind, 'hidden');
  assert.equal(s.score, 100);
  assert.ok(!canGuess(s));
});

test('threats ignore blocking pieces', () => {
  const o = { x: 3, y: 3 };
  assert.ok(threatens(Piece.King, o, { x: 4, y: 4 }));
  assert.ok(!threatens(Piece.King, o, { x: 5, y: 3 }));
  assert.ok(threatens(Piece.Queen, o, { x: 3, y: 7 }));
  assert.ok(threatens(Piece.Queen, o, { x: 0, y: 0 }));
  assert.ok(!threatens(Piece.Queen, o, { x: 4, y: 5 }));
  assert.ok(threatens(Piece.Rook, o, { x: 7, y: 3 }));
  assert.ok(!threatens(Piece.Rook, o, { x: 4, y: 4 }));
  assert.ok(threatens(Piece.Knight, o, { x: 4, y: 5 }));
  assert.ok(threatens(Piece.Knight, o, { x: 1, y: 2 }));
  assert.ok(!threatens(Piece.Knight, o, { x: 5, y: 5 }));
  assert.ok(threatens(Piece.Bishop, o, { x: 6, y: 0 }));
  assert.ok(!threatens(Piece.Bishop, o, { x: 6, y: 3 }));
});

const game = (): State => deal(rands(1, 0, 3, 2, 5, 4, 7, 6, 0, 1));

test('revealing a square counts its threats and costs 2 points, down to 0', () => {
  const s = game(); // King (0,1), Queen (2,3), Rook (4,5), Knight (6,7), Bishop (1,0).
  const r = reveal(s, { x: 0, y: 0 })!;
  // King next to it, bishop? (1,0)-(0,0) is not diagonal; queen (2,3) no; rook no; knight no.
  assert.deepEqual(r.squares[0], { kind: 'count', count: 1 });
  assert.equal(r.score, 98);
  assert.equal(reveal(r, { x: 0, y: 0 }), null, 'only once');
  assert.equal(reveal(r, { x: 0, y: 1 }), null, 'not a "?" square');
  assert.equal(reveal({ ...s, score: 1 }, { x: 5, y: 5 })!.score, 0);
});

test('placing, guessing (wrong: 5 points), winning, giving up', () => {
  let s = game();
  assert.ok(canDrop(s, 0, { x: 0, y: 1 }));
  assert.ok(!canDrop(s, 0, { x: 0, y: 0 }), 'only on "?" squares');
  s = place(s, Piece.King, { x: 2, y: 3 });
  assert.ok(!canDrop(s, 1, { x: 2, y: 3 }), 'one piece per square');
  s = place(s, Piece.Queen, { x: 0, y: 1 });
  s = place(s, Piece.Rook, { x: 4, y: 5 });
  s = place(s, Piece.Knight, { x: 6, y: 7 });
  assert.ok(!canGuess(s));
  s = place(s, Piece.Bishop, { x: 1, y: 0 });
  assert.ok(canGuess(s));
  const wrong = guess(s);
  assert.ok(!wrong.right);
  assert.equal(wrong.state.score, 95);
  s = place(place(wrong.state, Piece.King, { x: 0, y: 1 }), Piece.Queen, { x: 2, y: 3 });
  const right = guess(s);
  assert.ok(right.right);
  assert.ok(!right.state.active);
  const given = giveUp(game());
  assert.deepEqual(given.placed, given.secret);
  assert.ok(!given.active);
});
