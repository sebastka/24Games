# Checker Connector (`connect.exe`)

Four in a row against the computer: drop pieces into the columns of a 7×6 board.

Built on the board game framework described in [reversi.md](reversi.md) (piece sets, boards,
options tabs, animation, end-of-game dialogs), shared in
[src/games/reversi/shared](../../src/games/reversi/shared).

## Window

280×280 (help id 66: Space board, Solar/Lunar pieces). A 7×7 board of 40-pixel squares fills it
(`FUN_00401000`, `FUN_004015c0`): the top row uses the board's first square and holds the
letters A-G (Arial 32 bold, yellow outlined in maroon), the six rows below the second square.
There is no window background (Options › Extras has only the sounds).

## Data

The position is a 64-byte structure at 0x411000 (`FUN_00402d00`): 42 cells column by column,
bottom up (`' '` empty, 0 the player, 1 the computer), the 7 column heights, the side to move
(1 the player, −1 the computer), the number of pieces dropped, and per column a "full" flag.

## Rules

- **A move** (`FUN_00401ac0`): a click anywhere in a column that is not full, or its letter key
  (`FUN_004019b0`), drops the player's piece. It falls from above the window to the lowest free
  cell; the sound plays when it lands. The pointer is the drop cross-hair over such columns.
- **Four in a row** (`FUN_00402d50`): scanning column by column, bottom up (stopping at the first
  empty cell of each column), each piece is checked upwards, to the right and up-right (up to
  column D), and up-left (from column D). The four found is lit up with the board's first square
  (`FUN_00403110`, `FUN_00402e20`).
- **End**: "You Win!" with "You got four / in a row!", "You Lose!" with "I got four / in a
  row!", or, once 42 pieces are counted, "It's A Tie!" with "We filled / the board!". Then
  clicks do nothing and the letter keys beep, until Game › New.
- **The computer first** (Options › Who Goes First): it opens in column D, without thinking. This
  piece is not counted, so its search later sees a full board as 41 pieces (lost for the side to
  move, instead of a draw); when the player fills the board, the original's search runs with no
  column to play (writing through an uninitialised index) and the game ends in a tie.

## The computer (`FUN_00403410`)

- **Depth**: the skill level (1-4), one more 2 times in 5 (`rand() % 5` is 3 or 4, drawn before
  each move), and one more once more than 28 pieces are counted.
- **Search** (`FUN_00403350`): who wins with best play within the depth: four in a row decides;
  otherwise the side to move wins if one of its drops wins, it is a draw (0) if one does not
  lose, else it loses. Out of depth, or with 42 pieces counted: 0.
- **Choice**: each column is tried (left to right) and searched. A forced win is played at once.
  Losing columns are avoided when another is not. With several neutral columns, each is scored
  by imagining the player's piece there and searching 4 deep with the computer to move:
  `2 × (−5 × (2 + result) + |column − D|)`, the lowest wins (leftmost on a tie): first the
  columns where the player would force a win (blocks), then by distance to the centre.
- **Check**: after its move, if the computer could win with one more drop, the title becomes
  "Checker Connector - Check!" and "Player in Check" sounds; the player's next move clears it.

## Sound events (and their default sounds)

| Event                   | Default    |
| ----------------------- | ---------- |
| Checker Connector Start | (none)     |
| Checker Connector Exit  | (none)     |
| Player Piece Move       | `boing_3`  |
| Enemy Piece Move        | `instr_9`  |
| Player in Check         | `cuckoo`   |
| Victory                 | `crowd_3`  |
| Defeat                  | `laugh_4`  |
| Tie                     | `stopwach` |

## Deviations from the original

- When the board is full and the computer has no column, it does not write through an
  uninitialised index: the game simply ends in a tie, as it does in the original.
- The computer thinks for at least 50 ms.
- Settings are kept in localStorage at once; Help offers "How to Play" and "About".
