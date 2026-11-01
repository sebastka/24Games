# Quinto (`quinto.exe`)

"Lights out": change every piece of the board from one type to the other; a click changes a
piece and the four next to it.

## Data

- **Window**: client area 512×342 (window resource, type 311); help id 2525, which gives the
  defaults: background 25 (Red Vinyl), board set (2525 % 100) / 10 = 2 (Marble), piece set
  2525 % 10 = 5 (Happies/Angries).
- **Own art**: Windows bitmaps 257 (`arrow.bmp`, 32×32 and its mask) and 258 (`logo.bmp`,
  "QUINTO" five times, 132×142 and its mask) → `src/assets/quinto/`.
- **Shared art** (`czgame32.dll`): piece sets, StarView bitmaps 4000-4008 (`piece_1`, `piece_2`,
  `piece_7`, `piece_3`, `piece_4`, `piece_5`, `piece_6`, `piece_9`, `piece_8`: two 32×32 pieces,
  each followed by its mask), named by string 1000 (Checkers, Stones, Chips, Hazards,
  Zen/Dragon, Happies/Angries, Solar/Lunar, Conspiracy, Monochrome); board sets, bitmap 4020
  (`board.bmp`, 80×40 per set: two 40×40 squares), named by string 1001 (Classic, Purple & Gold,
  Marble, Beveled, Grid, Blobs, Space, Monochrome). `src/games/quinto/sets.ts` has them for the
  other board games. Settings `PlayingPiece`, `PlayingBoard` (`FUN_00406d20`, `FUN_00407590`).

## Rules

- **Setup** (`FUN_00408120`): `HorizSize`, `VertSize` (5 by default, at most 8); registers the
  sound events; 8×8 piece objects, two more for the legend (the first type, the second type).
- **New game** (`FUN_004087b0`): every piece of the first type (the second picture of the set:
  the "Angry"), moves 0. The board, `W`×`H` squares of 40 pixels, has its top-left corner at
  (171 - 20W, 171 - 20H): centred in the left panel. Squares with an even x + y show the set's
  first square. Pieces sit 4 pixels into their squares.
- **Click** (`FUN_00408990`): when the game is over, a beep wherever the click. On a square:
  "Flip Pieces", and `FUN_00408a30` changes that piece and those below, right, above and left
  (when on the board), adds a move and redraws "Moves : N" (`FUN_00409280`).
- **Solved** (no piece of the first type left): the game stops; "Puzzle Solved" with the
  "You Win!" dialog: "Your Score : N", then "Perfect Score!" if N is at most the perfect score of
  the board's number of squares, else "Perfect Score : P". Perfect scores (by W×H): 25: 15,
  30: 14, 35: 13, 36: 28, 40: 21, 42: 26, 48: 26, 49: 33, 56: 32, 64: 40. **Quirk**: 7×8 can be
  solved in 20 moves (Gaussian elimination, see the tests), less than the 32 the game knows.
- **High scores**: one table per number of squares (`FUN_00408f00`: 25, 30, 35, 40, 36, 42, 48,
  49, 56, 64 are tables 0-9, so 5×8 and 8×5 share theirs), titled "Hall of Fame (WxH)"; the
  score is the number of moves, lower is better. The shared Hall of Fame: see
  [CardMatch](match.md#high-scores-shared-code-linked-into-each-game).
- **Game › New** (F2, `FUN_00409750`): over a finished game, a new one; over a game with moves,
  "Are you sure you want to abandon the game in progress?" first; over a fresh board, nothing.
- **Options** (dialog 256, `FUN_00409a40`): Options (Board Size: Horizontal and Vertical, 5-8),
  Board (Board Names, Board Preview: 2×2 squares), Pieces (Piece Names, Piece Preview: the two
  pieces crosswise, `FUN_00407230`), Extras. OK during a game asks "Changing the game options
  will restart the game in progress. Are you sure you want to do this?" (`FUN_00409d50`); then a
  new game.
- **Window** (`FUN_00409370`): a raised panel (4, 4)-(337, 337), 4-pixel bevel, around the board;
  on the right (from x = 341, window background around): the legend box (y 4-44: the piece to
  change, the arrow, the piece it becomes), the moves box (y 48-88, Arial 22, navy), and the logo
  centred below.
- The pointer over the board's squares is `czgame32.dll`'s "plus" (`FUN_00407b10`).

## Sound events (and their default sounds)

| Event         | Default   |
| ------------- | --------- |
| Quinto Start  | (none)    |
| Quinto Exit   | (none)    |
| Flip Pieces   | `click_4` |
| Puzzle Solved | `handel`  |

## Deviations from the original

- The frames use the Windows 95 colours (face `#c0c0c0`), as the rest of the chrome.
- The Options tab's board sizes are drop-down lists (the original: numeric fields with spin
  buttons, 5-8).
- Help › How to Play shows the launcher's rules text (no WinHelp); Balloon Help is left out.
