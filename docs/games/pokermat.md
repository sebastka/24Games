# Poker Machine (`pokermat.exe`)

A Las Vegas video poker machine: bet $1 to $5, deal five cards, hold some, redeal the others, be
paid by the pay table. Three games: Straight (jacks or better), Jokers Wild, Deuces Wild. The
cards, the hand evaluator and the high scores are the card library described in
[Poker Patience](pokergrd.md#the-card-library-shared-by-the-card-games).

## Data

- **Window** (resource 311/256): 600×410, help id 240 (Classic faces, Casino backs, green). Its
  child windows: the hands column (11) at (110, 0) 190×200, the bet columns "Bet $1"… (6-10) at
  x = 300, 360, … 60×200, the five Hold/Discard labels (1-5) at (15 + 120i, 330) 90×30, the Deal
  button at (240, 370) 120×32, the "Game Over" panel (12) at (150, 246) 300×48. Cards at
  (25 + 120i, 227). Fonts (type 279 and the windows' own): Arial 16 bold outlined white (Win,
  Balance, the hint), Arial 30 bold outlined light green (the amounts), Arial 15 bold (the pay
  table: hand names navy, headers dark red, the selected column yellow, the paying row inverted),
  Arial 20 bold navy (labels; with a shadow in the panel).

## Rules

- **Pay tables** (`FUN_0040b8b0`), per $1; a bet of n pays n times, except the top hand at $5:
  - Straight Poker: Royal Flush 250 (4000 at $5), Straight Flush 50, Four of a Kind 25, Full House
    8, Flush 5, Straight 4, Three of a Kind 3, Two Pair 2, Pair (Jacks or better) 1.
  - Jokers Wild Poker (54 cards, the two jokers wild): Royal Flush (No Wilds) 400 (4700 at $5),
    Five of a Kind 200, Royal Flush 100, Straight Flush 50, Four of a Kind 15, Full House 7, Flush
    5, Straight 3, Three of a Kind 2, Two Pair 1, Pair (Kings or better) 1.
  - Deuces Wild Poker (the four deuces wild): Royal Flush (No Wilds) 250 (4000 at $5), Four Wild
    Cards 200, Royal Flush 20, Five of a Kind 10, Straight Flush 10, Four of a Kind 4, Full House
    4, Flush 3, Straight 2, Three of a Kind 1.
- **The payline** (`FUN_0040b300`): each row's hand is tested on its own (the evaluator's tests,
  `matches` in `poker.ts`) and the highest passing row is highlighted, after the deal and after
  the redeal: so a pair of kings or aces is "Jacks or better" in straight poker.
- **Sign in** (`FUN_0040cc60`, at start and Game › New): "Please Sign In", "Welcome to the
  Casino!", the name (registry `PlayerName`, pre-filled) for the high score tables and the title
  bar ("Poker Machine - name"). $100, cards face down, 'Press "Deal" for a new game'.
- **Bet** (`FUN_0040d690`): a click on a bet column, between hands, if the balance covers it
  ("Change Bet"); otherwise a beep. "Click a payline to change your bet" shows meanwhile.
- **Deal** (`FUN_0040c250`): the bet is taken from the balance (a beep when it is empty), the deck
  shuffled, five cards dealt, all held ("Deal Cards"); the button becomes Redeal.
- **Hold / Discard** (`FUN_0040e5c0`): a click on a card or its label flips it face down
  ("Flip Card - Back", Discard) or up again ("Flip Card - Front", Hold); a beep between hands.
- **Redeal**: the discarded cards are replaced by the next ones of the deck; the payline's
  amount in the bet column is won ("Jackpot"). If the bet is now more than the balance, the bet
  drops to the balance; at $0, "You are Broke" and the "You Lose!" dialog: "You are broke!".
  "Game Over / Press "Deal" for a new game".
- **High scores**: one table per game (Show High Scores shows the current game's). The balance is
  recorded (`FUN_00401270`, under the signed-in name, no question asked) when leaving the game
  (even $0), on Game › New (after "Are you sure you want to abandon the game in progress?" while
  the balance is not 0) and on Options › OK (after "Changing the game options will restart…").
  On Options › OK the original switches the game first: the balance goes into the new game's
  table (kept). Then a new $100 session starts, without signing in again.

## Options

_Options_ (Game To Play: ~Straight Poker, ~Jokers Wild, ~Deuces Wild; registry `GameType`),
_Faces_, _Backs_, _Extras_. No dragging, so no Animation tab.

## Sound events (and their default sounds)

| Event               | Default    |
| ------------------- | ---------- |
| Poker Machine Start | (none)     |
| Poker Machine Exit  | (none)     |
| Change Bet          | `slotcoin` |
| Deal Cards          | `cardshuf` |
| Flip Card - Front   | `click_5`  |
| Flip Card - Back    | `click_4`  |
| Jackpot             | `slotjack` |
| You are Broke       | `instr_2`  |

## Deviations from the original

- The whole window is one canvas (child windows drawn at their positions); Enter presses Deal.
- The 3D colours are Windows 95's.
- After changing options during a hand the "Game Over" panel shows again (the original leaves it
  hidden until the next redeal).
- Leaving the game is the window's close box or Game › Exit; closing the browser tab does not
  record the balance.
