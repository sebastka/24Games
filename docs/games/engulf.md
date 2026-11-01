# Engulf (`engulf.exe`)

Ataxx against the computer on a 7×7 board with blocked squares: copy or jump your pieces, take
the opponent's around the square you land on.

Built on the board game framework described in [reversi.md](reversi.md), shared in
[src/games/reversi/shared](../../src/games/reversi/shared).

## Window

512×302 (help id 2915: Blue Swirl background, Purple & Gold board, Happies/Angries pieces;
animation speed 3 when unset). Title "Engulf - Board n". Drawn by `FUN_004039e0` and
`FUN_00403c10`:

- The board: 7×7 squares of 40 at (11, 11) in a 4-pixel bevel (4, 4)-(297, 297); blocked squares
  use the board's first square, the others its second. Pieces at (15 + 40x, 15 + 40y).
- The logo (`logo.bmp`, bitmap 257, 154×34 with its mask below) at (328, 15).
- "SCORE" (Arial 22 bold, light red, shadowed) in a bevelled box (301, 64)-(508, 100).
- "Computer / Score" and "Player / Score" (Arial 20 bold, blue, shadowed) in bevelled panels
  (301, 104)-(403, 282) and (407, 104)-(508, 282), each with a sunken box holding the piece count
  (Arial 40 bold, blue, shadowed).

## Data

- **Layouts**: strings 256-290 (291 is loaded but never used), digit pairs "xy" of blocked
  squares → `src/assets/engulf/layouts.json`. Layout 1 is blank; none blocks a corner.
- **Start** (`FUN_00401b30`): the player (side 0 of the piece set) on (0, 0) and (6, 6), the
  computer on (6, 0) and (0, 6).
- **Board progression** (Options › Layout; registry `Progression`, `StartingBoard`): at each new
  game the layout is the same one ("Board Number"), `rand() & 0xff` ("Random"), or the next one
  ("Step From"), modulo 35. The original saves the current layout at exit and, with Step From,
  steps back one at the next launch so that it replays; a fresh install starts on Board 2.
  Options › OK sets the board number (Step From: the one before it) and starts a new game.

## Rules

- **Moves** (`FUN_00405669`, `FUN_00402fc0`): a piece goes to an empty, not blocked square at
  most two away in any direction. One square away it is copied, two away (`|dx|` or `|dy|` = 2)
  it jumps. All the opponent's pieces around the square it lands on turn.
- **The player drags** a piece (`FUN_004021d0`, `FUN_00402580`): pressing on one of its pieces
  that can move ("Piece Drag"), releasing over a destination's 32×32 square ("Piece Drop");
  released elsewhere, the piece goes back. A press elsewhere beeps. Options › Animation › Mouse
  Dragging: drag the piece itself or an inverted outline; "Show Drag Zones" inverts a frame
  around a piece that can move under the pointer, "Show Drop Zones" a destination under the
  dragged piece (a copy's square filled, a jump's framed).
- **Animation**: the moved piece slides to its square (a dragged piece is already there), a copy
  slides back to the square it left, then each captured piece is taken by one sliding out from
  the new piece ("Piece Capture" each).
- **Turns** (`FUN_00402580`, `FUN_004037c0`): after the player's move, if the computer cannot
  move: the game ends if neither can or the computer is behind, otherwise "I must pass. It's
  your turn again.". Otherwise the computer moves, and again after "You must pass. It's my
  move again." while the player cannot move and is not behind (behind, the game ends). After the
  fifth computer move in a row the computer resigns.
- **End** (`FUN_00402b80`): "You Lose!" with "My Score : m / Your Score : n", "You Win!" or
  "It's A Tie!" with "Your Score : n / My Score : m", or "You Win!" with "Computer resigns /
  after 5 moves". Empty squares are not awarded.

## The computer (`FUN_00404f50`)

- The window passes the board (column by column: empty, player, computer, blocked) and the skill
  level; the engine returns the move.
- **Search** (`FUN_004058b0`): negamax, as many plies as the skill level (Easy 1 … Expert 4); a
  reply at least as good as the parent's best so far cuts the branch; a side without moves has
  lost (−10000). At the depth: 10000 if the board is full and the side to move leads, or the
  other side has no pieces; −10000 without pieces; otherwise the piece difference.
- **Move order** (`FUN_00405669`): pieces column by column, destinations row by row.
- **Choice**: among the best-scored moves, `rand()` is drawn (once per best move, in turn) until
  an even number comes up; then one of the best copies is drawn (`rand() % n`), or one of the
  best jumps if there is no copy.
- The search runs in a Web Worker (Expert can take a second on a phone); the draws stay on the
  main thread, so a seeded game replays.

## Sound events (and their default sounds)

| Event            | Default    |
| ---------------- | ---------- |
| Engulf Start     | (none)     |
| Engulf Exit      | (none)     |
| Piece Drag       | `click_5`  |
| Piece Drop       | `click_4`  |
| Enemy Piece Move | `boing_3`  |
| Piece Capture    | `drum_2`   |
| Victory          | `orch_2`   |
| Defeat           | `laugh_1`  |
| Tie              | `stopwach` |

## Deviations from the original

- The current layout is stored when a game starts (the original writes it at exit).
- Dragging works by touch too (pointer events).
- The computer thinks for at least 50 ms; settings are kept in localStorage at once; Help offers
  "How to Play" and "About".
