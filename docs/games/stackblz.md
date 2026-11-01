# StackBlitz (`stackblz.exe`)

Stacks of three pieces fall down a well six columns wide; rearrange them as they fall, and line
up three of a kind (vertically, horizontally or diagonally) to make them vanish. The stacks fall
faster every ten lines.

## Data

- **Piece sets**: Windows bitmaps 260-266 (StarView bitmaps 300-306, `piece1.bmp`…), 192×32, six
  32×32 pieces, no masks. Names in type 273 id 256: `Circles,Squares,Faces,Bevels,Traffic,Flags,
Monochrome`. The game composes a 320×32 strip (`FUN_00407c80`): code 0 (the empty cell) and the
  three special pieces 7-9 from `piecex.bmp` (Windows bitmap 259: empty, skull bomb, bomb, bomb
  with an arrow), 1-6 from the chosen set. → `src/assets/stackblz/pieces.png`, one row per set.
- **Bonus icons**: `b_horz.bmp`, `b_diag.bmp` (Windows bitmaps 257, 258, 20×20), in the window
  resource. → `horizontal.png`, `diagonal.png`.
- **Window** (StarView window 256, client 320×431): FixedTexts "Next Piece" (Arial 20, yellow),
  "Score", "Stacks" (Arial 16, yellow) and their values (white), the eight values of the table.
  The paint handler (`FUN_00408b90`) frames four black boxes with a 3-pixel light red pen: the
  well (4,4)-(201,425), the next stack (207,4)-(316,105), score (207,112)-(316,193), values
  (207,200)-(316,425); cells are at x = 32·col + 7, y = 391 − 32·row. When no game runs it
  writes "Press F2 / To Begin" (font 256: Arial 32 bold, yellow, red outline) over the well.
- **Timer timeouts** per level, ms, at `0x411370`: 1000, 850, 700, 600, 500, 425, 350, 300, 250,
  200, 150, 100, 50, 30, 20, 10, 5, 2.
- **Keys**: names at `0x4111c8` (`Up`, `Down`, `Left`, `Right`, `0`-`9`, `A`-`Z`, `F1`-`F12`,
  `Home`… `=`), StarView key codes at `0x4112e0`. Defaults: Piece Left = Left, Piece Right =
  Right, Drop Piece = Space, Rotate Up = **Down**, Rotate Down = **Up** (key codes 0x402, 0x403,
  0x504, 0x400, 0x401). Saved as `KeyLeft`, `KeyRight`, `KeyRotateUp`, `KeyRotateDown`,
  `KeyDropPiece`; the piece set as `PieceToUse`.
- **Messages**: type 304 id 256, "Game Over" / "Sorry, you stacked 'em a bit too high!";
  CZGAME32.DLL type 306 ids 1000 (options restart the game), 1001 (abandon the game), 3000
  (clear the high scores).

## Rules

- **Grid** (`this+0xf00`): 6 columns × 15 rows, column-major, row 0 at the bottom; rows 0-12 are
  visible. `FUN_00407aa0` reads a cell, 0 outside rows 0-12.
- **Stacks** (`FUN_00407ae0`): `rand() % 10 == 0` gives a special piece alone, `7 + rand() % 3`;
  otherwise three pieces, each `rand() % 48`: 0-11 → 1, 12-23 → 2, 24-34 → 3, 35-40 → 4,
  41-44 → 5, 45-47 → 6. The next stack is drawn first, then the column: `2 + rand() % 2`. The
  stack appears with its bottom piece on row 12 (the two above are hidden).
- **Timer** (`FUN_00409960`, a StarView `AutoTimer`): each tick the stack moves down a row, or
  lands when on row 0 or on a piece. Landing restarts the timer (`Timer::Start`).
- **Keys** (`FUN_0040a120`, only while playing): left/right if the cell beside the _bottom_ piece
  is free; Rotate Up moves the pieces down (`[a, b, c]` → `[b, c, a]`, bottom first), Rotate
  Down up; special pieces do not rotate; Drop puts the stack on the column's lowest free cell and
  lands it at once.
- **Landing**: a stack fills its three cells (rows above 12 included), "Piece Landing". The
  special pieces ("Bomb" sound) are not placed: 8 (bomb) removes the piece under it, 9 (drill)
  the whole column under it, 7 (skull) every piece of the colour it lands on, then the rest
  falls. On the floor they do nothing. Removed pieces score their value.
