# Bulldozer (`bulldoze.exe`)

Sokoban with a bulldozer: push all the rocks onto the targets.

## Data

- **Levels**: type 273, ids 301-360 (levels 1-60) and 361 (the "THE END" screen after level 60).
  After the header, 240 hexadecimal digits, row by row: 12 rows of 20 tiles. Loaded by
  `FUN_00401af0` into a column-major array.
- **Tiles** (the digits, and the index in the piece sheet): 0 floor, 1 target, 2 rock, 3 rock on
  a target, 4-7 the dozer facing up, down, left, right (its start; the cell becomes floor),
  8-F walls in eight looks.
- **Piece sets**: Windows bitmaps 257 (colour) and 258 (monochrome), 512×64: 16 tiles of 32×32,
  masks below. Names in type 273 id 256 (`Bulldozer,Monochrome`). The sheet is pre-composed on
  the background colour (`FUN_004012b0`); with a texture background, the colour is black.
- **Passwords** for levels 4, 8, … 56: a static initialiser (`FUN_00402fb0`) copies 14 strings
  from `0x40f110`-`0x40f178` to a table at `0x40d00b` (5 bytes per entry, indexed by level / 4),
  each letter stored + 1: `CPOL` is BONK. The others: NERD, BURP, SPUD, GROK, SPOT, KALE, PODS,
  TAPS, KRIL, GNIP, GORN, LOUT, IAOM.
- **Piece set preview** (Options › Pieces): 4×3 tiles at `0x40f008`: `9 8 8 D / 8 7 3 8 / A 8 8 C`.

## Rules

- **Moving** (`FUN_00401df0`, called by the key handler `FUN_004015b0` with the dozer's cell,
  the next one, the one beyond and the new facing): onto floor or a target, the dozer moves
  ("Move" sound). Onto a rock or a rock on a target, with floor or a target beyond, it pushes
  ("Move Rock", or "Move Rock To Target" when the rock lands on one). The count of free targets
  goes down when a rock lands on a target and up when one leaves it. Anything else: the dozer only
  turns to face that way. The dozer cannot leave the board.
- **Undo** (`FUN_00402340`, Ctrl+Z): only the last push. A push records the two cells it changed,
  the dozer's previous cell and facing, and the free-target count; a plain move forgets the push;
  a turn keeps it. The menu item is enabled only while a push is recorded. Undo restores the
  cells, then the dozer (or beeps if there was no dozer move).
- **Restart** (`FUN_00401c90`, F2): the level as loaded.
- **Completion** (end of the key handler): when no target is free. Level 60: "Complete Final
  Level" sound and the congratulations dialog. When the next level is a multiple of 4: "Receive
  Password" and the password dialog. Otherwise "Complete Level". Then the next level. After level
  60 comes the "THE END" screen, whose free-target count is forced to 1 so that it never
  completes.
- **Bug**: after level 59, the password dialog reads entry 15 of the table, past its end, and shows
  garbage (the web version shows the plain completion dialog: there is no starting level 60).
- **Starting level** (Options, `FUN_00402840`): Level 1 (after "Are you sure you want to return
  to level 1?"), or 4, 8, … 56 with the password (compared upper-cased). The current level is not
  saved: every launch starts at level 1.

## Sound events (and their default sounds)

| Event                | Default   |
| -------------------- | --------- |
| Move                 | (none)    |
| Move Rock            | (none)    |
| Move Rock To Target  | `click_4` |
| Complete Level       | `crowd_3` |
| Receive Password     | `crowd_2` |
| Complete Final Level | `handel`  |

## Deviations from the original

- The current level is kept across visits (the original starts at level 1 on every launch).
- No garbage password after level 59: the plain completion dialog is shown.
- Swipes and an on-screen pad on touch screens.
