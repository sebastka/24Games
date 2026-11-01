# Nim (`nim.exe`)

Six rows (A-F) of pieces; each turn takes any number of pieces from the right end of one row.
Whoever takes the last piece wins, or, with "Leave the Last Piece", loses. Played against the
computer.

## Data

- **Window**: 380×300 (window resource 256, help id 2811: default background 28, Blue Haze;
  default board (2811 % 100) / 10 = 1, Purple & Gold; default piece set 2811 % 10 = 1,
  Stones).
- **Board**: CZGAME32.DLL's boards (bitmap 4020, `board.bmp`, names in its string 1001): the
  letters stand on the board's first square, the pieces on its second.
- **Pieces**: CZGAME32.DLL's piece sets; the first piece of the set is a piece, the second a
  chosen piece (and the pieces flying away).
- **Strings** (in the code, `0x41a0a0`-`0x41a170`): "Choose the pieces to take & press ENTER",
  "Take n piece(s) from row X", "Computer takes n piece(s) from row X", "Press F2 to begin a new
  game", and the end texts "You took / the last piece!", "You forced me to / take the last
  piece!", "I took / the last piece!", "I forced you to / take the last piece!".

## Board

The board object (`FUN_0041090b`, 9×6 squares of 40 pixels at (11, 11)) is drawn on a panel
(4, 4)-(377, 257) with a 4-pixel bevel; the status line, (4, 262)-(376, 296), is a 1-pixel bevel
(`FUN_00401e60`). At a new game (`FUN_00401950`) the squares of each row are set up to its pile
size; when pieces are taken their squares stay (empty), so the board keeps its initial shape.

## Rules and play

- **Choosing** (`FUN_004020c0`, `FUN_00401bf0`): a click on a row's letter chooses the whole
  row; a click on a piece chooses it and every piece on its right; a click outside the rows
  clears the choice. Keys A-F choose the last piece of that row, and one more piece each time the
  same key is pressed again; Space clears the choice. Each choice plays "Select Pieces"; the
  status line says "Take n piece(s) from row X".
- **Taking** (`FUN_004028f0`, Enter or a click on the status line): beeps without a choice.
  The chosen pieces fly off to the right edge of the window (`FUN_00402420`, at the animation
  speed). If the game is over, the player wins; otherwise the computer moves at once, its move
  shown in the status line ("Computer takes …") until the next choice.
- **End** (`FUN_004044a4`): with "Take the Last Piece", when no piece is left; with "Leave the
  Last Piece", when exactly one piece is left (the side to move must take it). The winner is the
  side that just moved: "You Win!" (Victory) or "You Lose!" (Defeat), with the texts above.
  The status line then says "Press F2 to begin a new game".
- **New game**: the piles of the options; with "Computer Goes First" the computer moves at once
  (the original passes a dummy row 10 to the take function to skip the player's part).

## The computer (`FUN_004041f0`)

- Plain game (and "Leave the Last Piece" with several rows of more than one piece): if the
  nim-sum is not 0 (`FUN_0040465f`: counts of the piles having the bits 8, 4, 2 and 1, all
  even), it lists every move leaving a nim-sum of 0 (rows A-F, from the largest count) and
  picks one with `rand() % n`. Otherwise (`FUN_00404555`) it picks any move the same way.
- "Leave the Last Piece" with exactly one row of more than one piece: it takes all of that row
  or all but one, so as to leave an odd number of rows of one piece.
- Weakness kept: with "Leave the Last Piece" and only rows of one piece, it plays the plain
  game (and may lose a won position).

## Options (dialog 256)

- **Options**: Pile Sizes A-F (0-8; `Pile0`-`Pile5`, default 2-7), Game Object (Take the Last
  Piece, Leave the Last Piece; `TakeLastPiece`), Who Goes First (`PlayerGoesFirst`).
- **Board**, **Pieces** (with two pieces in the preview), **Extras**, **Animation** (as Wari).

## Sound events (and their default sounds)

| Event                   | Default   |
| ----------------------- | --------- |
| Nim Start               | (none)    |
| Nim Exit                | (none)    |
| Select Pieces           | `click_2` |
| Player removes pieces   | `boing_1` |
| Computer removes pieces | `bloup`   |
| Victory                 | `crowd_3` |
| Defeat                  | `instr_2` |

## Deviations from the original

- Key G is ignored. In the original it chooses a non-existent seventh row, which reads (and,
  once taken, decrements) the first pile size of the options.
- With "Leave the Last Piece", taking every remaining piece is not seen as the end of the game,
  in the original as here: the computer then "takes 0 piece from row A" and the game cannot go
  on until Game › New.
- The mouse pointer does not change over the board (the original shows `plus.cur`).
- Animation timing, the menus during moves, the Help menu, system colours: as Wari's.
