# MazeRace (`maze.exe`)

Hector (the white mouse) and Nestor (the brown one) race through a random maze to the cheese on
its bottom row. Nestor is a second player on the same keyboard or the computer. Throwers send
mice to random places.

## Data

- **Window**: client area 600×400 (resource 311/256; the original can be resized, the maze
  stretches with it), drawn on white: there is no background option (Extras has only the sounds).
- **Bitmaps** (→ `src/assets/maze/`): 257 `pieces.bmp`, seven 32×32 pieces drawn opaque and
  stretched into the cells: cheese, Hector facing left, right, Nestor facing left, right, player
  thrower (white dot), opponent thrower (black dot); 258 `piece2.bmp`, Hector and Nestor 29×31
  and their mask, for the win dialog's frame.
- **Dialogs**: 260 options (tabs Options, Keys, Extras), 258 the wins ("White Mouse Wins:",
  "Brown Mouse Wins:", titled "ModalDialog" in the resource).
- **Settings** (registry): `Player1Up`… `Player2Right`, `PlayerThrowers`, `OpponentThrowers`,
  `Visibility`, `MazeWidth`, `MazeHeight`, and the shared `SkillLevel` (1: two players; 2…11:
  the computer's speed, 4 when unset).

## Code

| Function   | What                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| `0x401850` | Window constructor: settings, mice, sound events, first maze                             |
| `0x4011b0` | A mouse: its keys (Hector: arrows; Nestor: A, D, W, X), its timer (the computer's moves) |
| `0x401310` | Computer tick: the key of the way stored in Nestor's cell                                |
| `0x401610` | A mouse's key: one cell, if no wall                                                      |
| `0x402640` | New maze: walls, visibility, throwers, cheese, ways, mice                                |
| `0x402c70` | Paint: walls of visible cells, pieces, mice, "Press F2 to begin the game"                |
| `0x403090` | Menu commands (New, Options)                                                             |
| `0x403900` | After a move: walls shown, meeting, cheese, throwers                                     |
| `0x40a4a0` | Maze generation (`0x40a640` a cell next to the maze, `0x40a700` the wall to open)        |
| `0x40ab60` | Whether a move is free of walls                                                          |
| `0x40ac10` | The way to the cheese from every cell (dead ends peeled off)                             |

## Rules

- **Maze** (`0x40a4a0`): cells (x, y) for x ≤ width, y ≤ height, each with a top and a left wall
  (the extra column and row hold the right and bottom borders). All walls up; a random cell
  starts the maze; then, once per other cell, a random cell outside the maze but next to it is
  chosen, and a wall drawn at random (`rand() & 3`: up, down, left; if that is not a wall to the
  maze, the right neighbour is tried, then a new draw) is opened. The result is a perfect maze.
- **Pieces** (`0x402640`): (width + height) / 4 player throwers and as many opponent throwers on
  random cells off the bottom row (a later one may replace an earlier one); the cheese on a random
  cell of the bottom row; Hector at (0, 0), Nestor at (width − 1, 0), their cells cleared of
  throwers. Then every cell gets its way to the cheese (`0x40ac10`).
- **Walls visible**: all, some (the middle half of the maze hidden: columns width / 4 … 3·width / 4,
  rows likewise) or none. The cheese and throwers show anyway. After every move, the cells around
  both mice (3×3, not the border column and row) show.
- **Race**: Game › New (F2) starts it on the maze shown if it was never raced on, else on a new
  maze ("Begin New Game"). Keys move a mouse one cell if no wall is in the way; left and right
  turn it. With the computer, Nestor's keys do nothing and Nestor steps along its cell's way at
  the chosen speed.
- **After each move** (`0x403900`): while both mice are on one cell, both are thrown ("Brown Mouse
  Thrown"). Then a mouse on the cheese wins (Hector first): "White/Brown Mouse Win", the wins
  dialog, the race ends. Else, in this order, the first that applies: Hector on a white dot,
  Hector is thrown; Nestor on a white dot, Nestor is thrown; Hector on a black dot, Nestor is
  thrown; Nestor on a black dot, Hector is thrown (when that kind of thrower is on). The dot is
  used up. A thrown mouse lands on a random cell off the bottom row, whose throwers are removed.
- **Wins** count up until the options are changed. Options › OK (after "Changing the game options
  will restart the game in progress…" during a race) draws a new maze and waits for F2.

## Timing

The computer's AutoTimer (`0x411000`, by the list's speed "1 Slow" … "10 Fast"): 1500, 1000,
800, 650, 500, 350, 200, 150, 100, 50 ms per step; "3" (800 ms) by default. Menus and dialogs
stop it (`0x403040`). The humans move on key presses (with the keyboard's auto-repeat).

## Sound events (and their default sounds)

| Event              | Default   |
| ------------------ | --------- |
| MazeRace Start     | (none)    |
| MazeRace Exit      | (none)    |
| Begin New Game     | `charge`  |
| White Mouse Thrown | `mouse_4` |
| Brown Mouse Thrown | `mouse_5` |
| White Mouse Win    | `mouse_2` |
| Brown Mouse Win    | `mouse_3` |

## Deviations from the original

- The window has a fixed 600×400 maze (scaled to the screen) instead of a resizable one.
- The way to the cheese is computed by a breadth-first search from the cheese (the same ways as
  the original's dead-end peeling, the maze being perfect).
- The wins dialog is titled "MazeRace" (the resource says "ModalDialog").
- Settings go to localStorage; Help has How to Play and About only.
- Swipes and an on-screen pad move Hector on touch screens, with a Start/New button.
- Not checked under Wine beyond the first screen: Xvfb without a window manager gives the
  original's window a wrong size, so the race could not be driven there.
