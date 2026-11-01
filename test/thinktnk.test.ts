import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frameOf,
  GREENS,
  MAX,
  newGame,
  nextLevel,
  Pellet,
  press,
  respawn,
  step,
  Turn,
  type Enemy,
  type Item,
  type State,
} from '../src/games/thinktnk/logic.ts';

/** A random function cycling through `values`. */
const cycle = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};
const half = () => 0.5;
/** A seeded pseudo-random function, for levels: placement retries need varied values. */
const seeded = (seed: number) => () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A level without enemies or pellets in the way, the timer running. */
function quiet(s: State): State {
  return {
    ...s,
    enemies: s.enemies.map(() => null),
    items: s.items.map(() => null),
    running: true,
    clockRunning: true,
  };
}

const enemy = (over: Partial<Enemy>): Enemy => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 2,
  turn: Turn.None,
  shots: 0,
  bulletSpeed: 5,
  at: null,
  cooldown: 0,
  aim: 0,
  turnChance: 0,
  ...over,
});

test('level 1: the player at the bottom, ten enemies in a row, ten greens and four power-ups', () => {
  const s = newGame(seeded(7));
  assert.equal(s.level, 1);
  assert.equal(s.tanks, 3);
  assert.equal(s.timeBonus, 1000);
  assert.deepEqual([s.player.x, s.player.y, s.player.vx, s.player.vy], [180, MAX, 0, -2]);
  const enemies = s.enemies.filter((e) => e !== null);
  assert.equal(enemies.length, 10);
  assert.deepEqual(
    enemies.map((e) => e.x),
    [0, 360, 36, 324, 72, 288, 108, 252, 144, 216],
  );
  assert.ok(enemies.every((e) => e.y === 36));
  assert.equal(s.items.filter((i) => i?.type === Pellet.Green).length, GREENS);
  assert.deepEqual(
    s.items.slice(10, 13).map((i) => i?.type),
    [1, 2, 3],
  );
  // Every pellet on a lane: a row (y multiple of 36) or a column (x multiple of 36).
  assert.ok(s.items.every((i) => i && (i.y % 36 === 0 || i.x % 36 === 0)));
  assert.equal(s.running, false);
});

test('from level 10, as many enemies as the level (at most 20); an extra tank every fifth level', () => {
  let s = newGame(seeded(1));
  while (s.level < 12) s = nextLevel(s, seeded(s.level));
  assert.equal(s.enemies.filter((e) => e !== null).length, 12);
  assert.equal(s.enemies[10]!.y, 72);
  while (s.level < 25) s = nextLevel(s, seeded(s.level));
  assert.equal(s.enemies.filter((e) => e !== null).length, 20);
  assert.equal(s.items[13]!.type, Pellet.ExtraTank);
  assert.equal(s.timeBonus, 29 * 200);
});

test('a key starts the timer; a turn waits for a crossing lane', () => {
  const s0 = newGame(seeded(1));
  const r = press(s0, 'left');
  assert.equal(r.state.running, true);
  assert.equal(r.state.player.turn, Turn.Left);
  // On a lane already: the turn happens at once.
  const s1 = step(quiet(r.state), half).state;
  assert.deepEqual([s1.player.x, s1.player.y, s1.player.vx, s1.player.vy], [180, MAX, -2, 0]);
  // Asked to go up between two columns (x = 174): it goes on to the column x = 144, then turns.
  let s2 = s1;
  for (let i = 0; i < 3; i++) s2 = step(s2, half).state;
  assert.equal(s2.player.x, 174);
  s2 = press(s2, 'up').state;
  for (let i = 0; i < 14; i++) s2 = step(s2, half).state;
  assert.equal(s2.player.x, 146);
  s2 = step(s2, half).state;
  assert.deepEqual([s2.player.x, s2.player.vx, s2.player.vy], [144, 0, -2]);
});

test('a key off a lane for its turn does not start the timer', () => {
  const s = { ...newGame(seeded(1)), player: { ...newGame(seeded(1)).player, x: 54, y: 72 } };
  const r = press(s, 'up');
  assert.equal(r.state.running, false);
  assert.equal(r.state.player.turn, Turn.None);
  assert.equal(press(s, 'left').state.running, true);
});

test('the player stops at the edges; an enemy turns there at random', () => {
  const s = quiet(newGame(seeded(1)));
  const top = step({ ...s, player: { ...s.player, y: 1 } }, half).state;
  assert.equal(top.player.y, 0);
  const e = enemy({ x: 36, y: MAX - 1, vy: 2 });
  // Both coin flips heads: turned a right angle, then back: moving left.
  const r = step({ ...s, enemies: [e] }, cycle(0.9, 0.9, 0.99)).state.enemies[0]!;
  assert.deepEqual([r.y, r.vx, r.vy], [MAX, -2, 0]);
});

test('firing: one bullet in flight, back when it leaves the field', () => {
  const s = quiet(newGame(seeded(1)));
  const r = press(s, 'fire');
  assert.deepEqual(r.sounds, ['Player Fires Gun']);
  assert.equal(r.state.player.shots, 0);
  assert.deepEqual(r.state.bullets[0], { x: 187, y: MAX - 4, vx: 0, vy: -5, owner: 'player' });
  assert.deepEqual(press(r.state, 'fire').sounds, []);
  let t = r.state;
  for (let i = 0; i < 80 && t.player.shots === 0; i++) t = step(t, half).state;
  assert.equal(t.player.shots, 1);
});

