# Winding Standoff (`winding.exe`)

A path of 64 squares winding over the board and closed on itself. Each side places its 8 pieces,
two in each of its four stretches of the path, then in turn slides one piece along the path, any
number of free squares, over no piece. The side that cannot move loses. Played against the
computer, by dragging the pieces.

## Data

- **Window**: 520×400 (window resource 256, help id 2414: default background 24, Purple Haze;
  default board 1, Purple & Gold; default piece set 4, Zen/Dragon). No art of its own.
- **Path**: 64 (column, row) pairs at `0x416338`, written at start by a static initialiser
  (`FUN_0040fe00`, partly from registers: read from memory with winedbg). Squares 0-7, 14-21,
  28-35 and 42-49 are drawn with the board's second square, the others with its first; the rest
  of the 13×10 board is not drawn (the window background shows).
- **Store**: the pieces start in the middle, the player's at (204 + 40·k, 164), the computer's
  40 pixels below (`FUN_0040c810`). The player's are the set's first piece, the computer's its
  second.

## Rules

- **Stretches** (`FUN_0040c970`): the first player's are 0-7, 14-21, 28-35, 42-49; the
  second's 8-13, 22-27, 36-41, 50-63 ("even-" and "odd-coloured squares" in the rules).
- **Placing** (`FUN_0040cda0`, `FUN_0040ca30`): while the player has pieces in the store only
  those can be dragged, onto a free square of a stretch of theirs holding fewer than two of
  their pieces. The computer (`FUN_0040da40`) places its n-th piece in its stretch n / 2, on a
  square drawn with `rand() % size` until it is not one of its own.
- **Moving**: a piece with a free square next to it can be dragged to any square up to the first
  piece in either direction. Dropping elsewhere beeps (`FUN_0040d970`) and the piece goes back.
- **End**: after each computer move (not after placements), if no player's piece has a free
  neighbour: "Player can / no longer move." (You Lose, Defeat). The computer loses when it is
  stuck ("Computer can / no longer move.") or resigns ("Computer / Resigns."), both You Win
  (Victory).

## The computer (`FUN_0040ecd0`, `FUN_0040bf40`, `FUN_0040c180`)

- Placed pieces never pass each other, so they stay in pairs, 11 22 11 22… around the path.
  The computer reads the board (a string: '1' the player's, '2' its own) from the first player's
  piece followed by one of its own (the first "12" in board order) and measures the 8 gaps
  between pairs of different sides. It measures the gaps inside the pairs too, but each is
  overwritten by the next one (same slots, as the code does): only the 8 boundary gaps remain.
- These gaps are Nim heaps: moving a piece towards the other side shrinks one. If their
  nim-sum is not 0 and `rand() % 100` is at most 40, 70, 85 or 99 (Easy to Expert, table
  `0x4182dc`), it lists the moves leaving a nim-sum of 0 and picks one with `rand() % n`;
  otherwise any shrinking move at random. The gap's piece is the (gap + 1)-th computer piece
  from the reading point, moving backwards for even gaps, forwards for odd ones.
- With every boundary gap closed: it resigns at Difficult and Expert; at Easy and Moderate it
  slides the first of its pieces that can move (backwards first) as far as it goes, and is stuck
  when none can.
- Not compared move for move with the original (its choices are random); checked by simulating
  hundreds of games against random play (always legal moves) and by tests.

## Options (dialog 256)

- **Options**: Skill Level (`SkillLevel`), Who Goes First (`PlayerGoesFirst`).
- **Board**, **Pieces** (two pieces), **Extras**.
- **Animation**: Animation Enabled and the speed (`AnimationSpeed`, default 3 in this game),
  and Mouse Dragging: Drag Pieces or Drag Outlines (`DragBitmaps`, default pieces), Show Drag
  Zones (`ShowDragZones`, default off: the draggable pieces flash under the mouse), Show Drop
  Zones (`ShowDropZones`, default on: the square under a dragged piece flashes where it can be
  dropped). Dragging outlines, the piece glides to its square once dropped.

## Sound events (and their default sounds)

| Event                  | Default   |
| ---------------------- | --------- |
| Winding Standoff Start | (none)    |
| Winding Standoff Exit  | (none)    |
| Piece Drag From Store  | `click_5` |
| Enemy Move From Store  | `instr_9` |
| Piece Drag             | `click_4` |
| Enemy Piece Move       | `instr_9` |
| Victory                | `orch_3`  |
| Defeat                 | `instr_2` |

## Deviations from the original

- The flashing of the zones is an inversion of the square or piece every 250 ms (the original's
  exact blinking was not measured); dragged outlines are a dotted square.
- If the player cannot move right after the computer's last placement, nothing is said (as in
  the original, which only checks after the computer's moves); New starts over.
- Animation timing, the menus during moves, the Help menu, system colours: as Wari's.
