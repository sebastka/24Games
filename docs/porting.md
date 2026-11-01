# Porting a game

How a game of the CD becomes a web game here, and the conventions that keep games independent of
each other. Bulldozer ([src/games/bulldoze](../src/games/bulldoze)) is the worked example.

## Files of a game

Everything of a game is named after its original executable (`<id>`: `reversi`, `pokergrd`…):

| Path                       | What                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| `src/games/<id>/Game.tsx`  | The game window (default export, props `GameProps`); found automatically    |
| `src/games/<id>/logic.ts`  | The rules, and the computer player: pure functions, no DOM                  |
| `src/games/<id>/style.css` | Its styles, imported by `Game.tsx`, scoped under the window's class         |
| `scripts/games/<id>.ts`    | Extraction of its assets into `src/assets/<id>/` (`npm run assets -- <id>`) |
| `src/assets/<id>/`         | The extracted assets (generated, committed)                                 |
| `test/<id>.test.ts`        | Tests of `logic.ts` (and of the extraction's output)                        |
| `docs/games/<id>.md`       | What the original does (with function addresses), its data, deviations      |

Shared pieces, in [src/shell](../src/shell): `Window` and `MenuBar`, `Dialog`, `Notebook`,
`ListBox`, `ExtrasTab` (background and sounds, in every game's options), `TouchPad`,
`canvas.ts` (`useImage`, `useImages`, `useFitScale`), `sound.ts` (`playSound`, `beep`),
`storage.ts` (`load`, `save`), `backgrounds.ts`, `catalog.ts` (each game's title, icons and
rules text). Art shared by several games (cards, piece sets, the board, the "I win / You win /
Tie" pictures, ribbons) is extracted once into `src/assets/shared/czgame/` under the original
names (masks, where a bitmap has one, are still in the bitmap).

## Fidelity

- The rules, the computer player (its search, its skill levels, its randomness), the scoring and
  the timings come from the decompiled code, not from memory of similar games. Record in
  `docs/games/<id>.md` which function does what.
- The window looks like the original: its size and layout, its art, its menus (with their
  accelerators), its options dialog (a `Notebook` with the game's own tabs, then
  `ExtrasTab`), its dialogs with their texts. Run the original under Wine to compare
  ([tools/re/screenshot.sh](../tools/re/screenshot.sh)).
- Sound events and their default sounds, as the game registers them at start (in Bulldozer,
  `FUN_00405440(this, "Move Rock To Target", "click_4")`).
- Settings that the original keeps in the registry (skill level, piece set, background…) go to
  `storage.ts` under the game's id.
- Deviations (a bug not reproduced, touch controls, something kept across visits) are listed at
  the end of `docs/games/<id>.md`.

## Modern platforms

- Usable with a mouse, a keyboard and a finger: pointer events (not mouse events), no hover-only
  interaction, the `TouchPad` for keyboard-driven games, drag and drop that works by touch.
- The play field scales: whole pixels when there is room, the width on a phone (`useFitScale`).
- Real-time games run on `requestAnimationFrame` with the original's tick length (StarView
  `Timer`s, `SetTimer`), not on frame rate, and pause when the tab is hidden.
- Randomness through an injectable random function, so tests are deterministic.
