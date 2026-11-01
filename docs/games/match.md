# CardMatch (`match.exe`)

A memory game: turn the cards two by two to find the pairs, against the clock.

## Data

- **Faces**: Windows bitmaps 257 (`cards.bmp`) and 258 (`aliens.bmp`, the Difficult level's
  "Space Alien Mode"), 600×300: 18 faces of 100×100, six per row. Easy uses the first 8.
- **Back** and **found** cards: bitmaps 259 (`blankcrd.bmp`, a "?") and 260 (`found.bmp`, a
  "!"), 100×100. → `src/assets/match/`.
- **Pointer** over a card that can be turned: `plus.cur` of `czgame32.dll` (StarView pointer
  1000), extracted as a `.cur` file.
- **Window**: client area 440×440 (main window resource, type 311), resizable: the cards are
  laid out on whatever size the window has. Default background 20, Paintball (help id 2000 / 100).

## Rules

- **Setup** (`FUN_00401100`): 4×4 cards on Easy (skill 1), 6×6 on Moderate (2, the default) and
  Difficult (3). Sound events registered: see below.
- **Deal** (`FUN_004016c0`): for each place in turn, `rand() % count` repeated until a number not
  used yet; numbers of the upper half stand for the same faces as the lower half.
- **Layout** (`FUN_004018f0`, on every resize): each card is its cell (client size / n, whole
  pixels) less 3 pixels on every side; the cards are drawn stretched (`FUN_00401a70`,
  `FUN_004017f0`).
- **Click** (`FUN_00401b50`): a click inside a card first resumes the clock (even on a matched
  card, or after the game is won). A matched card beeps. Otherwise, if two unmatched cards are
  face up they are turned back; the card is turned. The first card of a pair plays "Flip Card";
  the same card again beeps; a match turns both into "found" cards ("Make a match"); a different
  face leaves both up until the next click ("Flip Card").
- **Clock** (stopwatch `FUN_00407d00`-`FUN_00407d40`, 250 ms timer `FUN_00401000`): reset and
  paused on a new game, so it starts with the first click. While it runs, the title is
  "CardMatch Time - m:ss" (`FUN_004052a0`: minutes, two-digit seconds). When the window is
  deactivated (`FUN_004024b0`: a dialog, another window) the clock pauses and the title is
  "Card Match".
- **Victory** (all pairs): the title goes back to "CardMatch", the clock stops, the "You Win!"
  dialog of `czgame32.dll` (1003) shows "You matched them all!" and "Time - m:ss", with the
  "Victory" sound. Then the time is offered to the Hall of Fame of the skill level.
- **Game › New** (F2, `FUN_00402540` case 0xb): if the clock runs, "Are you sure you want to
  abandon the game in progress?" (Yes/No) first.
- **Options** (dialog 256, `FUN_00402210`): Skill Level (Easy / Moderate / Difficult, with the
  explanation text) and Extras. OK always deals a new game, and switches the Hall of Fame to the
  new level.

## High scores (shared code, linked into each game)

- `FUN_004080b0` loads a table: ten `Name_<level>_<i>` / `Score_<level>_<i>` registry values
  (level = skill - 1), and `PlayerName`. Titled "Hall of Fame - Easy" (- Moderate, - Difficult).
- `FUN_00405240` reads a score as the number made of all its digits ("1:13" is 113).
- `FUN_00408320` inserts a score before the first place it beats strictly (lower is better for
  CardMatch's times; a flag of the table) or at the first empty place, shifting the others down,
  after "Enter your high score" (`czgame32.dll` dialog 3001, `FUN_00409170`: "Congratulations!",
  "You have a high score. Please enter your name", the blue and red ribbons), the name field
  holding the last name entered.
- `FUN_00408220` shows the table (dialog 3000, `FUN_00408d50`/`FUN_00408f30`): the chequered
  flag, ten rows of rank / name / score boxes going down to the right (11 px right and 27 px
  down per row), OK and Clear Scores ("Are you sure you want to clear the scores in the high
  score table?", `FUN_00408500`).

The web version has these dialogs once, for every game, in
[src/shell/HallOfFame.tsx](../../src/shell/HallOfFame.tsx) and
[highscores.ts](../../src/shell/highscores.ts), and the "You Win!" / "You Lose!" / "It's A Tie!"
dialog in [EndDialog.tsx](../../src/shell/EndDialog.tsx).

## Sound events (and their default sounds)

| Event           | Default    |
| --------------- | ---------- |
| CardMatch Start | (none)     |
| CardMatch Exit  | (none)     |
| Flip Card       | `click_4`  |
| Make a match    | `boing_6`  |
| Victory         | `baby_lf3` |

"<title> Start" and "<title> Exit" are registered by every game (`FUN_00402dc0`), before its own.

## Deviations from the original

- The play field has the original window's default size, 440×440, scaled to the screen; the
  original's window could be resized freely (the cards stretched with it).
- The clock pauses while a dialog is open or the tab is hidden (the original: while its window
  is inactive).
- The cards are stretched without smoothing (the original's StretchBlt could darken shrunk
  cards).
- Help › How to Play shows the launcher's rules text (no WinHelp); Balloon Help is left out.
