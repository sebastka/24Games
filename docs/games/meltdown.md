# Core Meltdown (`meltdown.exe`)

Chain Reaction against the computer: add units to your squares; a square at its critical mass
explodes into its neighbours, taking them over; wipe the opponent off the board.

Built on the board game framework described in [reversi.md](reversi.md), shared in
[src/shell/czgame](../../src/shell/czgame) and the shell's dialogs.

## Window

510×291 whatever the board size (help id 2530: Red Vinyl background, Beveled board, Checkers
pieces). Drawn by `FUN_00402fa0` and `FUN_00403680`:

- The board: N×N squares of 40 (N = 5, 6 or 7, Options › Board Size, 6 by default), its corner
  at (145 − 20N, 145 − 20N), no frame. The outer ring uses the board's first square, the inside
  its second.
- The logo (`logo.bmp`, bitmap 257, 204×60 with its mask below) at (297, 11).
- "SCORE" (Arial 22 bold, yellow outlined in red) in a bevelled box (290, 84)-(507, 120); the two
  sides' pieces at (328, 128) (computer) and (437, 128) (player).
- "Computer / Score" and "Player / Score" (Arial 20 bold, red, shadowed) in bevelled panels
  (290, 168)-(398, 288) and (400, 168)-(507, 288), each with a sunken box holding the side's
  total units (Arial 40 bold, yellow outlined in red).

## Data

A square holds 0 (empty), 1-10 (the player's units) or 11-20 (the computer's, value − 10). One
piece is drawn per square, shrunk with the units (`FUN_004031f0`; the piece set is stretched
to 12, 24 and 40 pixels at each new game, `FUN_00401a30`): 1 unit 12×12, 2 units 24×24, 3 units
32×32, 4 or more 40×40, centred in the square.

## Rules

- **Critical mass** (`FUN_00402f00`): 2 in a corner, 3 on an edge, 4 inside.
- **The player clicks** (`FUN_00402180`) an empty square or one of its own (the clickable squares,
  `FUN_00401dd0`); anything else beeps. A unit flies from the player's piece to the square
  (sized for the square's new count) and lands ("Player Expands"), then the square reacts.
- **Reaction** (`FUN_004028b0`, depth first, instant): if exactly one side has no units left, it
  stops. A square at its critical mass empties and sends one unit of its owner to each
  neighbour, up, right, down, left (`FUN_00402c30`: an empty or own square grows, "Expands"; an
  opponent's square with n units becomes the sender's with n + 1, "Captures"), each of which
  may react in turn.
- **The computer** then plays the same way ("Computer Expands"), unless the player's reaction
  wiped it out. The clickable squares are recomputed after the computer's turns.
- **End** (`FUN_00401ee0`): when a side has no units: "You Lose!" with "You are wiped / off the
  board!" (Defeat), or "You Win!" with "I am wiped / off the board!" (Victory). There is no tie.
  Then clicks beep until Game › New.
- **Computer first**: it opens on a random square, without reaction and without recomputing the
  clickable squares, so that its square stays clickable: clicking it adds a unit to the
  computer's square (with the player's sound), after which the computer moves and the player,
  without units, has lost. **Fixed** in the web version (see the deviations).

## The computer (`FUN_004045e0`)

The window passes a string (depth, size, side, the squares 'A' + value, row by row); the engine
returns the square.

- **Depth**: the skill level (Easy 1 … Expert 4), no random bonus.
- **Moves** (`FUN_00404d10`): empty squares and the side's own, row by row.
- **Root**: each move is played (`FUN_00404e40` adds the unit, `FUN_00405010` the reaction,
  which stops once a side has no squares and the other two or more) and searched; one of the
  best-scored moves is drawn with a single `rand() % count`.
- **Search** (`FUN_00405370`): negamax, a reply at least as good as the parent's best cuts the
  branch. Inside the search a move only sets off the square's reaction **without adding the
  unit** (a bug: below its critical mass the square is left as it is), so the inner plies
  mostly evaluate the root position from alternating sides.
- **Evaluation** (at 0x40555e-0x405a2e), for the side to move: for each square with units,
  k = (4 − critical mass) + units, counted (k + units) for its owner (A for the side, B for the
  other); and for each of its neighbours not in the side's class (an empty square counts as the
  player's), k, less the neighbour's own k when it has units (E). A side without units: −10000;
  the other without: 10000; otherwise 2A + E − 2B.

`computerMove` was checked against an independent model of the disassembly (which reproduced
the computer's moves under Wine) on 690 positions of all sizes and depths.

## Sound events (and their default sounds)

| Event               | Default    |
| ------------------- | ---------- |
| Core Meltdown Start | (none)     |
| Core Meltdown Exit  | (none)     |
| Player Expands      | `click_1`  |
| Player Captures     | `click_4`  |
| Computer Expands    | `instr_9`  |
| Computer Captures   | `click_5`  |
| Victory             | `baby_lf3` |
| Defeat              | `spooky_2` |

## Deviations from the original

- **Fixed: the computer's opening square.** After the computer's opening move, the clickable
  squares are recomputed, so its square can no longer be clicked. In the original, clicking it
  added a unit to the computer's square and lost the game at once.

- A reaction plays only the sound of its last unit (the original starts one per unit, each
  cutting the previous, so that only the last is heard as well).
- The shrunk pieces are scaled without smoothing (the original's StretchBlt mode is unknown).
- Only the left mouse button plays (the original takes any button).
- The computer thinks for at least 50 ms; settings are kept in localStorage at once (the
  original writes the board size and who goes first at exit); Help offers "How to Play" and
  "About".
