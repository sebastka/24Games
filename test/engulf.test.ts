import { test } from 'node:test';
import assert from 'node:assert/strict';
import layouts from '../src/assets/engulf/layouts.json' with { type: 'json' };
import {
  at,
  BLOCKED,
  captures,
  chooseMove,
  COMPUTER,
  computerMove,
  count,
  EMPTY,
  hasMove,
  moves,
  play,
  PLAYER,
  scoreMoves,
  startBoard,
  type Board,
} from '../src/games/engulf/logic.ts';
import { nextLayout, startingBoardFor } from '../src/games/engulf/progress.ts';
import { msvcRand } from '../src/shell/random.ts';

/** A board from 7 rows of '.', '#', 'P' and 'C'. */
const parse = (rows: string[]): Board => {
  const b = new Array<number>(49).fill(EMPTY);
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => (b[at(x, y)] = c === 'P' ? PLAYER : c === 'C' ? COMPUTER : c === '#' ? BLOCKED : EMPTY)),
  );
  return b;
};

test('the 35 layouts, and the start position', () => {
  assert.equal(layouts.length, 35);
  assert.ok(
    layouts[0]!.every((r) => r === '.......'),
    'board 1 is blank',
  );
  assert.deepEqual(layouts[1], ['...#...', '...#...', '...#...', '###.###', '...#...', '...#...', '...#...']);
  for (const layout of layouts) {
    const b = startBoard(layout);
    assert.equal(b[at(0, 0)], PLAYER);
    assert.equal(b[at(6, 6)], PLAYER);
    assert.equal(b[at(6, 0)], COMPUTER);
    assert.equal(b[at(0, 6)], COMPUTER);
  }
});

test('moves: copies next door, jumps two away, never onto a blocked square, in the engine order', () => {
  const b = parse(['P#.....', '.......', '.......', '.......', '.......', '.......', '.......']);
  const list = moves(b, PLAYER);
  // From (0,0): rows 0-2, columns 0-2, but (1,0) is blocked.
  assert.equal(list.length, 7);
  assert.deepEqual(list[0], { from: at(0, 0), to: at(2, 0), jump: true });
  assert.ok(list.every((m) => m.to !== at(1, 0)));
  assert.equal(list.filter((m) => !m.jump).length, 2);
});

test('a move turns the opposing pieces around the square it lands on', () => {
  const b = parse(['P......', '.CC....', '..C....', '.......', '.......', '.......', '.......']);
  const move = { from: at(0, 0), to: at(1, 0), jump: false };
  assert.deepEqual(captures(b, move.to, PLAYER), [at(1, 1), at(2, 1)]);
  const after = play(b, move, PLAYER);
  assert.equal(count(after, PLAYER), 4);
  assert.equal(count(after, COMPUTER), 1);
  const jumped = play(b, { from: at(0, 0), to: at(2, 0), jump: true }, PLAYER);
  assert.equal(jumped[at(0, 0)], EMPTY);
});

test('a side boxed in has no move', () => {
  const b = parse(['P##....', '###....', '###....', '.......', '.......', '.......', '......C']);
  assert.ok(!hasMove(b, PLAYER));
  assert.ok(hasMove(b, COMPUTER));
});

test('the computer prefers copies among equal moves, and takes the most pieces', () => {
  // Two player pieces next to an empty square the computer can reach: copying there takes both.
  const b = parse(['C......', '.......', '.PP....', '.......', '.......', '.......', '.......']);
  const move = computerMove(b, 1, msvcRand(3));
  assert.ok(move);
  assert.deepEqual(captures(b, move.to, COMPUTER).length, 2);
  const scored = scoreMoves(b, 1);
  const best = Math.max(...scored.map((s) => s.score));
  assert.ok(scored.some((s) => s.score === best && !s.move.jump));
  assert.equal(move.jump, false);
});

test('chooseMove draws rand() until an even number, then picks among the best copies', () => {
  const draws: number[] = [];
  const values = [1, 3, 4, 5];
  const rand = () => {
    const v = values[draws.length]!;
    draws.push(v);
    return v;
  };
  const scored = [
    { move: { from: 0, to: 2, jump: true }, score: 5 },
    { move: { from: 0, to: 1, jump: false }, score: 5 },
    { move: { from: 0, to: 7, jump: false }, score: 5 },
    { move: { from: 0, to: 8, jump: false }, score: 1 },
  ];
  // 1, 3 odd, 4 even; then 5 % 2 copies → the second best copy.
  assert.deepEqual(chooseMove(scored, rand), { from: 0, to: 7, jump: false });
  assert.deepEqual(draws, [1, 3, 4, 5]);
  assert.equal(chooseMove([], rand), null);
});

test('layout progression: the same, the next, or a random one, modulo 35', () => {
  assert.equal(
    nextLayout(4, 'same', () => 0),
    4,
  );
  assert.equal(
    nextLayout(34, 'sequential', () => 0),
    0,
  );
  assert.equal(
    nextLayout(0, 'sequential', () => 0),
    1,
    'a fresh start plays Board 2',
  );
  assert.equal(
    nextLayout(0, 'random', () => 0x1234),
    0x34 % 35,
  );
  assert.equal(
    nextLayout(startingBoardFor(7, 'sequential'), 'sequential', () => 0),
    7,
  );
  assert.equal(startingBoardFor(0, 'sequential'), 34);
});

test('the computer plays legal moves through a game, deterministically', () => {
  const games = [0, 1].map(() => {
    const rand = msvcRand(11);
    let b = startBoard(layouts[2]!);
    const played: string[] = [];
    for (let turn = 0; turn < 40; turn++) {
      const side = turn % 2 ? COMPUTER : PLAYER;
      if (!hasMove(b, side)) break;
      const list = moves(b, side);
      const move = side === COMPUTER ? computerMove(b, 2, rand)! : list[rand() % list.length]!;
      assert.ok(list.some((m) => m.from === move.from && m.to === move.to));
      played.push(`${move.from}-${move.to}`);
      b = play(b, move, side);
    }
    return played;
  });
  assert.deepEqual(games[0], games[1]);
});
