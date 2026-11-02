# Cheesy Pursuit (`cheesy.exe`)

A mouse eats the cheddar slices of a board of square cells while cats cross the board in
straight lines. Real time: the cats move on a 50 ms timer, the mouse one cell per key press.

## Data

- **Window**: client area 368×328 (its resource, 311/256). Default background 22 (Brown
  Scrunch) and board 3 ("Beveled"): the window's help id is 2230, read by the shared code as
  background = id / 100, board = (id % 100) / 10.
- **Bitmaps**: 257 `cat.bmp` (one 36×36 cat, mask on its right), 258 `mice.bmp` (Hector facing
  left, right, Nestor facing left, right, then the masks of a mouse facing left and right, all
  32×32), 259 `cheese.bmp` (cheddar, gouda, CheeseBomb, each 32×32 followed by its mask). →
  `src/assets/cheesy/`. The board's cells come from CZGAME32.DLL's `board.bmp` (shared): eight
  boards of 80×40, each the edge-cell tile then the inner-cell tile.
- **Dialogs**: 256 options (tabs Options, Pieces, Extras), 257 "You Completed Level: / Prepare
  For Level:", 258 "GOTCHA! / Mice Remaining:". The shared ones of CZGAME32.DLL: 1002 "You
  Lose!" (with `iwin2.bmp`), 3000 high scores (`flag2.bmp`), 3001 name prompt (ribbons).
- **Keys** (Options › Player Keys): a table of 68 key names (`0x416000`, "Up", "Down", … "=",
  ended by "EOL") and StarView key codes (`0x416118`). Defaults: arrows, Space for the bomb.
  Registry values `MoveLeft`, `MoveRight`, `MoveUp`, `MoveDown`, `CheeseBomb`, `MouseType`,
  `Size`.

## Code

