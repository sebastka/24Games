// Rules of Think Tank, as the original thinktnk.exe implements them (see docs/games/thinktnk.md
// for the functions this follows). Pure and immutable: every action returns a new state.
//
// The field is 379×379 pixels: 10×10 blocks of 18×18 at (18 + 36i, 18 + 36j), the lanes
// between them every 36 pixels. Tanks (18×18) roll along the lanes and turn where lanes cross;
// a 50 ms timer (`step`) moves everything.

export const FIELD = 379;
export const TANK = 18;
export const LANE = 36;
/** The last position of a tank on either axis (the field's last pixel, 378, minus a tank). */
export const MAX = FIELD - 1 - TANK;
export const BULLET = 4;
export const PELLET = 12;
/** The tanks' timer (StarView AutoTimer, `Timer::ChangeTimeout(0x32)`). */
export const TICK_MS = 50;
export const GREENS = 10;
const BULLET_SLOTS = 43;

/** Pellets: the index in pellets.png. */
export const Pellet = { Green: 0, ExtraShot: 1, FastBullets: 2, FastTank: 3, ExtraTank: 4 } as const;

/** A requested turn, applied at the next lane crossing (`0x48` of a tank). */
export const Turn = { None: 0, Left: 1, Right: 2, Up: 3, Down: 4 } as const;
export type Direction = 'left' | 'right' | 'up' | 'down';
const TURNS: Record<Direction, number> = { left: Turn.Left, right: Turn.Right, up: Turn.Up, down: Turn.Down };

export interface Tank {
  x: number;
  y: number;
  vx: number;
  vy: number;
  turn: number;
  /** Bullets it may still have in flight (each one comes back when it is gone). */
  shots: number;
  bulletSpeed: number;
}

export interface Enemy extends Tank {
  /** Where it was last tick (its collision square; null before its first move). */
  at: { x: number; y: number } | null;
  /** Ticks before it may fire again. */
  cooldown: number;
  /** How far off its line (pixels) the player may be for it to fire. */
  aim: number;
  /** Chance per thousand, each tick, to ask for a turn. */
  turnChance: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Who fired it: 'player', an enemy slot, or null once that enemy is destroyed. */
  owner: 'player' | number | null;
}

export interface Item {
  x: number;
  y: number;
  type: number;
}

export interface State {
  level: number;
  /** 16 bits, as the original's. */
  score: number;
  tanks: number;
  timeBonus: number;
  /** Milliseconds of play in this level (the original's stopwatch, `FUN_004077b0`…). */
  clock: number;
  /** Looks of the 10×10 blocks (walls.png), index i × 10 + j for the block at column i, row j. */
  walls: readonly number[];
  player: Tank;
  /** Destroyed: invisible until the explosion is over. */
  dead: boolean;
  /** Twenty slots, in the original's order. */
  enemies: readonly (Enemy | null)[];
  bullets: readonly (Bullet | null)[];
  /** Fourteen slots: ten green pellets, then three or four power-ups. */
  items: readonly (Item | null)[];
  greens: number;
  enemiesLeft: number;
  enemiesAtStart: number;
  /** An explosion at (x, y) (32×32): `counter` 0 the tick it is set off, then frame counter − 1. */
  explosion: { x: number; y: number; counter: number } | null;
  /** The timer runs: it starts at a key press, stops at the end of a level or a tank. */
  running: boolean;
  /** Whether the stopwatch of the time bonus runs. */
  clockRunning: boolean;
  /** A game is in progress (false once the last tank is lost). */
  active: boolean;
}

export type Sound =
  | 'Begin Level'
  | 'Level Complete'
  | 'Player Fires Gun'
  | 'Enemy Fires Gun'
  | 'Get Green Pellet'
  | 'Get Extra Shot'
  | 'Get Fast Tank'
  | 'Get Fast Bullets'
  | 'Get Extra Tank'
  | 'Enemy Destroyed'
  | 'Player Destroyed'
  | 'Defeat';

/** What the end of an explosion leads to (FUN_0040b9a0), for the dialogs. */
export type Outcome =
  { kind: 'level'; timeBonus: number; bonus: number } | { kind: 'destroyed' } | { kind: 'over' } | null;

/** A random number in [0, 1); `rand() % n` of the original is `Math.floor(random() * n)`. */
export type Random = () => number;
const below = (random: Random, n: number): number => Math.floor(random() * n);

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
const square = (x: number, y: number, size: number): Rect => ({
  left: x,
  top: y,
  right: x + size - 1,
  bottom: y + size - 1,
});
/** StarView's Rectangle::IsOver: the rectangles (inclusive bounds) share a pixel. */
const overlaps = (a: Rect, b: Rect): boolean =>
  a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