- **Matches** (`FUN_00408fb0`, repeated while it finds any): for each cell of rows 0-12, three in
  a row upwards, rightwards, up-right and up-left, in that order; each is a stack ("Vertical
  Stack", "Horizontal Stack", "Diagonal Stack"), so four in a row are two. A horizontal stack
  scores 2 × level, a diagonal one 3 × level, a vertical one nothing; then each marked piece
  scores its value, piece × level (1-6 × level), and goes. The rest falls (`FUN_00409750`, rows
  1-12 only: pieces in the hidden rows 13-14 stay where they are).
- **Level** (`FUN_00408940`): `min(stacks / 10, 17) + 1`; a new timeout ("New Level" sound)
  when it differs from the timer's. It is recomputed at a new game and after a round of matches
  — **only when the stack count is not a multiple of 10** (`stacks % 10 != 0`, checked in the
  disassembly at `0x4096a9`): the 10th stack raises the level only with the next round.
- **Game over**: after landing and matches, any piece on row 12: timer stopped, "Game Over",
  then the high score check.
- **New** (F2, menu item 11): asks "Are you sure you want to abandon the game in progress?"
  during a game; clears the grid, score and stacks, timeout 1000, the next stack falls.
- **Options › OK** during a game asks first (CZGAME32 306/1000), then ends the game: the grid
  stays under "Press F2 To Begin".
- **Pause** (`FUN_0040ae30`): the timer stops while a menu command runs or the window is
  minimised, and starts again (a full timeout) afterwards.

## High scores (shared code, CZGAME32 dialogs 3000 and 3001)

- Ten names and scores in the registry (`Name__0_0`… `Name__0_9`, `Score_0_0`… `Score_0_9`: table
  0, entry _n_; and `PlayerName`), higher first
  (`FUN_004066c0`, the flag `1`). `FUN_00406930`: the score enters at the first slot that is
  empty or lower (so any score, 0 included, while the table has a free slot); the slots below
  move down. "Enter your high score": blue and red ribbons (`blue_ri2.bmp`, `red_rib2.bmp`),
  "Congratulations!" (Arial 24 bold, dark red), "You have a high score. / Please enter your
  name", the last name entered. Otherwise the Game Over message.
- Hall of Fame (`FUN_00407510`): the chequered flag (`flag2.bmp`, mask on the right), ten rows
  of white boxes (rank 18 px, name 160 px, score 60 px wide, 18 high, Arial 13), row _i_ at
  (10 + 11i, 10 + 27i); OK and Clear Scores ("Are you sure you want to clear the scores in the
  high score table?").
- The web version: [src/shell/highscores.ts](../../src/shell/highscores.ts) and
  [HallOfFame.tsx](../../src/shell/HallOfFame.tsx), shared by every game with high scores.

## Sound events (and their default sounds)

| Event            | Default   |
| ---------------- | --------- |
| StackBlitz Start | (none)    |
| StackBlitz Exit  | (none)    |
| Rotate Up        | `click_5` |
| Rotate Down      | `click_4` |
| Piece Landing    | `click_1` |
| Vertical Stack   | `boing_3` |
| Horizontal Stack | `boing_1` |
| Diagonal Stack   | `boing_4` |
| Bomb             | `pop3`    |
| New Level        | `laugh_1` |
| Game Over        | `dig_7`   |

## Timing

The simulation (`step`) advances 1 ms at a time; the browser runs it on animation frames, with
the elapsed time (at most 250 ms at once), paused while the tab is hidden, a dialog is open or a
menu is pulled down; the timer then restarts, as `Timer::Start` does. Measured against the
original under Wine: one row per second at level 1 in both.

## Deviations from the original

- The original's default background is derived from the clock at start-up; here Psychedelic
  (the one it showed in the reference screenshots).
- The timeouts of the last levels (10, 5 and 2 ms) are used as they are; Windows 95 timers
  ticked every 55 ms at best, so there the original could not fall faster than about 18 rows per
  second.
- The key choice lists the original's keys, matched on `KeyboardEvent.key` (letters
  case-insensitively); keys with Ctrl, Alt or Meta are left to the browser and the menus.
- Touch: drag the stack sideways, tap to rotate it (Rotate Up), swipe down to drop it; an
  on-screen pad (arrows as the default keys, New, Drop).
- Help: "How to Play" shows the launcher's rules text (no WinHelp, no Balloon Help).
