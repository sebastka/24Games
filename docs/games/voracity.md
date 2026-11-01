# Voracity (`voracity.exe`)

A solitaire of greed: a board of digits and a target. The target goes towards one of its eight
neighbours as many squares as that neighbour's digit, eating the squares it crosses; it can
neither leave the board nor cross an eaten square. One point per square eaten; the game ends
when the target cannot move. Best scores go to a Hall of Fame, one per board size.

## Data

- **Window**: fitted to the board, 16·n + 8 × 16·n + 9 (`FUN_00407ed0`). Help id 0 (default
  background black, hidden by the board). The title is "Voracity Score - n".
- **Tiles**: StarView bitmaps 256-261 (`piece1.bmp`…, Windows bitmaps 257-262), one per entry of
  the Pieces list (string 256: Plain, Red, Green, Blue, Colorful, Monochrome; `PiecesToUse`,
  default Plain): 176×16, eleven tiles of 16×16 (an eaten square, the digits 1-9, the target).
  → `src/assets/voracity/tiles-n.png`.
- **Hall of Fame**: CZGAME32.DLL's dialogs 3000 (the table over `flag2.bmp`, OK and Clear
  Scores, with its confirmation, message 3000) and 3001 ("Congratulations!", "You have a high
  score. Please enter your name", between `blue_ri2.bmp` and `red_rib2.bmp`), titled "Hall of
  Fame - n x n board". Ten names and scores per board size; the last name entered is proposed
  (`PlayerName`).
- **Message** 305/256: "You have no more moves available."

## Rules

- **New game** (`FUN_004083c0`): every square gets `rand() % m + 1`, row by row, m being a third
  of the side rounded up (5, 7, 8, 9 for 15, 19, 22, 25); then the target's row and column
  (`rand() % n` each), its square eaten.
- **Moving** (`FUN_00408740` keys, `FUN_00408970` mouse): the digits as on a numeric keypad
  (1 down-left … 9 up-right) and the arrows; a click on a neighbour of the target. The move is
  possible when that neighbour holds a digit d and the d squares from it on that line are on the
  board and not eaten; otherwise a beep.
- **The move** (`FUN_00409150`): the target's square and the next d − 1 are eaten ("Move Piece"
  for each), the target lands on the d-th square, whose digit stays (it is eaten by the next
  move), and the score grows by d.
- **End** (`FUN_00408b80`): when no direction is open. A score that enters the table (above the
  first lower or empty place, `FUN_00406e90`) plays "Game Over - High Score" and asks for a name
  (`FUN_00406cb0`); otherwise "Game Over - No High" and "You have no more moves available.".
  Game › Show High Scores shows the table of the current board size (`FUN_00406bb0`).

## Options (dialog 256)

- **Options**: Board Size (15 x 15, 19 x 19, 22 x 22, 25 x 25; `BoardSize`, default 19 x 19),
  with its explanation.
- **Pieces**: the tile sets, with a preview of 8 × 7 tiles (`FUN_004096a0`).
- **Extras**: background and sounds. No Animation tab.

## Sound events (and their default sounds)

| Event                  | Default   |
| ---------------------- | --------- |
| Voracity Start         | (none)    |
| Voracity Exit          | (none)    |
| Move Piece             | `click_4` |
| Game Over - High Score | `crowd_2` |
| Game Over - No High    | `charge`  |

## Deviations from the original

- "Move Piece" is played once per move (the original plays it for each square eaten, each
  cutting the previous one short).
- The Hall of Fame is kept in the browser (localStorage) with the settings; its layout follows
  the original approximately (rows down the flag, 11 pixels right and 27 down each).
- The Help menu has How to Play and About only, as Bulldozer's.
