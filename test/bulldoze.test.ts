import { test } from 'node:test';
import assert from 'node:assert/strict';
import levels from '../src/assets/bulldoze/levels.json' with { type: 'json' };
import { canUndo, isComplete, move, parseLevel, start, Tile, undo, type State } from '../src/games/bulldoze/logic.ts';
import { checkPassword, completion, password, STARTING_LEVELS } from '../src/games/bulldoze/progress.ts';

// A small walled level: dozer facing right at (2,1), a rock at (3,1), a target at (4,1).
const ROWS = [
  '88888888888888888888',
  '80721000000000000008',
  '80000000000000000008',
  ...Array.from({ length: 8 }, () => '80000000000000000008'),
  '88888888888888888888',
];
const tile = (s: State, x: number, y: number) => s.tiles[y * 20 + x];

test('parseLevel finds the dozer, counts the targets and leaves floor under the dozer', () => {
  const level = parseLevel(ROWS);
  assert.deepEqual(level.start, { x: 2, y: 1 });
  assert.equal(level.facing, Tile.DozerRight);
  assert.equal(level.targets, 1);
  assert.equal(level.tiles[1 * 20 + 2], Tile.Floor);
  assert.throws(() => parseLevel(ROWS.slice(1)));
});

test('the 60 original levels parse, with as many rocks as targets', () => {
  assert.equal(levels.length, 61);
  for (const rows of levels.slice(0, 60)) {
    const level = parseLevel(rows);
    assert.equal(level.tiles.filter((t) => t === Tile.Rock).length, level.targets);
  }
});

test('pushing a rock onto a target completes the level; undo puts it back', () => {
  const s0 = start(parseLevel(ROWS));
  const { state: s1, event } = move(s0, 'right');
  assert.equal(event, 'rockOnTarget');
  assert.deepEqual(s1.at, { x: 3, y: 1 });
  assert.equal(tile(s1, 4, 1), Tile.RockOnTarget);
  assert.ok(isComplete(s1));
  assert.ok(canUndo(s1));

  const { state: s2, beep } = undo(s1);
  assert.equal(beep, false);
  assert.deepEqual(s2.at, s0.at);
  assert.deepEqual(s2.tiles, s0.tiles);
  assert.equal(s2.remaining, 1);
  assert.ok(!canUndo(s2));
});

test('a blocked dozer only turns; a rock pushed off a target frees it', () => {
  const s0 = start(parseLevel(ROWS));
  const { state: s1 } = move(s0, 'up'); // wall above
  assert.deepEqual(s1.at, s0.at);
  assert.equal(s1.facing, Tile.DozerUp);
  assert.equal(move(s1, 'right').event, 'rockOnTarget');
  const { state: s2, event } = move(move(s1, 'right').state, 'right');
  assert.equal(event, 'rock');
  assert.equal(tile(s2, 5, 1), Tile.Rock);
  assert.equal(tile(s2, 4, 1), Tile.Target);
  assert.equal(s2.remaining, 1, 'pushing a rock off a target counts the target again');
});

test('only a push can be undone, and only right after it (as in the original)', () => {
  const s0 = start(parseLevel(ROWS));
  const pushed = move(s0, 'right').state;
  const turned = move(pushed, 'up').state; // blocked: keeps the undo
  assert.ok(canUndo(turned));
  const walked = move(turned, 'down').state; // a plain move forgets it
  assert.ok(!canUndo(walked));
});

test('restarting the "THE END" screen leaves it impossible to complete', () => {
  const end = start(parseLevel(levels[60]!), true);
  assert.equal(end.remaining, 1);
  assert.ok(!isComplete(end));
});

test('passwords', () => {
  assert.deepEqual(STARTING_LEVELS, [1, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56]);
  assert.equal(password(4), 'BONK');
  assert.equal(password(56), 'IAOM');
  assert.equal(password(5), null);
  assert.equal(password(60), null);
  assert.ok(checkPassword(28, ' kale '));
  assert.ok(!checkPassword(28, 'BONK'));
  assert.ok(checkPassword(1, ''));
});

test('completion dialogs', () => {
  assert.deepEqual(completion(1), { kind: 'level' });
  assert.deepEqual(completion(3), { kind: 'password', password: 'BONK' });
  assert.deepEqual(completion(55), { kind: 'password', password: 'IAOM' });
  assert.deepEqual(completion(59), { kind: 'level' });
  assert.deepEqual(completion(60), { kind: 'final' });
});
