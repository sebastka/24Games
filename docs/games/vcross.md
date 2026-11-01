# Vanishing Cross (`vcross.exe`)

A solitaire: play the whole deck to the four foundations in the corners of a cross, building up
in suit and around the corner (king, ace, deuce…). The cards and their dragging are the card
library described in [Poker Patience](pokergrd.md#the-card-library-shared-by-the-card-games).

## Data

- **Card holders**: Windows bitmaps 257 (`cardhld1.bmp`, stock and waste), 259 (`cardhld2.bmp`,
  the cross), 260 (`cardhld3.bmp`, the foundations: an X), all through the mask 258
  (`cardhlm1.bmp`), 81×106. `scripts/games/vcross.ts` applies the mask.
- **Window**: 374×354 client area. Holders (`FUN_004098fb`): stock (287, 65), waste (287, 183);
  foundations (6, 6), (192, 6), (6, 242), (192, 242); cross top (99, 6), left (6, 124), centre
  (99, 124), right (192, 124), bottom (99, 242). A pile shows its holder and only its top card,
  5 pixels inside (the cards under it are in state 2, not drawn).
- **Caption** (`FUN_0040adc9`), when building on a given value: "Building" and "on Deuces" (the
  rank names, "Sixe" for six, + "s") centred in (273, 12)-(374, 30) and (273, 30)-(374, 48), in
  the window font (type 279 id 256: Arial 18, bold, outlined: yellow on dark red).

## Rules

- **Piles**: 0 the stock, 1 the waste, 2-5 the foundations, 6-10 the cross.
- **Deal** (`FUN_0040b0f8`, Game › New, F2): the shuffled deck's first five cards to the cross;
  with _Build on given foundation value_ (Options, registry `BuildOnInitial`, default 1) the
  sixth to the first foundation, its rank being the base of all four; the rest to the stock,
  face down. "Deal Cards".
- **Stock** (`FUN_0040a682`): a click turns its top card over onto the waste ("Deal from Stock").
  There is no redeal.
- **Moves** (`FUN_00409e8d` builds the drop zones): the top card of the waste or of a cross pile
  goes onto a cross pile that is empty or whose top card is one rank higher, any suit, a king
  going on an ace; or onto a foundation: of its suit, one rank higher, an ace on a king; an empty
  foundation takes a card of the base rank, or, with _Build on foundation values you select_, any
  card of a suit no foundation has yet. "Drag Card", "Drop to Foundation" / "Drop to Tableau"
  (`FUN_0040a2d9`). Foundation cards never move.
- **Double-click** on the waste or a cross pile (`FUN_0040a682`): to the first empty foundation
  if the card can start one, else to the foundation of its suit it follows.
- **Undo Last Move** (Ctrl+Z): the last moved card back, including a card turned from the stock
  (face down again) and a card played to a foundation; one move only.
- **Victory** (`FUN_0040b358`): when the stock, the waste and the cross are empty, "Victory" and
  "You Win!": "You founded all / of the cards!". Then a click only beeps until the next deal.
- **New** asks "Are you sure you want to abandon the game in progress?"; **Options › OK** asks
  "Changing the game options will restart the game in progress…", while one is in progress.

## Options

_Options_ (Foundations), _Faces_, _Backs_, _Extras_, _Animation_.

## Sound events (and their default sounds)

| Event                 | Default    |
| --------------------- | ---------- |
| Vanishing Cross Start | (none)     |
| Vanishing Cross Exit  | (none)     |
| Deal Cards            | `cardshuf` |
| Deal from Stock       | `click_4`  |
| Drag Card             | `click_5`  |
| Drop to Foundation    | `click_1`  |
| Drop to Tableau       | `click_4`  |
| Victory               | `crowd_4`  |

## Defaults

Help id 2831: face set 1 (Art Deco), back 3 (Wyrm), background 28 (Blue Haze).

## Deviations from the original

- The caption's outline is drawn as eight offset copies of the text in dark red.
- Touch: drag with a finger; a double tap is a double-click.
