# Push-Pull (`pushpull.exe`)

A 7×7 board: the player's five pieces on the top and on the bottom row, the computer's on the
left and on the right column, the corners empty. A marker, placed on an empty square, then
moves one square at a time in any of the eight directions onto a square it has not visited; a
piece it lands on is captured **for its owner**, whoever moved the marker. The side with more
captured pieces wins. Played against the computer.

## Data

- **Window**: 512×302 (window resource 256, help id 2863: default background 28, Blue Haze;
  default board 6, Space; default piece set 3, Hazards).
- **Logo**: StarView bitmap 257 (`logo.bmp`, Windows bitmap 258), 185×27 with its mask below.
  → `src/assets/pushpull/logo.png`.
- **Marks**: StarView bitmap 256 (`marks.bmp`, Windows bitmap 257), 128×32: the grey cross of a
  visited square and its mask, the coloured cross of the marker and its mask.
  → `visited.png`, `marker.png`.
- **Board and pieces**: CZGAME32.DLL's; the edge squares use the board's first square, the
  others (corners and inside) its second. The player's pieces are the set's first piece, the
  computer's its second.

## Layout (`FUN_00409920`, `FUN_0040b580`)

The board (40-pixel squares at (11, 11)) on a panel (4, 4)-(297, 297) with a 4-pixel bevel; on
the right the logo centred in (301, 4)-(508, 44), a bar (301, 48)-(508, 84) with the two pieces,
and the "Player" (301, 88)-(402, 297) and "Computer" (406, 88)-(508, 297) columns, each with a
2-pixel bevel. A captured piece flies to its owner's column (`FUN_0040a6e0`): the n-th one at
(left + 15 + 40·(n mod 2), bottom − 18·(2 + n − n mod 2)), two by two from the bottom.

## Rules (`FUN_0040aa20`, `FUN_0040a7c0`)

- Squares hold 0 empty, 1 a player's piece, 2 a computer's piece, 3 visited, 4 a player's piece
  captured, 5 a computer's piece captured (the marker adds 3 to the square it lands on).
- The marker is first placed on an empty square (the corners or the inner 5×5), then moves to
  a neighbouring square holding 0, 1 or 2. The squares it can go to change the mouse pointer.
- Each move: the marker glides to the square (at the animation speed); then "Capture Player's
  Piece" or "Capture Computer's Piece" and the piece flies to its column, or "Move Marker".
- The game ends when the marker cannot move or a side has lost its 10 pieces: "Your Score : n"
  (the player's pieces captured) against "My Score : n"; You Lose (Defeat), You Win (Victory) or
  It's A Tie (Tie). A click when no game is in progress beeps.

## The computer (`FUN_0040c230`, `FUN_0040c3b0`)

- **Depth**: 1, 3, 5 or 7 (table `0x413338`, by skill), plus 1 when `rand() % 10` is 4-7 and plus
  2 when it is 8-9.
- **First placement** (computer first): (1, 2), (1, 4), (5, 2) or (5, 4), next to its own
  pieces: square 15, + 14 if `rand()` is odd, + 4 if the next `rand()` is odd.
- **Search**: a negamax over the captures, computer's minus player's (× 1000 when a side has
  10 or the marker is stuck), as the original writes it: at each position the side to move's
  optimistic score (its captures plus one per remaining ply, at most 10) is compared with the
  first bound; if it cannot exceed it, the position is worth −32000 to its mover (so +32000 to
  the previous one, which then stops looking). The two bounds swap at every ply without being
  negated; the first bound rises with the best value found. The moves are tried in the
  direction table's order (`0x413340`: (−1, −1), (−1, 0), (−1, 1), (0, −1), (0, 1), (1, −1),
  (1, 0), (1, 1)); the first strictly better one is kept, and the loop stops once a value
  exceeds 100. Deterministic for a given depth.
- Verified against the original under Wine: after the player places the marker at (1, 1), the
  computer (Easy, depth 2 that time) goes to (0, 2), as here.

## Options (dialog 256)

- **Options**: Skill Level (Easy-Expert, `SkillLevel`), Who Goes First (`PlayerGoesFirst`).
- **Board**, **Pieces** (two pieces), **Extras**, **Animation**.

## Sound events (and their default sounds)

| Event                    | Default    |
| ------------------------ | ---------- |
| Push-Pull Start          | (none)     |
| Push-Pull Exit           | (none)     |
| Move Marker              | `boing_1`  |
| Capture Player's Piece   | `baby_lf1` |
| Capture Computer's Piece | `laugh_1`  |
| Victory                  | `crowd_4`  |
| Defeat                   | `crowd_1`  |
| Tie                      | `stopwach` |

## Deviations from the original

- No keyboard play (the original has none either); touch works as clicks.
- Animation timing, the menus during moves, the Help menu, system colours: as Wari's.
