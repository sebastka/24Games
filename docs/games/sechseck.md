# Sechseck (`sechseck.exe`)

Drag pieces onto a board of hexagons ("Sechseck" is German for hexagon); each piece has a colour
and a shape, and scores by the traits it shares with its neighbours. Be quick: every five seconds
without a piece placed, a skull takes a free cell. The game ends when the board is full.

## Data

- **Shapes**: `bits.bmp` (Windows bitmap 257, 64×80): 4 shapes (square, triangle, circle,
  diamond; columns) × 4 colours (red, blue, green, yellow; rows) of 16×16, then a row of 16×16
  masks, one per shape. → `src/assets/sechseck/shapes.png` (masks applied).
- **Tiles**: `mult.bmp` (258, 128×64): skull, ×2, ×3, ×4, 32×32, masks below. → `tiles.png`.
- **Piece background**: `piece.bmp` (259, 74×40): a grey 37×40 hexagon, mask on the right. →
  `piece.png`. A piece is drawn as the hexagon, then its shape at (+10, +12) (`FUN_0040b7e0`).
- **Window** (StarView window 256): client 512×322. Fonts 256 (Arial 22, light red: the score)
  and 257 (Arial 14 bold, blue: "Score").
- **Match points** at `0x4141ee`: 0, 1, 2, 4, 8 … 2048 (index = traits matched, 0-12).
- **Messages**: "Game Over" / "Your final score is _n_" (a MessBox built in code); CZGAME32.DLL
  type 306 ids 1000, 1001 and 3000 (as StackBlitz).

## Board

- **Cells** (`FUN_00408f60`): `size` × `size` (Options › Board Size: Small 4, Medium 6, Large 8;
  registry `BoardSize` 0-2, default Medium), row-major. A cell is a 42×48 box, odd rows shifted
  right by 21, rows 36 apart; the board's top left is (90, 80), (50, 40) or (11, 11). The
  hexagon (`FUN_00408e90`) has 12-pixel slanted edges; white, black outline 2 pixels wide.
- **Cell values**: 0 empty, 1-16 a piece (piece + 1), 17 a skull, 18-20 ×2, ×3, ×4 (free cells).
  A piece is 0-15: colour = `piece & 3`, shape = `piece >> 2`.
- **Neighbours** (`FUN_00409210`), directions 0-5 clockwise from the upper right: even rows
  (c, r−1), (c+1, r), (c, r+1), (c−1, r+1), (c−1, r), (c−1, r−1); odd rows (c+1, r−1), (c+1, r),
  (c+1, r+1), (c, r+1), (c−1, r), (c, r−1).
- **The right-hand side** (`FUN_0040b3e0`): bevelled boxes (2-pixel raised frame, 2-pixel sunken
  inner frame): the time bar (378,4)-(510,36), the score (378,40)-(509,119) with "Score" in
  (390,55)-(498,73) and the number in (390,76)-(498,104), the pieces (378,125)-(509,317), the
  four pieces at (400,157), (450,188), (400,219), (450,250).

## Rules

- **New game** (`FUN_0040a1f0`, also when the window opens and after Options › OK): an empty
  board; `size² / 4` times, `rand() % 13` picks ×4 (0-1), ×3 (2-4) or ×2, put at row
  `rand() % size`, column `rand() % size` (the same cell can be picked twice); then four pieces,
  `rand() % 16`. Score 0. The timer does not run until the first piece is placed.
- **Dragging** (shared code `0x403a10`-`0x404020`): a press on one of the four pieces picks it up
  ("Piece Drag"); anywhere else, `Sound::Beep`. With Drag Pieces the piece follows the mouse
  (held where it was grabbed) and its slot is empty; with Drag Outlines an inverted rectangle
  follows it. Each free cell has two drop zones (`FUN_0040a490`): (l, t+10)-(r, b−10) and
  (l+11, t+4)-(r−11, b−4). Released on a zone, the piece is placed; elsewhere it goes back.
  Show Drag Zones / Show Drop Zones outline the piece or zone under the mouse (an inverted
  rectangle, 3 or 1 pixels wide).
- **Placing** (`FUN_0040a860`): the multiplier is 1 on an empty cell, 2-4 on a multiplier. For
  each of the 6 neighbours holding a piece, one match if same colour, one if same shape; "Match
  _n_" sound; the score (a 16-bit counter) grows by `points[n] × multiplier`. The slot gets a new
  piece, `rand() % 16`. If no cell is free, the game is over; otherwise the stopwatch is reset
  and the timer started.
- **Timer** (`FUN_00409430`, every 100 ms): the time bar shows the stopwatch, dark red,
  `125 × min(t, 5000) / 5000` pixels wide. When `t / 1000 > 4` (5 s): "Penalty"
  (`FUN_0040afb0`): with _n_ free cells, the `rand() % n + 1`-th free cell in row order (a
  multiplier as well) becomes a skull, and a drag in progress is cancelled; then the game-over
  check, else the stopwatch restarts.
- **Pauses** (`FUN_0040bd00`, `FUN_0040a090`): during a menu command, and while the window is
  minimised, the stopwatch stops (it goes on afterwards from where it was) and the timer stops;
  afterwards the timer restarts and fires at once. New and Options leave it stopped (a new game).
- **Game over** (`FUN_0040ab00`): no empty or multiplier cell left: the timer stops, "Game
  Over", the message "Your final score is _n_", then the high score check.
- **New** (F2) during a game asks "Are you sure you want to abandon the game in progress?" (a
  game is in progress from the start); Options › OK asks "Changing the game options will restart
  the game in progress…" and starts a new game.

## High scores

As StackBlitz's (see [stackblz.md](stackblz.md#high-scores-shared-code-czgame32-dialogs-3000-and-3001)),
with one table per board size (`FUN_004081e0`: registry values `Name__<size>_<n>` and `Score_<size>_<n>`, size 0-2),
titled "Hall of Fame - Small board" (Medium, Large).

## Sound events (and their default sounds)

| Event          | Default    |
| -------------- | ---------- |
| Sechseck Start | (none)     |
| Sechseck Exit  | (none)     |
| Piece Drag     | `click_5`  |
| Match 0        | `click_4`  |
| Match 1        | `click_1`  |
| Match 2        | `click_2`  |
| Match 3        | `click_6`  |
| Match 4        | `boing_7`  |
| Match 5        | `boing_1`  |
| Match 6        | `boing_2`  |
| Match 7        | `ding_6`   |
| Match 8        | `ding_2`   |
| Match 9        | `cymbal_2` |
| Match 10       | `cymbal_1` |
| Match 11       | `crowd_2`  |
| Match 12       | `orch_2`   |
| Penalty        | `bloup`    |
| Game Over      | `instr_1`  |

`ding_6.wav` is not on the CD: "Match 7" is silent in the original too.

## Timing

The simulation (`step`) advances 1 ms at a time: the stopwatch, and the 100 ms timer that
checks it. The browser runs it on animation frames, paused while the tab is hidden, a dialog is
open or a menu is pulled down. Checked against the original under Wine: the skull falls about
5 s after the last piece, the score of a placement matches.

## Deviations from the original

- The original's default background is derived from the clock at start-up; here Psychedelic.
- The bevelled boxes use the Windows 95 colours (grey face), as the original on Windows 95;
  under Wine they take Wine's lighter theme.
- The inverted outlines (drag outline, drag and drop zones) are drawn with a "difference"
  composite instead of an XOR raster operation.
- Touch: the pieces are dragged with a finger (pointer events).
- Help: "How to Play" shows the launcher's rules text and the scoring rules (no WinHelp, no
  Balloon Help).