const FIELD_RECT = square(0, 0, FIELD);
const tankRect = (t: { x: number; y: number }): Rect => square(t.x, t.y, TANK);
const itemRect = (i: Item): Rect => ({ left: i.x + 3, top: i.y + 3, right: i.x + 14, bottom: i.y + 14 });
/** The opposite speed (without a negative zero). */
const back = (v: number): number => (v === 0 ? 0 : -v);

/** The frame of a tank sprite (player.png, enemy.png) for its direction: left, right, up, down. */
export function frameOf(t: { vx: number; vy: number }): number {
  if (t.vx > 0) return 1;
  if (t.vy < 0) return 2;
  if (t.vy > 0) return 3;
  return 0;
}

/** A random point on a lane (FUN_0040a250, FUN_0040b9a0): along a row or along a column. */
function lanePoint(random: Random): { x: number; y: number } {
  if (below(random, 2) === 0) {
    const y = below(random, 11) * LANE;
    return { x: below(random, 21) * TANK, y };
  }
  const y = below(random, 21) * TANK;
  return { x: below(random, 11) * LANE, y };
}

const newPlayer = (): Tank => ({ x: 180, y: MAX, vx: 0, vy: -2, turn: Turn.None, shots: 1, bulletSpeed: 5 });

/**
 * The next level (FUN_0040a250): the player at the bottom, the enemies in two rows at the top,
 * ten green pellets and the power-ups on random lane points, the time bonus.
 */
export function nextLevel(s: State, random: Random): State {
  const level = s.level + 1;
  const count = level < 10 ? 10 : Math.min(level, 20);
  const enemies: (Enemy | null)[] = Array<Enemy | null>(20).fill(null);
  for (let b = 0; b < count; b++) {
    // Two rows of ten (y = 36, then 72), filling in from both sides: x = 0, 360, 36, 324…
    const k = b % 10;
    const x = k % 2 === 0 ? k * TANK : (Math.trunc((1 - k) / 2) + 10) * LANE;
    const enemy: Enemy = {
      x,
      y: b < 10 ? LANE : 2 * LANE,
      vx: 0,
      vy: 2,
      turn: Turn.None,
      shots: 0,
      bulletSpeed: 5,
      at: null,
      cooldown: 0,
      aim: below(random, 10),
      turnChance: 10,
    };
    // The higher the level, the more enemies shoot, run faster, turn more, shoot faster.
    if (below(random, 10) < level) enemy.shots = below(random, 3) === 0 ? 2 : 1;
    if (below(random, 10) < level) enemy.vy = below(random, 3) === 0 ? 4 : 3;
    if (below(random, 20) < level) {
      const range = below(random, 3) === 0 ? 90 : 50;
      enemy.turnChance = below(random, range) + 10;
    }
    if (below(random, 20) < level) enemy.bulletSpeed = below(random, 3) === 0 ? 7 : 6;
    enemies[b] = enemy;
  }

  const player = { ...newPlayer(), turn: s.player.turn };
  const items: Item[] = [];
  for (let i = 0; i < 14; i++) {
    let at: { x: number; y: number };
    do at = lanePoint(random);
    while (
      items.some((other) => overlaps(itemRect(other), itemRect({ ...at, type: 0 }))) ||
      overlaps(itemRect({ ...at, type: 0 }), tankRect(player))
    );
    let type: number = Pellet.Green;
    if (i >= 10 && i < 13) type = i - 9;
    else if (i === 13) type = level % 5 === 0 ? Pellet.ExtraTank : below(random, 3) + 1;
    items.push({ ...at, type });
  }

  return {
    ...s,
    level,
    // (level + 4) × 200, then 20 points less per second of play.
    timeBonus: (s.level + 5) * 200,
    clock: 0,
    clockRunning: false,
    player,
    dead: false,
    enemies,
    bullets: [],
    items,
    greens: GREENS,
    enemiesLeft: count,
    enemiesAtStart: count,
    explosion: null,
    running: false,
  };
}

/** Random looks for the 10×10 blocks (`rand() & 7` each, at every new game). */
const randomWalls = (random: Random): number[] => Array.from({ length: 100 }, () => below(random, 8));

/** Game › New: three tanks, level 1. */
export function newGame(random: Random): State {
  return nextLevel(
    {
      level: 0,
      score: 0,
      tanks: 3,
      timeBonus: 0,
      clock: 0,
      walls: randomWalls(random),
      player: newPlayer(),
      dead: false,
      enemies: [],
      bullets: [],
      items: [],
      greens: GREENS,
      enemiesLeft: 0,
      enemiesAtStart: 0,
      explosion: null,
      running: false,
      clockRunning: false,
      active: true,
    },
    random,
  );
}

