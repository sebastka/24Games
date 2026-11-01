# Poker Patience (`pokergrd.exe`)

Place 25 cards, one at a time, in a 5×5 grid so that its rows and its columns make the best poker
hands.

## The card library (shared by the card games)

Poker Patience, Siege, Vanishing Cross and Poker Machine link in the same card code; the web
version has it once, in [src/shell/cards](../../src/shell/cards). Addresses are pokergrd.exe's.

- **A card** (`FUN_00402540`): position, rank (1-13, 15 and 16 for the two jokers), suit (0 clubs,
  1 spades, 2 diamonds, 3 hearts: the order of the pip bitmaps) and a state (0 face up, 1 face
  down, other: not drawn). A deck (`FUN_004041be`) is clubs, spades, diamonds, hearts, each from
  ace to king, then the jokers if asked for. The shuffle (`FUN_004043b6`) swaps each position with
  `rand() % n` (MSVC's `rand`, seeded with the time).
- **Drawing** (`FUN_00402927`), 71×96 pixels: a rounded rectangle (`DrawRect` with corners 6, black
  pen, white brush); the index from `nums.bmp` (9×14, rows: black, black upside down, red, red
  upside down) at (3, 4) and upside down at (59, 78); the small suit sign of `spips.bmp` (11×11) at
  (2, 18) and upside down at (58, 67); then the middle: large pips of `lpips.bmp` (15×15) at fixed
  places per rank (see `PIPS` in `draw.ts`), or a 45×74 figure of the face strip at (13, 10):
  column suit for jacks, 4 + suit for queens, 8 + suit for kings, 12 + suit for the aces' big pip,
  16 and 17 for the jokers (whose index is the 14th glyph of `nums.bmp`, without suit signs). A face
  down card is the back, blitted through `backmask.bmp`. The web version derives the backs with
  their corners cut out, and the blank face, in `scripts/games/cards.ts` (`src/assets/cards/`).
- **Face sets and backs** (Options › Faces and Backs, `FUN_00403df6`, `FUN_00403fec`): CZGAME32.DLL
  strings 1002 (Classic, Art Deco, Zodiac, Monochrome: bitmaps 2004-2007 = `face_1`, `face_3`,
  `face_2`, `face_8`) and 1003 (14 backs, `backs.bmp`). The Faces preview is the set's jack of
  clubs. Kept in the registry as `CardFace` / `CardBack`. **Defaults** come from the main window's
  help id (`Window::GetHelpId`): the face set is its last digit, the back its tens digit, and the
  window background (`FUN_00407ab0`) its hundreds.
- **Dragging** (`FUN_0040a0f6` button down, `FUN_00409d86` move, `FUN_0040a37c` button up): the
  game declares drag zones and drop zones (rectangle, id, enabled); a press in an enabled drag zone
  picks it up (virtual method +0x48), the release in an enabled drop zone drops (+0x4c), elsewhere
  cancels (+0x44); a press outside any drag zone beeps. Options › Animation: _Drag Cards_ (the
  card bitmap follows the mouse) or _Drag Outlines_ (an XOR outline 3 pixels wide), _Show Drag
  Zones_ (the drag zone under the mouse gets an inverted 3-pixel outline, `FUN_0040c3e5` with
  style 3) and _Show Drop Zones_ (the drop zone under a dragged card is inverted, style -1).
  Registry: `DragBitmaps` (default 1), `ShowDragZones`, `ShowDropZones` (default 0).
- **Poker hands** (`FUN_0040441e`, Poker Patience and Poker Machine): see `poker.ts`. Wild cards
  are taken out of the hand (`FUN_004046c6`) and counted. In order: Royal Flush (No Wilds); Four
  Wild Cards (at most one real card); Five of a Kind; Royal Flush (same suit, and a straight up to
  the ace, `FUN_004048ae`: no two real cards of a rank, within five ranks, the highest plus the
  wilds reaching the ace); Straight Flush; Four of a Kind; Full House (`FUN_004047aa`); Flush;
  Straight (`FUN_00404821`, aces low, or the ace-high one); Three of a Kind; Two Pair (no wilds,
  `FUN_004049dc`); Pair (Kings or better) (two kings or aces, or one and a single wild); Pair
  (Jacks or better) (`FUN_00404a48`); Pair; Nothing. Quirk kept: in the ace-high test the wilds
  count both for the gaps and above the top card, so a joker with 9, 10, Q, K of a suit is a royal
  flush.
- **High scores** ("Hall of Fame", `FUN_00401000`…, Poker Patience and Poker Machine): ten names
  and scores per table, registry `Name_<table>_<i>` and `Score_<table>_<i>`, the last name in
  `PlayerName`. A score enters (`FUN_0040123b`) at the first place that is empty or holds a
  lower score (ties go below); "Enter your high score" (CZGAME32.DLL dialog 3001, the rosettes
  `blue_ri2`/`red_rib2`) asks for the name, the last one pre-selected. Game › Show High Scores
  (dialog 3000, `FUN_00401d1e`): the chequered flag (`flag2.bmp`) with ten rows, each 11 pixels
  right of the one above, and Clear Scores ("Are you sure you want to clear the scores in the high
  score table?", string 3000).

## Rules

- **Deal** (`FUN_0040654c`, Game › New, F2): a shuffled deck, in one pile of 52 or two of 26
  (Options: _One/Two Face Down Pile(s)_, _One/Two Face Up Pile(s)_; registry `ShowTwoDecks`,
  default 1, and `ShowCardFronts`, default 0). Only a pile's top card is face up, unless the
  piles are face up. The left pile is selected. "Deal Cards" sound. New asks "Are you sure you
  want to abandon the game in progress?" unless the game is over.
- **Placing** (`FUN_00405a11`): the top card of a pile into an empty cell, by dragging it there
  ("Drag Card" when picked up, "Drop Card" when dropped), by clicking the cell (the selected pile;
  no sound) or by typing the cell's letter A-Y (`FUN_004052e8`, "Drop Card"). Clicking a full
  cell beeps. With two piles, the arrow between them (`arrows.bmp`) shows the selected pile;
  clicking it, clicking or dragging a pile, or the left and right arrow keys select one.
- **End**: when the 25th card is placed, "Game Over", then "Your Score" (`FUN_00405bfd`, dialog
  257): the hand and points of each row and column, and "Total Score = n". Then the high score
  table of the variant (four tables: face up × 2 + two piles). Game › Show Current Score shows the
  score again until the next deal.
- **Scoring** (`FUN_00404be0` with its second table, the "English" Poker Squares points): pair 1,
  two pair 3, flush 5, three of a kind 6, full house 10, straight 12, four of a kind 16, straight
  or royal flush 30. Jacks/kings-or-better pairs are plain pairs here. The first table (American:
  2, 5, 10, 15, 20, 25, 50, 75, 100) is in the executable but never used.
- **Options › OK** restarts the game, after "Changing the game options will restart the game in
  progress. Are you sure you want to do this?" (CZGAME32.DLL string 1000) unless it is over; No
  stays in the dialog.

## Layout

The client area is 400×440 (the window resource). Piles at y = 5: one pile at x = 324, its cards
13 pixels apart leftwards; two piles at x = 115 (leftwards) and 214 (rightwards), the arrow at
(188, 40). The grid (`FUN_0040654c`): columns 80 pixels apart (a fifth of the width), cards
centred in them; rows from y = 106, (440 − 207) / 4 = 58 pixels apart, so each row of cards
covers the bottom of the one above. An empty cell (`FUN_00406252`) is a rounded rectangle in the
3D face colour with a 3-pixel 3D shadow border, and its letter (Arial, bold).

## Sound events (and their default sounds)

| Event                | Default    |
| -------------------- | ---------- |
| Poker Patience Start | (none)     |
| Poker Patience Exit  | (none)     |
| Deal Cards           | `cardshuf` |
| Drag Card            | `click_5`  |
| Drop Card            | `click_4`  |
| Game Over            | `baby_lf3` |

The "Start" and "Exit" events are registered by the library for every game (`FUN_00407ab0`).

## Defaults

Help id 1851: face set 1 (Art Deco), back 5 (Innovation), background 18 (Psychedelic).

## Deviations from the original

- The 3D colours are Windows 95's (face `#c0c0c0`, shadow `#808080`), not the system's.
- The high scores and the options are kept in localStorage; Help shows the launcher's rules
  text (as in every game here), and the About box is the short one of the web version.
- Touch: a card can be dragged with a finger, or a cell tapped.
