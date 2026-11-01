import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPUTER,
  computerMove,
  count,
  DEPTHS,
  EMPTY,
  flips,
  hasMove,
  isLegal,
  legalMoves,
  msvcRand,
  ORDER,
  play,
  PLAYER,
  startBoard,
  WEIGHTS,
  type Board,
} from '../src/games/reversi/logic.ts';

const sq = (name: string) => (Number(name[1]) - 1) * 8 + name.charCodeAt(0) - 97;

/** A board from 8 rows of '.', 'P' (player) and 'C' (computer). */
const parse = (rows: string[]): Board =>
  rows
    .join('')
    .split('')
    .map((c) => (c === 'P' ? PLAYER : c === 'C' ? COMPUTER : EMPTY));

test('start positions: crossed puts the computer on d4 and e5, side by side the player in column d', () => {
  const crossed = startBoard(true);
  assert.equal(crossed[sq('d4')], COMPUTER);
  assert.equal(crossed[sq('e5')], COMPUTER);
  assert.equal(crossed[sq('e4')], PLAYER);
  assert.equal(crossed[sq('d5')], PLAYER);
  const side = startBoard(false);
  assert.equal(side[sq('d4')], PLAYER);
  assert.equal(side[sq('d5')], PLAYER);
  assert.equal(side[sq('e4')], COMPUTER);
  assert.equal(count(side, PLAYER), 2);
});

test('legal moves flank opposing pieces, and only those', () => {
  const b = startBoard(true);
  assert.deepEqual(
    legalMoves(b, PLAYER).sort((x, y) => x - y),
    [sq('d3'), sq('c4'), sq('f5'), sq('e6')].sort((x, y) => x - y),
  );
  assert.ok(!isLegal(b, sq('a1'), PLAYER));
  assert.ok(!isLegal(b, sq('d4'), PLAYER), 'an occupied square');
});

test('runs do not wrap around the edges of the board', () => {
  const b = parse(['.......C', 'P.......', '........', '........', '........', '........', '........', '........']);
  // g1 → h1 → (wrapping) a2 would close a run in a broken engine.
  assert.ok(!isLegal(b, sq('g1'), PLAYER));
});

test('a move flips every flanked run, clockwise from up', () => {
  const b = parse(['........', '........', '..P.P...', '...C....', '..PC.CP.', '........', '........', '........']);
  const at = sq('e5');
  assert.deepEqual(flips(b, at, PLAYER), [sq('f5'), sq('d5'), sq('d4')]);
  const after = play(b, at, PLAYER);
  assert.equal(after[at], PLAYER);
  assert.equal(count(after, COMPUTER), 0);
});

test('a side without moves must pass; the game ends when neither can move', () => {
  const full = parse([...Array.from({ length: 7 }, () => 'PPPPPPPP'), 'PPPPPP.C']);
  assert.ok(!hasMove(full, PLAYER));
  assert.ok(!hasMove(full, COMPUTER));
  const one = parse(['CP......', ...Array.from({ length: 7 }, () => '........')]);
  assert.ok(!hasMove(one, PLAYER));
  assert.ok(hasMove(one, COMPUTER));
});

test('the data tables', () => {
  assert.deepEqual(DEPTHS, [1, 2, 4, 5]);
  assert.deepEqual(
    [...ORDER].sort((a, b) => a - b),
    Array.from({ length: 64 }, (_, i) => i),
  );
  assert.deepEqual(ORDER.slice(0, 4), [0, 7, 56, 63]);
  assert.equal(WEIGHTS.length, 64);
  assert.equal(WEIGHTS[0], 100);
  assert.equal(WEIGHTS[9], -50);
});

test('msvcRand is the C runtime generator', () => {
  const rand = msvcRand(1);
  assert.deepEqual([rand(), rand(), rand()], [41, 18467, 6334]);
});

test('the computer takes a corner when it can', () => {
  const b = parse(['.PPPPC..', '...PP...', '..PPPP..', '..PCCP..', '..PPPP..', '........', '........', '........']);
  for (let skill = 1; skill <= 4; skill++) {
    assert.equal(computerMove(b, skill, msvcRand(7)), sq('a1'), `skill ${skill}`);
  }
});

test('a single legal move is played at once; no move gives -1', () => {
  const one = parse(['CP......', '........', '........', '........', '........', '........', '........', '........']);
  assert.deepEqual(legalMoves(one, COMPUTER), [sq('c1')]);
  assert.equal(computerMove(one, 4, msvcRand(1)), sq('c1'));
  assert.equal(
    computerMove(
      startBoard(true).map(() => PLAYER),
      1,
      msvcRand(1),
    ),
    -1,
  );
});

test('the computer plays legal moves through whole games, deterministically', () => {
  for (let skill = 1; skill <= 4; skill++) {
    const games = [0, 1].map(() => {
      const rand = msvcRand(skill * 101);
      let b = startBoard(true);
      const moves: number[] = [];
      for (let turn = 0; turn < 70; turn++) {
        const side = turn % 2 === 0 ? PLAYER : COMPUTER;
        if (!hasMove(b, side)) continue;
        // The player's side is played by the engine too, through a mirrored board.
        const m =
          side === COMPUTER
            ? computerMove(b, skill, rand)
            : computerMove(
                b.map((p) => -p),
                1,
                rand,
              );
        assert.ok(isLegal(b, m, side));
        moves.push(m);
        b = play(b, m, side);
      }
      return { moves, pieces: count(b, PLAYER) + count(b, COMPUTER) };
    });
    assert.deepEqual(games[0], games[1]);
  }
});