/** A new bullet from the front of a tank, in the first free slot. */
function fire(bullets: readonly (Bullet | null)[], t: Tank, owner: Bullet['owner']): (Bullet | null)[] {
  const s = t.bulletSpeed;
  let bullet: Bullet;
  if (t.vx < 0) bullet = { x: t.x - 4, y: t.y + 7, vx: -s, vy: 0, owner };
  else if (t.vx > 0) bullet = { x: t.x + TANK, y: t.y + 7, vx: s, vy: 0, owner };
  else if (t.vy < 0) bullet = { x: t.x + 7, y: t.y - 4, vx: 0, vy: -s, owner };
  else bullet = { x: t.x + 7, y: t.y + TANK, vx: 0, vy: s, owner };
  const next = [...bullets];
  const free = next.findIndex((b) => b === null);
  if (free >= 0) next[free] = bullet;
  else if (next.length < BULLET_SLOTS) next.push(bullet);
  return next;
}

export type Key = Direction | 'fire';

/**
 * A key press (FUN_0040b580). Fire: a bullet, if a shot is left. A direction: a turn, made at
 * the next lane crossing. A key starts the timer when it is stopped, if the tank is on a lane
 * along which it can turn that way (otherwise the turn is forgotten).
 */
export function press(s: State, key: Key): { state: State; sounds: Sound[] } {
  if (!s.active) return { state: s, sounds: [] };
  let state = s;
  const sounds: Sound[] = [];
  if (key === 'fire') {
    if (s.player.shots > 0) {
      state = {
        ...s,
        player: { ...s.player, shots: s.player.shots - 1 },
        bullets: fire(s.bullets, s.player, 'player'),
      };
      sounds.push('Player Fires Gun');
    }
  } else state = { ...s, player: { ...s.player, turn: TURNS[key] } };
  if (!state.running) {
    const { turn, x, y } = state.player;
    const offLane =
      ((turn === Turn.Left || turn === Turn.Right) && y % LANE !== 0) ||
      ((turn === Turn.Up || turn === Turn.Down) && x % LANE !== 0);
    if (offLane) state = { ...state, player: { ...state.player, turn: Turn.None } };
    else state = { ...state, running: true, clockRunning: true };
  }
  return { state, sounds };
}

/**
 * Moves a tank one tick (FUN_0040cf40): a requested turn is made where the move crosses a lane
 * (the tank is put on it); the tank stops at the field's edges, where an enemy turns at random
 * (one chance in two of a right angle, one in two of turning back).
 */
function moveTank<T extends Tank>(t: T, enemy: boolean, random: Random): T {
  let x = t.x + t.vx;
  let y = t.y + t.vy;
  let { vx, vy, turn } = t;
  if (turn !== Turn.None) {
    const [loX, hiX] = [Math.min(t.x, x), Math.max(t.x, x)];
    const [loY, hiY] = [Math.min(t.y, y), Math.max(t.y, y)];
    const laneX = Math.trunc(hiX / LANE) * LANE;
    const laneY = Math.trunc(hiY / LANE) * LANE;
    const speed = Math.abs(vx + vy) & 0xff;
    const onRow = loY <= laneY && laneY <= hiY;
    const onColumn = loX <= laneX && laneX <= hiX;
    if ((turn === Turn.Left || turn === Turn.Right) && onRow) {
      if (turn === Turn.Left ? loX > 0 : hiX < MAX) {
        [vx, vy] = [turn === Turn.Left ? back(speed) : speed, 0];
        y = laneY;
      }
      turn = Turn.None;
    } else if ((turn === Turn.Up || turn === Turn.Down) && onColumn) {
      if (turn === Turn.Up ? loY > 0 : hiY < MAX) {
        [vx, vy] = [0, turn === Turn.Up ? back(speed) : speed];
        x = laneX;
      }
      turn = Turn.None;
    }
  }
  // The original clamps one axis only: the first edge found.
  let hit = true;
  if (x < 0) x = 0;
  else if (x > MAX) x = MAX;
  else if (y < 0) y = 0;
  else if (y > MAX) y = MAX;
  else hit = false;
  if (enemy && hit) {
    if (below(random, 2) === 1) [vx, vy] = [vy, vx];
    if (below(random, 2) === 1) [vx, vy] = [back(vx), back(vy)];
  }
  return { ...t, x, y, vx, vy, turn };
}

