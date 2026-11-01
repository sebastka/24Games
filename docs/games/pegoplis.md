# Pegopolis (`pegoplis.exe`)

Peg solitaire on 23 layouts: jump pieces over each other into empty squares, to leave as few
as possible (7 "score" layouts) or to make a pattern (16 "goal" layouts).

## Data

- **Layout names**: StarView string 256 ("Classic English, Classic French, Restaraunt [sic],
  The X, …, The Star").
- **Layouts** (`FUN_004033b0`): strings 500 + n. Six digits: width, height, then four flags: an
  unused one (always 1), straight jumps allowed, diagonal jumps allowed, score layout (else a
  goal pattern). Then the cells, row by row (other characters skipped), and for goal layouts as
  many again for the pattern. Cell codes: 0 no square; 1, 2 empty square; 3, 4 a piece of the
  first type; 5, 6 a piece of the second type (unused by the layouts). Odd codes are drawn with
  the board set's second square, even ones with its first (`FUN_004015a0`).
- **Descriptions**: strings 600 + n, lines separated by "\n".
- **Previews**: StarView bitmaps 500 + n (`b_class.bmp` …, Windows bitmaps 257-279), 80×80: the
  Options tab's Layout Preview, and the Goal Pattern box. → `src/assets/pegoplis/`.
- **Window**: client area 512×342; help id 2321: background 23 (Jewels), board set 2 (Marble),
  piece set 1 (Stones) (the board and piece sets of `czgame32.dll`, see [Quinto](quinto.md)).
- Settings: `CurrentPlayingBoard` (layout, 0 by default), `DragBitmaps` (1), `ShowDragZones`,
  `ShowDropZones` (off), `PlayingBoard`, `PlayingPiece`.

## Rules

- **New game** (`FUN_004015a0`): the window title becomes "Pegopolis - <layout>"; the board,
  `W`×`H` squares of 40 pixels, has its top-left corner at (171 - 20W, 171 - 20H), on the window
  background (no panel); pieces sit 4 pixels into their squares. Game › Show High Scores is
  enabled for score layouts only.
- **Drag zones** (`FUN_00401a90`): the pieces that can jump: straight directions first (up,
  right, down, left), then diagonal ones, as the layout allows; a jump goes over a piece onto an
  empty square, all three on the board.
- **Mouse** (`FUN_004080e0`, `FUN_00407d50`, `FUN_00408360`): a press outside a drag zone (a
  movable piece's 32×32 picture) beeps. Otherwise "Piece Drag" (`FUN_00401d40`), the drop zones
  are the piece's targets (whole squares), and the piece (Drag Pieces) or a 3-pixel outline (Drag
  Outlines) follows the pointer. With Show Drag Zones, the movable piece under the pointer gets
  an inverting 3-pixel frame (`FUN_0040afa0`); with Show Drop Zones, the target square under the
  pointer while dragging. Released on a drop zone: the jump (`FUN_00402140`); elsewhere: "Piece
  Drop Error" and the piece goes back (`FUN_004027b0`).
- **Jump** (`FUN_00402140`): "Piece Drop"; the piece jumped over goes. On a goal layout: the
  pattern matched (`FUN_00402cc0`: its pieces, of their type, and nothing else) is a win ("You
  Win!": "You matched" / "the pattern!", "Victory"); otherwise, if a piece type of the goal has no
  more pieces left on the board than the goal has (`FUN_00402bc0`), a loss ("You Lose!": "Too many
  pieces" / "removed from board.", "Defeat"). On a score layout, "Pieces Remaining" is redrawn.
  Then, if no piece can jump: on a goal layout, "You failed to" / "match the pattern." (Defeat);
  on a score layout, the pieces left are offered to the layout's Hall of Fame (lower is better;
  titled "Hall of Fame - <layout>", one table per layout), or, when not a high score, "You cannot
  jump any more pieces." (InfoBox, string 256 of type 305). A score layout has no victory dialog.
- **Window** (`FUN_004031c0`): on the right, a box (344, 4)-(508, 224) with the description
  (Arial 13 bold, from (349, 9), 16 pixels per line), and a box (344, 228)-(508, 338) titled
  "Pieces Remaining" (the count in Arial 48, navy, shadowed, `FUN_00403000`) or "Goal Pattern"
  (the preview, centred; `FUN_00402db0`).
- **Game › New** (F2): over a game with moves, "Are you sure you want to abandon the game in
  progress?"; over a finished game, a new one; over a fresh board, nothing.
- **Options** (dialog 256, `FUN_00403970`): Options (Layout Names, Layout Preview), Board, Pieces,
  Extras, Animation (Mouse Dragging: Drag Pieces / Drag Outlines, Show Drag Zones, Show Drop
  Zones). OK during a game asks "Changing the game options will restart the game in progress.
  Are you sure you want to do this?", then a new game.

## Sound events (and their default sounds)

| Event            | Default    |
| ---------------- | ---------- |
| Pegopolis Start  | (none)     |
| Pegopolis Exit   | (none)     |
| Piece Drag       | `click_5`  |
| Piece Drop       | `click_4`  |
| Piece Drop Error | `cuckoo`   |
| Victory          | `crowd_2`  |
| Defeat           | `spooky_3` |

## Deviations from the original

- Dragging works with a finger (pointer events); the zones' highlights follow the pointer, so on
  touch screens only the drop zones show (while dragging).
- The frames use the Windows 95 colours (face `#c0c0c0`).
- The InfoBox "You cannot jump any more pieces." is titled with the window's title.
- Help › How to Play shows the launcher's rules text (no WinHelp); Balloon Help is left out.
