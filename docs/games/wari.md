# Wari (`wari.exe`)

Kalah under another name: six pits a side and a goal at each end; sow counterclockwise, play
again when the last piece lands in your goal, take the opposite pit when it lands in an empty pit
of yours. Played against the computer.

## Data

- **Window**: 608×300 (window resource 256, help id 401: the default background is 401 / 100
  = 4, Red, and the default piece set 401 % 10 = 1, Stones).
- **Logo**: StarView bitmap 256 (`wari.bmp`, Windows bitmap 257), 280×80 with its mask below,
  centred in the window. → `src/assets/wari/logo.png`.
- **Pieces**: CZGAME32.DLL's piece sets (bitmaps 4000-4008, names in its string 1000); Wari uses
  the first piece of a set only.
- **Strings**: 256-259, the "another turn" messages ("The last piece you played was in your goal
  pit." / "You get another turn!", "The last piece I played was in my goal pit." / "I get
  another turn! Click here to continue,").
- **Fonts**: 256 Arial 20 yellow (the counters), 257 Arial 16 blue (the messages).

## Board

Pits are numbered as `FUN_0040a3a0` places them: 0-5 the player's (bottom, left to right,
x = 81 + 76·i, y 229-294), 6 the player's goal (right, 537-603 × 5-294), 7-12 the computer's
(top, right to left), 13 the computer's goal (left). Each is drawn with two 2-pixel bevels
(`FUN_00404260`: yellow/black outside, black/yellow inside) on brown; pieces lie at random
positions in their pit (`FUN_00409530`, `FUN_00409f30`: 2 pixels inside, anywhere a 32×32 piece
fits). Counters (`FUN_0040a450`): black boxes with a brown outline, above the player's pits,
below the computer's, inside the goals.

## Rules

- **New game** (`FUN_00409530`): `NumPiecesPerCell` pieces in each pit, or for "Random" (0,
  the default) 1-6 drawn separately for each pit. With "Computer Goes First", the game then
  "plays" the player's empty goal: nothing moves and the turn passes.
- **A move** (`FUN_0040a280`): the pieces of the pit go one by one into the following pits
  (`FUN_00409f30` moves one piece, with its sounds), **both goals included**, and the origin pit
  too after a full lap. If the last lands in an empty pit of the mover's row, the opposite pit
  (12 − pit) goes to the mover's goal; the last piece stays where it is. If it lands in the
  mover's goal, the mover plays again.
- **Turns** (`FUN_004099b0`, the player's click or keys 1-6): the player's move; if it ends in
  the player's goal and the game is not over, the "You get another turn!" message is drawn over
  the logo until the next click. Otherwise the computer moves, again while it lands in its goal,
  showing its message as a modal box ("Click here to continue,") between moves.
- **End**: when either row is empty after a move. Each side scores its goal plus the pieces left
  in its row; "You Lose!" (Defeat sound) shows "My Score : n" then "Your Score : n", "You Win!"
  (Victory) and "It's A Tie!" (Tie) show "Your Score" first. The game is then over: clicks do
  nothing until Game › New.
- Game › New (F2) during a game asks "Are you sure you want to abandon the game in progress?"; OK in
  the options during a game asks "Changing the game options will restart the game in progress.
  Are you sure you want to do this?" (both CZGAME32.DLL message boxes); OK always restarts.

## The computer (`FUN_0040b3c0`, `FUN_0040b140`, `FUN_0040b080`)

- The board is passed as a string (the skill digit, then the 14 counts) and copied rotated by
  one: index 0 its goal, 1-6 the player's pits, 7 the player's goal, 8-13 its pits.
- **Sowing in the look-ahead** (`FUN_0040b080`) skips the opponent's goal, unlike the game. It
  captures the same way and reports whether the turn passes.
- **Search** (`FUN_0040b140`): fail-hard alpha-beta, the computer maximising. Instead of a depth
  it has a node budget: each of the n moves of a position gets budget / n (integer division);
  at 0 the position is evaluated. Moves are tried from the computer's left pit (12) to its right
  (7), and the player's from 5 to 0. A position where a row is empty is worth the difference of
  the final scores ± 1000.
- **Evaluation**: goals' difference; for each pit holding c pieces at distance d from its
  owner's goal, + c − 2·min(c, d) for the player's pits and the opposite for the computer's;
  ± 1000 when a goal holds more than `6 × field` pieces. That field (offset 8 of the player
  object at window + 0x2fc) is never set: the window object is on the stack, and under Wine it
  holds 0x004101f4 (read with winedbg), so the bonus never applies.
- **Budget per skill**: the table at `0x4122f8` is 65, 130, 195, 64000 (Easy to Expert), but
  it is read at `0x412298 + 2 × '1'…'4'` (the digit's character code, not its value), one entry
  too far: 130 (Easy), 195 (Moderate), 64000 (Difficult) and 47408 (Expert: past the table, the
  low half of the next code pointer). Difficult thus searches more than Expert. **Fixed** in the
  web version (see the deviations). The root divides the budget by its number of moves; with a single move it plays
  it at once.
- Deterministic: no randomness. Verified against the original under Wine (computer first, 3
  and 4 pieces per pit, Easy to Difficult): same opening moves.

## Options (dialog 256)

- **Options**: Skill Level (Easy, Moderate, Difficult, Expert; `SkillLevel`, default Easy),
  Pieces Per Cell (1-6, Random; `NumPiecesPerCell`, default Random), Who Goes First (Player Goes
  First, Computer Goes First; `PlayerGoesFirst`, default the player).
- **Pieces**: CZGAME32.DLL's piece sets (`PlayingPiece`), with a preview of four pieces.
- **Extras**: background and sounds (shared).
- **Animation**: Animation Enabled and the speed, 1-15 (`AnimationSpeed`, default 7, 0 when
  disabled): pixels per step of a moving piece (`FUN_00404b00`), with a calibrated busy loop
  between steps (`AnimationDelay`).

## Sound events (and their default sounds)

| Event               | Default    |
| ------------------- | ---------- |
| Wari Start          | (none)     |
| Wari Exit           | (none)     |
| Pick Up - Empty Pit | `click_5`  |
| Pick Up - Full Pit  | `click_5`  |
| Drop - Empty Pit    | `click_4`  |
| Drop - Full Pit     | `click_4`  |
| Victory             | `instr_5`  |
| Defeat              | `gong_1`   |
| Tie                 | `stopwach` |

"Empty" is the source left empty after the pick-up, or the target empty before the drop.

## Deviations from the original

- **Fixed: the skill levels.** The search budgets are the table the original meant (65, 130,
  195, 64000 nodes from Easy to Expert), so each level plays at least as well as the one below.
  The original reads one entry too far (130, 195, 64000, 47408), which makes its Difficult
  stronger than its Expert. The opening moves verified against Wine were with the original's
  budgets.

- Animation steps are timed (4 ms per step, as in every board game here) instead of the original's processor-calibrated busy
  loop. With animation disabled, the pieces move at once and only the last sound is heard (as
  the original's overlapping asynchronous sounds would).
- The menus stay usable while pieces move (the original is busy): New and Options stop the move
  in progress.
- The Help menu has How to Play and About only (no WinHelp, no Balloon Help), as Bulldozer's.
- The message boxes use the Windows 95 system colours, as the rest of the chrome.