/** Whether `p` (or its far side) is within `aim` pixels of the enemy's line. */
const inLine = (e: number, aim: number, p: number): boolean =>
  (e - aim <= p && p <= e + TANK + aim) || (e - aim <= p + TANK && p + TANK <= e + TANK + aim);

/** An enemy fires when the player is ahead of it, close enough to its line (`aim`). */
function aims(e: Enemy, p: Tank): boolean {
  if (e.vx < 0) return p.x < e.x && inLine(e.y, e.aim, p.y);
  if (e.vx > 0) return e.x < p.x && inLine(e.y, e.aim, p.y);
  if (e.vy < 0) return p.y < e.y && inLine(e.x, e.aim, p.x);
  return e.y < p.y && inLine(e.x, e.aim, p.x);
}

const blast = (t: { x: number; y: number }) => ({ x: t.x - 7, y: t.y - 7, counter: 0 });
const score = (s: number) => s & 0xffff;

/** The end of an explosion, or a green pellet picked up (FUN_0040b9a0). */
function settle(s: State, sounds: Sound[]): { state: State; outcome: Outcome } {
  if (s.dead) {
    const tanks = s.tanks - 1;
    if (tanks === 0) {
      sounds.push('Defeat');
      return { state: { ...s, tanks, running: false, active: false }, outcome: { kind: 'over' } };
    }
    return { state: { ...s, tanks, running: false }, outcome: { kind: 'destroyed' } };
  }
  if (s.greens > 0 && s.enemiesLeft > 0) return { state: s, outcome: null };
  // The peace bonus: no enemy destroyed; the war bonus: every enemy, no green pellet.
  const bonus = s.enemiesLeft === s.enemiesAtStart ? 1000 : s.greens === GREENS ? 300 : 0;
  sounds.push('Level Complete');
  return {
    state: { ...s, score: score(s.score + bonus), running: false, clockRunning: false },
    outcome: { kind: 'level', timeBonus: s.timeBonus, bonus },
  };
}

/**
 * After "TANK DESTROYED!": the bullets are gone and the player comes back on a random lane
 * point, away from the enemies' squares, rows and columns, with its power-ups lost.
 */
export function respawn(s: State, random: Random): State {
  // The enemies get back the shots they had in flight.
  const enemies = s.enemies.map((e, i) =>
    e ? { ...e, shots: e.shots + s.bullets.filter((b) => b?.owner === i).length } : e,
  );
  // The original tries until it finds such a point; a browser tab should not hang if there is
  // none, so the 10,000th try is taken anyway.
  for (let attempt = 1; ; attempt++) {
    const at = lanePoint(random);
    const clear =
      attempt >= 10000 ||
      enemies.every((e) => !e || (!overlaps(tankRect(e), tankRect(at)) && e.x !== at.x && e.y !== at.y));
    if (clear) {
      return {
        ...s,
        enemies,
        bullets: [],
        dead: false,
        player: { ...s.player, ...at, vx: 0, vy: -2, bulletSpeed: 5, shots: 1 },
      };
    }
  }
}

export interface StepResult {
  state: State;
  sounds: Sound[];
  outcome: Outcome;
}

/**
 * One tick of the timer (FUN_0040bf10). While an explosion plays, nothing else moves. Otherwise:
 * the time bonus; the bullets (a player's bullet destroys an enemy, an enemy's the player); the
 * player and what it drives over; the enemies (they fire, collide, wander). A destruction ends
 * the tick and sets off an explosion.
 */
