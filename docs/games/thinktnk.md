# Think Tank (`thinktnk.exe`)

A tank drives the lanes of a city of blocks, picks up green pellets and power-ups, and shoots
enemy tanks that wander and shoot back. Real time: everything moves on a 50 ms timer.

## Data

- **Window**: client area 512×378 (resource 311/256). Default background 12 (Light Red: help
  id 1200). The field is the square 0…378 (black); the panels are on the window background.
- **Bitmaps** (→ `src/assets/thinktnk/`): 257 `enemy.bmp` (an enemy facing left, right, up,
  down, 18×18, then one mask, which the game reads from x = 71, one pixel early), 258 `misc.bmp`
  (five 12×12 pellets drawn opaque, then the 4×4 bullet and its mask), 259 `player.bmp` (the
  player facing left, right, up, down, masks below), 260 `walls.bmp` (eight 18×18 block looks),
  261 `explode.bmp` (five 32×32 frames, masks below), 262 `logo.bmp` (masked, drawn at 382, 4).
- **Dialogs**: 256 options (Options: Player Keys; Extras), 257 "Level Complete!" (Time Bonus =,
  Peace/War Bonus =, Prepare For Level), 258 "Ouch!" (TANK DESTROYED!, Tanks Remaining =,
  Continuing Level), CZGAME's "You Lose!" ("You have / no more tanks!"), high scores.
- **Keys**: the same table as Cheesy Pursuit's (68 names); registry values `MoveLeft`,
  `MoveRight`, `MoveUp`, `MoveDown`, `FireGun`; defaults arrows and Space.

## Code

| Function    | What                                                                                 |
| ----------- | ------------------------------------------------------------------------------------ |
| `0x409420`  | Window constructor: keys, bitmaps, sound events, 50 ms AutoTimer, first game         |
| `0x40a250`  | Next level: enemies, player, pellets, time bonus, "Begin Level"                      |
| `0x40a9a0`… | The panels: Score, Tanks (`0x40ab80`), Level (`0x40ad60`), Time Bonus (`0x40af40`)   |
| `0x40b120`  | Draws the field, the blocks, the pellets, the logo and panels into the backing store |
| `0x40b580`  | Key handler: fire, turn requests, starting the timer                                 |
| `0x40b9a0`  | End of an explosion or a green pellet: tank lost, game over, level complete          |
| `0x40bf10`  | Timer tick                                                                           |
| `0x40cf40`  | Moving a tank: turns at lane crossings, edges                                        |
| `0x40d700`  | Menu commands (New, Show High Scores, Options)                                       |
| `0x4077b0`… | The time bonus's stopwatch (GetTickCount, paused and resumed)                        |

## Rules

- **Field**: 10×10 blocks of 18×18 at (18 + 36i, 18 + 36j), in random looks (`rand() & 7`,
  drawn anew at every Game › New); lanes every 36 pixels between them. The blocks are only
  scenery: tanks and bullets move along lanes.
- **Tanks** (`0x40cf40`) move by their speed every tick. A requested turn is made when the move
  crosses (or is on) a lane in the other direction: the tank is put on the lane, keeps its speed
  in the new direction (not towards an edge it is at). At an edge a tank stops (one axis is
  clamped per tick); an enemy then turns at random: one chance in two of a right angle, one in
  two of reversing.
- **Player**: starts each level at (180, 360) going up at 2 pixels per tick, with one shot (one
  bullet in flight at a time; it comes back when the bullet is gone) at 5 pixels per tick. The
  arrow keys request turns; the fire key fires from the tank's front. The timer starts at a key
  press, if the tank is on a lane for the requested turn (otherwise the request is dropped).
- **Pellets**: ten green ones, then an extra shot, fast bullets, a fast tank, and either an extra
  tank (every fifth level) or a random one of the first three, on random lane points not
  overlapping each other or the player. Green: 50 points; extra shot: +1 bullet in flight; fast
  bullets: +2 pixels per tick; fast tank: +1 pixel per tick; extra tank: +1 tank. Power-ups last
  until the end of the level or the tank.
- **Enemies**: 10, then from level 10 as many as the level (at most 20), in rows at y = 36 and
  72 (x = 0, 360, 36, 324…), going down. Each is drawn at its level: one chance in ten per level
  of shooting (1 shot, or 2 one time in three), of a speed of 3 (4 one time in three) instead of
  2; one chance in twenty per level of turning more (10 + 0…49 or 0…89 per thousand per tick
  instead of 10) and of faster bullets (6, or 7). Each has an aim of 0…9 pixels.
- **Enemy tick**: moves; touching the player destroys it; fires when the player is ahead of it
  in its direction and within its aim of its line (then waits 20 ticks if it has shots left);
  backs off and reverses when it would overlap another enemy; may request a random turn.
- **Bullets**: move every tick; leave at the field's edge. A player's bullet destroys the enemy it
  hits (50 points); an enemy's bullet (or one whose enemy was destroyed) destroys the player.
- **Explosions** freeze the game: set off at a destruction, then five frames, one per tick. Then
  (`0x40b9a0`): a destroyed player loses a tank ("Ouch!" dialog; the player comes back on a
  random lane point not on an enemy's row, column or square; bullets cleared; power-ups lost),
  or "You Lose!" and the high score prompt after the last one.
- **Level complete** when no green pellet or no enemy is left: the peace bonus (1000) if no enemy
  was destroyed, else the war bonus (300) if no green pellet was taken; dialog 257, next level.
- **Time bonus**: (level + 4) × 200 at the start of a level, 20 points less per second of play
  (the stopwatch runs from the first key press, stops while the player is destroyed, dialogs
  and menus are up), down to 0. It is shown in the panel and the level dialog but **never
  added to the score** (the original adds only the peace/war bonus).
- **Score** is 16 bits (wraps at 65,536). One high score table ("Hall of Fame").

## Sound events (and their default sounds)

| Event            | Default    |
| ---------------- | ---------- |
| Think Tank Start | (none)     |
| Think Tank Exit  | (none)     |
| Begin Level      | `charge`   |
| Level Complete   | `crowd_4`  |
| Player Fires Gun | `gunshot`  |
| Enemy Fires Gun  | `gunshot3` |
| Get Green Pellet | `dig_5`    |
| Get Extra Shot   | `gunshot5` |
| Get Fast Tank    | `carpass2` |
| Get Fast Bullets | `dig_4`    |
| Get Extra Tank   | `handel`   |
| Enemy Destroyed  | `gunshot6` |
| Player Destroyed | `gunshot2` |
| Defeat           | `dig_7`    |

## Timing

The timer is a 50 ms StarView AutoTimer (`Timer::ChangeTimeout(0x32)`). Under Wine the time
bonus drops 40 points every 2 s, as the formula says.

## Deviations from the original

- The time bonus is computed from game ticks (50 ms each while the stopwatch runs) rather than
  GetTickCount.
- After the last green pellet, the original runs the level dialog and the next level inside
  the tick, then goes on with that tick (the new enemies make one move); here the tick ends.
- Respawning gives up looking for a free lane point after 10,000 tries (the original would loop).
- Settings go to localStorage; high scores are shared on the instance (or kept in the browser
  without a database: see DECISIONS.md, D11); Help has How to Play and About only.
- Swipes turn, a tap fires (touch only), and an on-screen pad with Fire and New.
- The level dialog's colours are guessed (only "Ouch!" was seen under Wine).
