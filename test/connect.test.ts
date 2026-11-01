import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boardFull,
  CELLS,
  COMPUTER,
  computerMove,
  drop,
  EMPTY,
  isFull,
  PLAYER,
  ROWS,
  start,
  winner,
  winningFour,
  type Position,
} from '../src/games/connect/logic.ts';
import { msvcRand } from '../src/games/reversi/logic.ts';

/** Plays columns in turn from a new game. */
const playAll = (columns: number[], computerFirst = false): Position => columns.reduce(drop, start(computerFirst));

/** Whether the computer, to move again, would win with one drop. */
const threatens = (p: Position): boolean =>
  [0, 1, 2, 3, 4, 5, 6].some((c) => !isFull(p, c) && winner(drop({ ...p, side: COMPUTER }, c).cells) === COMPUTER);

/** A constant rand(): 0 % 5 < 3, so the depth is the skill level. */
const zero = () => 0;

test('a new game: empty, the player to move; the computer may have opened in column D', () => {
  const p = start(false);
  assert.equal(p.side, PLAYER);
  assert.ok(p.cells.every((c) => c === EMPTY));
  const c = start(true);
  assert.equal(c.cells[3 * ROWS], COMPUTER);
  assert.equal(c.heights[3], 1);
  assert.equal(c.side, PLAYER);
  assert.equal(c.count, 0, 'the opening move is not counted, as in the original');
});

test('pieces stack up; a column takes six', () => {
  const p = playAll([2, 2, 2, 2, 2, 2]);
  assert.ok(isFull(p, 2));
  assert.deepEqual(p.cells.slice(2 * ROWS, 3 * ROWS), [PLAYER, COMPUTER, PLAYER, COMPUTER, PLAYER, COMPUTER]);
  assert.equal(p.count, 6);
});

test('four in a row in every direction', () => {
  // Vertical: the player in column A, the computer in column B.
  const v = playAll([0, 1, 0, 1, 0, 1, 0]);
  assert.equal(winner(v.cells), PLAYER);
  assert.deepEqual(winningFour(v), [0, 1, 2, 3]);
  // Horizontal on the bottom row.
  const h = playAll([0, 0, 1, 1, 2, 2, 3]);
  assert.equal(winner(h.cells), PLAYER);
  assert.deepEqual(winningFour(h), [0, 6, 12, 18]);
  // Diagonal up-right: A1, B2, C3, D4.
  const d = playAll([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
  assert.equal(winner(d.cells), PLAYER);
  assert.deepEqual(winningFour(d), [0, 7, 14, 21]);
  // Diagonal up-left: G1, F2, E3, D4.
  const a = playAll([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
  assert.equal(winner(a.cells), PLAYER);
  assert.equal(winningFour(a).length, 4);
  assert.equal(winner(playAll([0, 1, 2]).cells), EMPTY);
});

test('the computer takes a win, and blocks the player', () => {
  // The computer has three in column B: it completes them.
  const win = playAll([0, 1, 0, 1, 6, 1, 5]);
  assert.equal(win.side, COMPUTER);
  for (let skill = 1; skill <= 4; skill++) assert.equal(computerMove(win, skill, zero).column, 1);
  // The player has three on the bottom row (A-C), D and the others open: D must be blocked.
  const threat = playAll([0, 6, 1, 6, 2]);
  for (let skill = 1; skill <= 4; skill++) assert.equal(computerMove(threat, skill, zero).column, 3);
});

test('the computer prefers the centre on an open board', () => {
  assert.equal(computerMove(playAll([0]), 1, zero).column, 3);
});

test('"Check!": the computer threatens to win at its next move', () => {
  // The computer holds B1-B2 and C1-C2 under the player's A and G pieces: whatever it plays, a
  // four is one drop away.
  const p = playAll([0, 1, 0, 2, 6, 1, 6, 2, 5]);
  const reply = computerMove(p, 1, zero);
  assert.equal(reply.check, threatens(drop(p, reply.column)));
  assert.equal(computerMove(playAll([0]), 1, zero).check, false);
});

test('a full board leaves the computer without a move', () => {
  const full: Position = {
    cells: Array.from({ length: CELLS }, (_, i) =>
      (Math.floor(i / 2) + Math.floor(i / ROWS)) % 2 ? PLAYER : COMPUTER,
    ),
    heights: new Array(7).fill(ROWS),
    side: COMPUTER,
    count: CELLS,
  };
  assert.ok(boardFull(full));
  assert.equal(computerMove(full, 4, zero).column, -1);
});

test('the computer plays legal moves, deterministically under a seeded rand()', () => {
  for (let skill = 1; skill <= 4; skill++) {
    const games = [0, 1].map(() => {
      const rand = msvcRand(skill);
      let p = start(skill % 2 === 0);
      const moves: number[] = [];
      while (!boardFull(p) && winner(p.cells) === EMPTY) {
        let column: number;
        if (p.side === PLAYER) {
          do column = rand() % 7;
          while (isFull(p, column));
        } else {
          const reply = computerMove(p, skill, rand);
          column = reply.column;
          assert.ok(column >= 0 && !isFull(p, column));
          const after = drop(p, column);
          if (winner(after.cells) === EMPTY) assert.equal(reply.check, threatens(after));
        }
        assert.ok(column >= 0 && !isFull(p, column));
        moves.push(column);
        p = drop(p, column);
      }
      return moves;
    });
    assert.deepEqual(games[0], games[1]);
  }
});