export function step(s0: State, random: Random): StepResult {
  const sounds: Sound[] = [];
  if (!s0.active || !s0.running) return { state: s0, sounds, outcome: null };
  let s = s0;

  if (s.explosion) {
    const { counter } = s.explosion;
    if (counter === 0) {
      sounds.push(s.dead ? 'Player Destroyed' : 'Enemy Destroyed');
      return { state: { ...s, explosion: { ...s.explosion, counter: 1 } }, sounds, outcome: null };
    }
    if (counter < 5)
      return { state: { ...s, explosion: { ...s.explosion, counter: counter + 1 } }, sounds, outcome: null };
    const settled = settle({ ...s, explosion: null }, sounds);
    return { ...settled, sounds };
  }

  // The time bonus counts down 20 points per second of play, to 0.
  const clock = s.clockRunning ? s.clock + TICK_MS : s.clock;
  let { timeBonus } = s;
  if (timeBonus !== 0) timeBonus = Math.max(0, ((s.level * 5 + 20) * 2 - Math.floor(clock / 1000)) * 20);
  s = { ...s, clock, timeBonus };

  // Bullets.
  const bullets = [...s.bullets];
  const enemies = [...s.enemies];
  let player = s.player;
  const giveBack = (owner: Bullet['owner']) => {
    if (owner === 'player') player = { ...player, shots: player.shots + 1 };
    else if (owner !== null && enemies[owner])
      enemies[owner] = { ...enemies[owner]!, shots: enemies[owner]!.shots + 1 };
  };
  for (let i = 0; i < bullets.length; i++) {
    const b0 = bullets[i];
    if (!b0) continue;
    const b = { ...b0, x: b0.x + b0.vx, y: b0.y + b0.vy };
    bullets[i] = b;
    const r = square(b.x, b.y, BULLET);
    if (!overlaps(r, FIELD_RECT)) {
      giveBack(b.owner);
      bullets[i] = null;
    } else if (b.owner === 'player') {
      const hit = enemies.findIndex((e) => e?.at && overlaps(tankRect(e.at), r));
      if (hit >= 0) {
        giveBack(b.owner);
        bullets[i] = null;
        // That enemy's bullets fly on, but nobody gets them back (they can still hit the player).
        for (let j = 0; j < bullets.length; j++)
          if (bullets[j]?.owner === hit) bullets[j] = { ...bullets[j]!, owner: null };
        const e = enemies[hit]!;
        enemies[hit] = null;
        return {
          state: {
            ...s,
            player,
            bullets,
            enemies,
            enemiesLeft: s.enemiesLeft - 1,
            score: score(s.score + 50),
            explosion: blast(e),
          },
          sounds,
          outcome: null,
        };
      }
    } else if (overlaps(r, tankRect(player))) {
      return {
        state: { ...s, player, bullets, enemies, dead: true, clockRunning: false, explosion: blast(player) },
        sounds,
        outcome: null,
      };
    }
  }

  // The player, then what it drives over.
  player = moveTank(player, false, random);
  const items = [...s.items];
  let { greens, tanks } = s;
  s = { ...s, player, bullets, enemies };
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !overlaps(itemRect(item), tankRect(player))) continue;
    items[i] = null;
    if (item.type === Pellet.Green) {
      sounds.push('Get Green Pellet');
      greens -= 1;
      s = { ...s, items, greens, score: score(s.score + 50) };
      const settled = settle(s, sounds);
      if (settled.outcome) return { ...settled, sounds };
    } else if (item.type === Pellet.ExtraShot) {
      sounds.push('Get Extra Shot');
      player = { ...player, shots: player.shots + 1 };
    } else if (item.type === Pellet.FastBullets) {
      sounds.push('Get Fast Bullets');
      player = { ...player, bulletSpeed: player.bulletSpeed + 2 };
    } else if (item.type === Pellet.FastTank) {
      sounds.push('Get Fast Tank');
      const faster = (v: number) => (v > 0 ? v + 1 : v < 0 ? v - 1 : v);
      player = player.vx !== 0 ? { ...player, vx: faster(player.vx) } : { ...player, vy: faster(player.vy) };
    } else {
      tanks += 1;
      sounds.push('Get Extra Tank');
    }
  }
  s = { ...s, player, items, greens, tanks };

  // The enemies.
  let shots = s.bullets;
  for (let i = 0; i < enemies.length; i++) {
    const e0 = enemies[i];
    if (!e0) continue;
    let e: Enemy = { ...e0, cooldown: e0.cooldown > 0 ? e0.cooldown - 1 : 0 };
    e = moveTank(e, true, random);
    if (overlaps(tankRect(e), tankRect(player))) {
      enemies[i] = { ...e, at: { x: e.x, y: e.y } };
      return {
        state: { ...s, bullets: shots, enemies, dead: true, clockRunning: false, explosion: blast(player) },
        sounds,
        outcome: null,
      };
    }
    if (e.shots > 0 && e.cooldown === 0 && aims(e, player)) {
      shots = fire(shots, e, i);
      e = { ...e, shots: e.shots - 1 };
      if (e.shots > 0) e = { ...e, cooldown: 20 };
      sounds.push('Enemy Fires Gun');
    }
    // Running into another enemy (as it was last tick): back where it was, turned around.
    if (enemies.some((other, j) => j !== i && other?.at && overlaps(tankRect(other.at), tankRect(e)))) {
      e = { ...e, x: e0.x, y: e0.y, vx: back(e0.vx), vy: back(e0.vy) };
    } else e = { ...e, at: { x: e.x, y: e.y } };
    if (below(random, 1000) < e.turnChance) {
      e = { ...e, turn: e.vy === 0 ? below(random, 2) + Turn.Up : below(random, 2) + Turn.Left };
    }
    enemies[i] = e;
  }
  return { state: { ...s, bullets: shots, enemies }, sounds, outcome: null };
}
