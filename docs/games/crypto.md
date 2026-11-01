# Cryptograms (`crypto.exe`)

A phrase written in a secret alphabet: guess which letter each coded letter stands for.

## Data

- **Phrases**: `crypto1.dat` (595 phrases, the longer ones) and `crypto2.dat` (1289), text files
  next to the program: one phrase per line, starting with `#`, CR LF line ends. `crypto2.dat`
  also has a stray line without `#` ("thew Arnold"), never picked. Extracted with their offsets
  (`src/assets/crypto/phrases1.json`, `phrases2.json`); if both files are missing the original
  shows "The phrase files CRYPTO1.DAT and/or CRYPTO2.DAT were not found…" (string 256, type 306)
  and quits.
- **Background**: Windows bitmap 257 (`crypt.bmp`), 640×300, the play field (letters in grey
  hatching). The window's client area is 640×300; there is no background choice (help id 0, and
  the Extras tab only has "Game Sounds").
- **Font**: StarView font 257, Arial 20.

## Rules

- **Setup** (`FUN_00401000`): skill level 1 (Easy) by default. A key is shuffled, a phrase loaded.
- **Key** (`FUN_00402c60`, `FUN_00402c80`): the identity alphabet, then each place i = 0…25
  swapped with `rand() % 26`. A letter can stand for itself. Shuffled again for each game.
- **Phrase** (`FUN_00401320`): Easy (1) and Difficult (3) read `crypto1.dat`, Moderate (2) and
  Expert (4) `crypto2.dat`. The file is opened, seeked to `(rand() * 0x7fffffff + rand()) % size`
  (signed 32-bit arithmetic, `idiv` at `0x4014a2`), 4096 bytes are read (wrapping around to the
  start), and the phrase is the line of the first `#`. **Bug**: half the time the offset is
  negative, the seek fails, and the file is read from its start: the first phrase ("A baby is
  God's opinion that the world should go on. -- Carl Sandburg" on Easy) comes up in about half
  the games — 3 of 6 launches under Wine. The other offsets are below 32768 or near
  2³¹ modulo the size. **Fixed** in the web version (see the deviations).
- **Difficult and Expert**: the spaces are removed, and a space is inserted after every 26
  characters (lines of 26 boxes).
- **Encoding** (`FUN_00402cc0`): letters through the key, case kept; anything else as is.
- **Boxes** (`FUN_00401320`, 12-byte records at `this + 0x164`, up to 256): one per character but
  spaces, 22×45 (StarView rectangles: 23×46 pixels), 24 pixels apart from (8, 2). At a space, if
  the next word (with the space) would reach x = 639, the next box goes to x = 8, 50 pixels
  lower. Non-letters are fixed and show themselves.
- **Drawing** (`FUN_004029b0`, `FUN_004052d0`): the upper half yellow with the guess, the lower
  half white with the coded letter, black 1-pixel borders, letters centred: blue, light red for
  the selected letter, black for fixed boxes, whose lower half is not drawn (the picture shows).
- **Click** (`FUN_00401e80`): when the game is over, a beep. Otherwise the box under the pointer
  is selected and all others deselected; on a box, "Click a Cell", and every box of the same
  coded letter is selected.
- **Key** (`FUN_00401a80`): a letter (upper-cased) that is not already a guess anywhere, or a
  space (which clears), goes into every selected, non-fixed box, upper or lower case as its coded
  letter; "Change a Letter"; then the victory check.
- **Victory** (`FUN_00401bb0`): every letter's guess equals the phrase's (case included). The
  game stops, boxes are deselected, and the "You Win!" dialog says "You solved the puzzle" and
  "with no hints!" / "with 1 hint." / "with N hints.", with "Victory -No Hints" or "Victory".
- **Hint** (Game › Hint, `FUN_00401810`): "Hint" sound (even when the game is over). From a random
  place of the phrase, the first letter whose guess is wrong (another random place if none is
  left after it). Its wrong guesses elsewhere are cleared; its boxes get the right letter and are
  fixed. The hint count goes up, then the victory check.
- **Give up** (`FUN_00402260` case 0xd): hints until every letter is right, then the "You Lose!"
  dialog with "You Gave Up!" and "Defeat" — also when the puzzle was already solved. Letters
  guessed right stay unfixed (blue).
- **New** (F2): "Are you sure you want to abandon the game in progress?" if a puzzle is in play.
- **Options** (dialog 256, `FUN_00401f90`): Skill Level Easy / Moderate / Difficult / Expert with
  its explanation, then Extras (sounds only). OK, when a puzzle is in play, asks "Changing the
  game options will restart the game in progress. Are you sure you want to do this?"
  (`FUN_00402230`); then a new puzzle.

## Sound events (and their default sounds)

| Event             | Default   |
| ----------------- | --------- |
| Cryptograms Start | (none)    |
| Cryptograms Exit  | (none)    |
| Click a Cell      | `click_4` |
| Change a Letter   | `click_3` |
| Victory           | `orch_2`  |
| Victory -No Hints | `handel`  |
| Defeat            | `instr_2` |
| Hint              | `instr_9` |

## Deviations from the original

- **Fixed: the phrase pick.** Every phrase of the file is equally likely. The original shows its
  first phrase in about half the games (a signed overflow, above) and favours the phrases that
  follow long ones.
- On touch screens, a row of letter keys under the puzzle (and a "Clear" key for the space), and
  a tap selects the nearest box within 12 pixels (the boxes are small on a phone).
- The Extras tab is the shared one without its background list (`ExtrasTab` with
  `background={false}`).
- Help › How to Play shows the launcher's rules text (no WinHelp); Balloon Help is left out.
