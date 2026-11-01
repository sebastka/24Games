# Reversi Plus (`reversi.exe`)

Othello against the computer: flank the opponent's pieces to turn them over; the most pieces at
the end wins.

## The board game framework

Reversi Plus, Checker Connector, Engulf and Core Meltdown are built on the same framework (each
executable has its own copy), whose web counterpart is
[src/shell/czgame](../../src/shell/czgame), with the dialogs in [src/shell](../../src/shell):

- **Defaults** come from the main window's help id (`FUN_004014d0`, `FUN_00408450`,
  `FUN_00408d90`): background = id / 100, board = id / 10 % 10, piece set = id % 10, used when
  the registry has no value. Reversi's id is 1632: Gray Surface, Beveled, Chips.
- **Piece sets** are CZGAME32.DLL StarView bitmaps 4000-4008 (128×32: piece, mask, piece, mask;
  the first is the player's), named by its string 1000 (Checkers, Stones, Chips…). The bitmaps
  are not in the order of their file names: 4002 is `piece_7.bmp`.
- **Boards** are bitmap 4020 (`board.bmp`, 640×40): two 40×40 squares per board, named by string
  1001 (Classic, Purple & Gold…). A game marks each square as using the first or the second.
- **Options**: an Options tab of the game's own, then Board and Pieces (a list and a 2×2 preview,
  `FUN_00405010`, `FUN_00409700`, `FUN_00408a20`), Extras, and Animation: "Animation Enabled" and
  a Slow…Fast slider. The registry keeps `AnimationSpeed` (1-15 pixels per step, 0 = disabled,
  7 when unset), `SkillLevel` (1-4, 1 when unset), `PlayingPiece`, `PlayingBoard`.
- **Animation** (`FUN_00404b00`): a piece slides in a straight line `AnimationSpeed` pixels per
  step; between steps a busy loop of `AnimationDelay` × 10 iterations (calibrated from the CPU
  type: 6000-14000). The web version takes 4 ms per step.
- **Message boxes** of CZGAME32.DLL: 1000 "Changing the game options will restart the game in
  progress. Are you sure you want to do this?" (OK in Options during a game), 1001 "Are you sure
  you want to abandon the game in progress?" (Game › New during a game); both Yes/No.
- **End of game dialogs** (CZGAME32.DLL dialogs 1002-1004, `FUN_00406720`, `FUN_00406840`,
  `FUN_00406960`): 320×200, a 120×200 masked picture (bitmaps 1001-1003: thumb down, thumb up,
  stopwatch), a title ("You Lose!" in maroon, "You Win!", "It's A Tie!"; a game may replace it)
  and two navy lines. The picture is on the left, on the right for "You Win!".
- **Bevels** (`FUN_00404260`): filled with the 3D face colour, light along the top and left,
  shadow along the bottom and right.
- **Clicks** that hit nothing beep (the window's `MouseButtonDown`, `FUN_00403d10`).
- **Randomness**: the C runtime's `rand()` (`FUN_0040d947`, the MSVC generator), seeded with the
  time at start.

## Window

560×342 (`FUN_00409920`, drawn by `FUN_0040b520` and `FUN_0040b820`):

- The board: 8×8 squares of 40 at (11, 11), in a 4-pixel bevel from (4, 4) to (337, 337). The
  corner and centre 2×2 blocks use the board's first square, the others its second.
- The logo (`reversi.bmp`, bitmap 257, 167×67 with its mask on the right) centred in
  (341, 4)-(556, 100).
- A bevelled panel (341, 104)-(556, 152) holding each side's piece: the piece slides from there
  to its square when that side plays.
- Two bevelled boxes, "Player" and "Computer" (Arial 18 bold, blue), with the piece counts (Arial
  48 bold, magenta, shadowed).
- The pointer is a cross-hair (`plus.cur`) over the squares the player may play
  (`FUN_00409310`, flags set by `FUN_0040ae60`), an hourglass while the computer thinks.

## Rules

- **Start** (`FUN_0040a3d0`): "Crossed" (default) puts the computer on d4 and e5 and the player on
  e4 and d5; "Side By Side" the player in column d and the computer in column e. The player
  (red, by default) moves first unless Options says "Computer Goes First".
- **A move** (`FUN_0040afb0`, `FUN_0040b1c0`) must flank at least one run of opposing pieces
  between the new piece and one of the mover's, in any of the 8 directions; all such runs turn.
  Clicks on other squares beep.
- **Turns** (`FUN_0040a570`): after the player's move, if the computer cannot move but the player
  can, "Computer Must Pass / I have no moves available." Otherwise the computer moves, and again
  after "Player Must Pass / You have no moves available." while the player cannot. When neither
  can move, the game ends (`FUN_0040a9a0`): "Your Score : n", "My Score : m", and the You Lose /
  You Win / It's A Tie dialog. Clicks then beep until Game › New.

## The computer (`FUN_0040c530`)

The window hands an engine object a string (`FUN_0040ace0`): a depth digit, then the 64 squares,
and gets back the move's column and row. The engine:

- **Depth**: 1, 2, 4, 5 for Easy, Moderate, Difficult, Expert (`0x414334`), plus one ply 2 times
  in 10 and two plies 1 time in 10 (`rand() % 10` is 7-8 or 9).
- A **single legal move** is played without searching.
- **Endgame**: with fewer than 11 empty squares and at most 3 × depth, it searches to the end.
- **Evaluation** (`FUN_0040d150`), from the player's side: at the end of the game, the piece
  difference ± 9936. Otherwise, per square, its owner (±1) × its weight (`0x415338`: corners 100,
  their neighbours −30 and −50 on the diagonal, edges 20, …), except for pieces anchored to a
  corner (`FUN_0040d3b0`: from each corner, the run of its colour along the first row, then each
  next row no longer than the one before), worth ±50 (the corner ±100).
- **Search** (`FUN_0040cc70`): a minimax trying the squares in a fixed order (`0x415230`: corners
  first, then the other edge squares, the centre, and the squares next to the corners last). A
  reply at least as good for its side as the best found so far by the parent cuts the parent's
  branch (it returns ±10000). A move is taken at once when it is better than the root position's
  value by more than a tenth of it (only a win, at depth 1 and 2). Equal values replace the best
  move on a coin toss (`rand() & 0x10`). A side without moves passes at the same depth.

`computerMove` in [logic.ts](../../src/games/reversi/logic.ts) follows these step by step, with
the same `rand()` calls, so that a seeded game replays exactly.

## Sound events (and their default sounds)

| Event                    | Default    |
| ------------------------ | ---------- |
| Reversi Plus Start       | (none)     |
| Reversi Plus Exit        | (none)     |
| Move Player's Piece      | `boing_3`  |
| Move Computer's Piece    | `instr_9`  |
| Capture Player's Piece   | `click_1`  |
| Capture Computer's Piece | `click_3`  |
| Victory                  | `crowd_2`  |
| Defeat                   | `instr_4`  |
| Tie                      | `stopwach` |

## Deviations from the original

- Captured pieces turn over all at once, with one capture sound (the original turns them one
  after the other without delay, restarting the sound for each).
- The computer thinks for at least 50 ms (the original as long as its search took).
- Settings are kept in localStorage at once (the original writes some at exit).
- Help offers "How to Play" and "About" (the original's WinHelp index, rules and Balloon Help are
  not converted).
