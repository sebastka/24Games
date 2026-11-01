# Black Box Chess (`bbchess.exe`)

Five chess pieces are hidden on the board, on the squares marked "?". Click the other squares
to learn how many pieces threaten them, drag the pieces onto the "?" squares, and guess.

## Data

- **Pieces**: Windows bitmap 257 (`pieces.bmp`, 160×64): king, queen, rook, knight, bishop, 32×32
  each, masks below → `src/assets/bbchess/pieces.png`.
- **Board sets**: the shared ones of `czgame32.dll` (see [Quinto](quinto.md)), setting
  `PlayingBoard`.
- **Window**: client area 421×328; help id 2520: background 25 (Red Vinyl), board 2 (Marble).
  Unlike the other games, `bbchess.exe` was built with MSVC and MFC helpers (`CString`,
  `CMapStringToString` appear in the decompiled code), still on StarView.
- **Strings**: "Sorry, you haven't guessed the sequence yet. Keep trying!" (type 305, 256).

## Rules

- **New game** (`FUN_00401b50`): every square "not looked at" (`'c'`); each of the five pieces in
  turn gets `rand() % 8` for its row, then `rand() % 8` for its column, again while another piece
  is there; their squares are "hidden" (`'b'`, shown as a yellow "?"). Score 100; the title is
  "Black Box Chess Score - 100" (`FUN_00401aae`). The pieces wait in the palette.
- **Threats** (`FUN_004011b4`): king: next to it; queen: same row, column or diagonal; rook: same
  row or column; knight: the L; bishop: same diagonal. Nothing blocks a piece: the count is of
  the pieces whose moves reach the square, wherever the others are.
- **Click** (`FUN_004032a0`): when the game is over, a beep. On the Guess label (once every piece
  is on the board): the guess; on the Give Up label: giving up. On a square not looked at: it
  shows its count (teal, outlined), "Click Board Square", 2 points less (never below 0). Anywhere
  else but a piece: a beep.
- **Dragging** (the drag framework shared with Pegopolis): a piece, in the palette or on the
  board, is dragged ("Piece Drag", `FUN_00402941`) onto a "?" square no piece is on, or back to
  the palette ("Piece Drop", `FUN_00402de8`); elsewhere it goes back silently
  (`FUN_00403166`). Drag Pieces / Drag Outlines, Show Drag Zones, Show Drop Zones as in
  [Pegopolis](pegoplis.md).
- **Guess** (Enter, `FUN_00401f62`): every piece on its square: the game is over, "Victory" and
  the "You Win!" dialog ("You have correctly" / "guessed the position."), then the Hall of Fame
  (one table, "Hall of Fame", higher is better) with the score. Otherwise 5 points less, "Bad
  Guess" and the InfoBox above.
- **Give Up** (Ctrl+G, `FUN_004021c0`): the pieces go to their squares, "Give Up", the game is
  over and the title loses its score.
- **Window** (`FUN_00401df3`, `FUN_0040255d`): the board at (4, 4), 40-pixel squares (even x + y
  shows the set's first square); on the right a raised box (328, 4)-(418, 72) with
  "Guess=Enter" and "GiveUp=Ctrl+G" (bold, grey when unavailable), and the palette, a raised
  frame (328, 75) 90×248 around a sunken one, the pieces at (356, 88 + 45 × piece).
- **Game › New** (F2): during a game, "Are you sure you want to abandon the game in progress?".
- **Options** (dialog 256, `FUN_00403784`): Board (Board Names, Board Preview), Extras,
  Animation. OK during a game asks "Changing the game options will restart the game in
  progress. Are you sure you want to do this?" (`FUN_00403adf`); then a new game.

## Sound events (and their default sounds)

| Event                 | Default   |
| --------------------- | --------- |
| Black Box Chess Start | (none)    |
| Black Box Chess Exit  | (none)    |
| Piece Drag            | `click_5` |
| Piece Drop            | `click_4` |
| Click Board Square    | `pop1`    |
| Victory               | `charge`  |
| Bad Guess             | `cuckoo`  |
| Give Up               | `instr_4` |

## Deviations from the original

- A click on the Guess or Give Up label does not also beep (the original passes it on to the
  drag framework, which beeps outside its zones).
- Dragging works with a finger (pointer events); the zones' highlights follow the pointer.
- The frames use the Windows 95 colours (face `#c0c0c0`); the outlined digits and "?" are drawn
  with a canvas stroke (Arial bold 40) instead of the original's outlined Arial.
- Help › How to Play shows the launcher's rules text (no WinHelp); Balloon Help is left out.
