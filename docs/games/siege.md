# Siege (`siege.exe`)

A solitaire: build the four suits up from the aces in the centre column, playing from the two
"wings" of piles on either side. The cards and their dragging are the card library described in
[Poker Patience](pokergrd.md#the-card-library-shared-by-the-card-games).

## Data

- **Card holders**: Windows bitmaps 257/258, 259/260, 261/262 (`cardhld1`-`3.bmp` and their masks
  `cardhlm1`-`3.bmp`), 81×106: the frame of a foundation, of a left wing pile (its end on the
  right) and of a right wing pile. `scripts/games/siege.ts` applies the masks.
- **Window**: 620×430 client area (minimum 400×350, `FUN_004096c7`); the web version keeps the
  initial size. Holders at x = 171 (left wing), 270 (foundations), 362 (right wing), rows at
  y = 1, 108, 215, 322 (measured on the original; `FUN_0040b5d5` lays them out). A pile's cards
  start 5 pixels inside its holder, wing cards 13 pixels apart: leftwards in the left wing,
  rightwards in the right one, the top card outermost.

## Rules

- **Piles** (`FUN_004096c7`, `FUN_0040b0e7`): 0-3 the foundations (one per row), 4-7 the left wing,
  8-11 the right wing (rows 0-3).
- **Deal** (`FUN_0040a5e3`, Game › New, F2): the shuffled deck goes to piles 4, 5, … 11 in turn,
  six cards each. With _Place Aces on Foundations_ (Options, registry `AcesPlaced`, default 1)
  the aces go to the foundation of their suit's row (clubs, spades, diamonds, hearts) instead;
  with _Place Aces in Tableau_ the corner piles 4, 7, 8 and 11 take seven cards. "Deal Cards".
  New asks "Are you sure you want to abandon the game in progress?" while one is.
- **Moves** (`FUN_00409b3e` builds the drop zones when a drag starts): the top card of a wing pile
  goes onto another wing pile whose top card is exactly one rank higher (any suit), or onto an
  empty wing pile; onto a foundation: an ace when it is empty, otherwise a card of the same suit
  one rank apart (the test is `abs(difference) == 1`, which only the next card can meet). Cards
  never leave a foundation. "Drag Card", then "Drop to Foundation" or "Drop to Tableau"
  (`FUN_00409f70`).
- **Double-click** (`FUN_0040a2ad`) on a wing pile sends its top card to the foundation already
  holding its suit, or to the first empty one; only if it fits there.
- **Undo Last Move** (Ctrl+Z, menu 12): puts the last moved card back. The original remembers
  the move's two piles and enables the item unless either is pile 0, which it uses as "no move":
  a card played to the first foundation cannot be undone (kept). Moves to the other foundations
  can, although foundation cards cannot otherwise be moved.
- **Victory** (`FUN_0040a875`, after each move): when every wing pile is empty, "Victory" and the
  "You Win!" dialog (CZGAME32.DLL 1003): "You played all / of the cards!".
- **Claim** (menu 13): enabled when every wing pile is in descending order from its bottom card up
  (equal ranks allowed): the rest would play out by itself. "Victory" and "You successfully /
  claimed the game!". The test also passes when the wings are empty, so Claim is enabled after a
  win (kept).
- After a win or a claim, a click only beeps until the next deal.
- **Options › OK** restarts the game, after "Changing the game options will restart the game in
  progress. Are you sure you want to do this?" while one is in progress.

## Options

_Options_ (Foundations), _Faces_, _Extras_, _Animation_ (no Backs: no card is face down).

## Sound events (and their default sounds)

| Event              | Default    |
| ------------------ | ---------- |
| Siege Start        | (none)     |
| Siege Exit         | (none)     |
| Deal Cards         | `cardshuf` |
| Drag Card          | `click_5`  |
| Drop to Foundation | `click_2`  |
| Drop to Tableau    | `click_4`  |
| Victory            | `handel`   |

## Defaults

Help id 2401: face set 1 (Art Deco), background 24 (Purple Haze).

## Deviations from the original

- The window keeps its initial size (the original can be enlarged, its piles spreading out).
- After an undo the drag zones are recomputed (the original keeps those of the undone move until
  the next one, so a pile emptied by the move cannot be dragged from until then).
- Touch: drag with a finger; a double tap is a double-click.