| Function    | What                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| `0x401000`  | Window constructor: settings, bitmaps, sound events, the 50 ms AutoTimer            |
| `0x401c80`  | Game › New: level 0, 1 bomb, 3 mice, cat speed 2, next life at 20,000, board origin |
| `0x401d90`  | High score table by board size, titled "Hall of Fame - 7 x 5 board"…                |
| `0x402040`  | Next level: board, cheeses, cat speed, title "Cheesy Pursuit - Level n"             |
| `0x402380`  | Timer tick: cats move, leave, enter; catch                                          |
| `0x403120`  | Key handler: moves, eating, bomb, level completion                                  |
| `0x403ab0`… | The four panels (score, slice value, bombs, mice); `0x403ab0` also gives extra mice |
| `0x403ee0`  | Draws the panels and the board into the window's backing store                      |
| `0x404190`  | Paint: backing store, mouse, cats (clipped to the board)                            |
| `0x404b10`  | Menu commands (New, Show High Scores, Options)                                      |
| `0x405210`  | Paint of dialog 257 (a frame of the player's mouse), `0x405460` of 258 (cats)       |
| `0x409440`  | Sprite slide (the cat's pounce), with the AnimationDelay busy loop                  |
| `0x40d170`  | High score: place, name prompt, table insertion                                     |

## Rules

- **Board**: 5×3, 7×5 (default) or 9×7 cells of 40×40 pixels, centred under the panels. Each
  level (`0x402040`): every cell a cheddar slice; four times, one chance in two of a gouda on a
  random cell; one chance in two of a CheeseBomb on a random cell; the mouse in the middle cell,
  emptied. The level is in the title.
- **Mouse** (`0x403120`): one cell per key press (keyboard auto-repeat included), not off the
  board, not onto a cell a cat overlaps. Left and right turn it. On its new cell it eats: a
  cheddar slice scores the slice value (2 × level + 8), a gouda raises the slice value by
  2 × level + 8 for the rest of the level, a CheeseBomb adds a bomb. The first move of a level
  or of a new mouse starts the cats' timer.
- **Level complete** when a cheddar slice is eaten and none is left (gouda and bombs may
  remain): "Level Complete" sound, dialog 257, next level. Bombs, mice and score carry over.
- **CheeseBomb key**: once the cats run and with a bomb left, every cat reverses ("Detonate
  CheeseBomb"); otherwise the "Out of CheeseBombs" sound. One bomb at the start of a game.
- **Cats** (`0x402380`, every 50 ms):
  1. Each cat, in order, moves by its speed, unless its moved 36×36 square would overlap another
     cat (as that one is now): then it reverses instead.
  2. Cats no longer overlapping the board leave (the loop skips the cat after a removed one).
  3. With fewer than 10 cats and fewer than level + 1, one cat may enter: a random edge cell
     (among 2 × (columns + rows)), unless a cat touches that cell's outer side (up to 100
     tries). It enters straight in, 2 pixels inside the cell's sides, at the current speed;
     then three times one chance in four of 1 pixel per tick more; then one chance in five of
     a diagonal (the other axis gets the same speed, either way).
  4. A cat overlapping the mouse's 32×32 square (4 pixels inside its cell) gets it.
- **Cat speed**: 2 pixels per tick up to level 10, then level − 8, at most 10.
- **Caught**: the timer stops, "Cat Gets Mouse", the cat slides onto the mouse (2 pixels inside
  its cell, 2 pixels per step, `0x409440`). With mice left: dialog 258 with the mice remaining,
  then the next mouse starts in the middle cell, the cats are gone. The last mouse: "Defeat"
  sound, "You Lose!" ("The cats got / all your mice!"), the name prompt if the score makes the
  table, and the game stops (the board stays, keys do nothing until Game › New).
- **Extra mouse** at 20,000 points, then every 20,000 (checked when a cheddar slice is eaten).
  The rules text says 10,000: the code says 20,000.
- **High scores**: a table of ten per board size, higher first: a score takes the first place
  that is empty or held by a lower score (ties go below). Game › Show High Scores; Clear Scores
  asks first.
- Game › New during a game asks "Are you sure you want to abandon the game in progress?"; OK in
  Options during a game asks "Changing the game options will restart the game in progress…".
  Options › OK starts a new game.

## Timing

- The cats' timer is a StarView AutoTimer of 50 ms (`Timer::ChangeTimeout(0x32)`); measured
  under Wine: a cat moving 3 pixels per tick covers 96 pixels in 1.63 s (51 ms per tick).
  Windows 95's timer granularity (55 ms) would make the original slightly slower there.
- Menus and dialogs pause the timer (`0x401c40`, called around every menu command).
- The pounce's steps wait AnimationDelay × 10 iterations of an empty loop (AnimationDelay is
  calibrated by `0x405d40` from the CPU type: 0 on a 386, 6000 on a 486, 14000 on a Pentium,
  10000 otherwise): taken here as 5 ms per 2-pixel step.

## Sound events (and their default sounds)

| Event                | Default   |
| -------------------- | --------- |
| Cheesy Pursuit Start | (none)    |
| Cheesy Pursuit Exit  | (none)    |
| Eat Cheese           | `mouse_7` |
| Eat Gouda            | `mouse_9` |
| Eat CheeseBomb       | `mouse_7` |
| Detonate CheeseBomb  | `burp`    |
| Out of CheeseBombs   | `cuckoo`  |
| Cat Gets Mouse       | `mouse_5` |
| Level Complete       | `instr_1` |
| Defeat               | `instr_2` |

## Deviations from the original

- The mice panel shows the mice left; the original only redraws it at a new level or an extra
  mouse, so it keeps showing 3 after a mouse is lost.
- The 9 x 7 board is kept across visits; the original saves it but only reads back 5 x 3 or
  7 x 5 (a 9 x 7 setting comes back as 7 x 5).
- Dialogs 257 and 258 are titled "Cheesy Pursuit" (the original's say "ModalDialog").
- The cat's pounce lasts about 5 ms per step (the original's busy loop depends on the CPU).
- Settings go to localStorage; high scores are shared on the instance (or kept in the browser
  without a database: see DECISIONS.md, D11); Help has How to Play and About only.
- Swipes on the play field and an on-screen pad (with Bomb and New) on touch screens.