test('a bullet destroys an enemy: 50 points, an explosion, then the level goes on', () => {
  const s = quiet(newGame(seeded(1)));
  const target = enemy({ x: 180, y: 300, vy: 0, at: { x: 180, y: 300 } });
  let t = press({ ...s, enemies: [target] }, 'fire').state;
  t = { ...t, player: { ...t.player, vy: 0 }, enemiesLeft: 2 };
  let r = step(t, half);
  for (let i = 0; i < 20 && !r.state.explosion; i++) r = step(r.state, half);
  assert.equal(r.state.enemies[0], null);
  assert.equal(r.state.score, 50);
  assert.equal(r.state.enemiesLeft, 1);
  assert.deepEqual(r.state.explosion, { x: 173, y: 293, counter: 0 });
  const heard = [];
  for (let i = 0; i < 6; i++) {
    r = step(r.state, half);
    heard.push(...r.sounds);
  }
  assert.deepEqual(heard, ['Enemy Destroyed']);
  assert.equal(r.state.explosion, null);
  assert.equal(r.outcome, null);
});

test('the last enemy destroyed without a green pellet taken: the war bonus', () => {
  const s = { ...quiet(newGame(seeded(1))), enemiesLeft: 0, explosion: { x: 0, y: 0, counter: 5 } };
  const r = step(s, half);
  assert.deepEqual(r.outcome, { kind: 'level', timeBonus: 1000, bonus: 300 });
  assert.equal(r.state.score, 300);
  assert.deepEqual(r.sounds, ['Level Complete']);
});

test('the last green pellet with no enemy destroyed: the peace bonus (the time bonus is only shown)', () => {
  const s = quiet(newGame(seeded(1)));
  const items = s.items.map((): Item | null => null);
  items[0] = { x: 180, y: MAX - 10, type: Pellet.Green };
  const r = step({ ...s, items, greens: 1, clock: 5000 }, half);
  assert.deepEqual(r.outcome, { kind: 'level', timeBonus: 900, bonus: 1000 });
  assert.equal(r.state.score, 1050);
  assert.deepEqual(r.sounds, ['Get Green Pellet', 'Level Complete']);
});

test('power-ups: extra shot, fast bullets, fast tank, extra tank', () => {
  const s = quiet(newGame(seeded(1)));
  const at = (type: number) => {
    const items = s.items.map((): Item | null => null);
    items[0] = { x: 180, y: MAX - 10, type };
    return step({ ...s, items }, half).state;
  };
  assert.equal(at(Pellet.ExtraShot).player.shots, 2);
  assert.equal(at(Pellet.FastBullets).player.bulletSpeed, 7);
  assert.equal(at(Pellet.FastTank).player.vy, -3);
  assert.equal(at(Pellet.ExtraTank).tanks, 4);
});

test('an enemy fires when the player is ahead, within its aim', () => {
  const s = quiet(newGame(seeded(1)));
  const e = enemy({ x: 180, y: 100, vy: 2, shots: 2, aim: 3 });
  const r = step({ ...s, enemies: [e] }, half);
  assert.deepEqual(r.sounds, ['Enemy Fires Gun']);
  assert.deepEqual(r.state.bullets[0], { x: 187, y: 120, vx: 0, vy: 5, owner: 0 });
  assert.equal(r.state.enemies[0]!.shots, 1);
  assert.equal(r.state.enemies[0]!.cooldown, 20);
  const off = step({ ...s, enemies: [{ ...e, x: 216 }] }, half);
  assert.deepEqual(off.sounds, []);
});

test('hit by an enemy: the tank explodes, a tank is lost, the player comes back elsewhere', () => {
  const s = quiet(newGame(seeded(1)));
  const e = enemy({ x: 180, y: MAX - 20, vy: 2 });
  let r = step({ ...s, enemies: [e] }, half);
  assert.equal(r.state.dead, true);
  assert.equal(r.state.clockRunning, false);
  for (let i = 0; i < 6; i++) r = step(r.state, half);
  assert.deepEqual(r.outcome, { kind: 'destroyed' });
  assert.equal(r.state.tanks, 2);
  assert.equal(r.state.running, false);
  const back = respawn(r.state, seeded(3));
  assert.equal(back.dead, false);
  assert.ok(back.player.x !== e.x || back.player.y !== e.y);
  assert.ok(back.player.x % 36 === 0 || back.player.y % 36 === 0);
  // The last tank: game over.
  let o = step({ ...s, tanks: 1, enemies: [e] }, half);
  for (let i = 0; i < 6; i++) o = step(o.state, half);
  assert.deepEqual(o.outcome, { kind: 'over' });
  assert.equal(o.state.active, false);
  assert.deepEqual(o.sounds, ['Defeat']);
});

test('the time bonus loses 20 points a second of play', () => {
  let s = quiet(newGame(seeded(1)));
  for (let i = 0; i < 40; i++) s = step(s, half).state;
  assert.equal(s.timeBonus, 960);
});

test('tank frames: left, right, up, down', () => {
  assert.deepEqual(
    [frameOf({ vx: -2, vy: 0 }), frameOf({ vx: 2, vy: 0 }), frameOf({ vx: 0, vy: -2 }), frameOf({ vx: 0, vy: 2 })],
    [0, 1, 2, 3],
  );
});
