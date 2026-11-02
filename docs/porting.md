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

Shared pieces, in [src/shell](../src/shell). The originals link the same framework code into
every executable (and share CZGAME32.DLL's art and dialogs); here each piece exists once, and a
game never imports from another game's directory:

| Module                                                       | What                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Window.tsx`                                                 | `Window` and `MenuBar` (`onMenuChange`: a menu is pulled down), `Label` (mnemonics)          |
| `Dialog.tsx`                                                 | `Dialog` (`icon`, `untitled`, `noFooter` with `DialogButtons`), `Notebook`, `ListBox`        |
| `Boxes.tsx`                                                  | `ConfirmBox` (`CONFIRM_NEW`, `CONFIRM_OPTIONS`), `MessageBox`                                |
| `EndDialog.tsx`                                              | "You Win!" / "You Lose!" / "It's A Tie!" (CZGAME32.DLL dialogs 1002-1004)                    |
| `HallOfFame.tsx`, `useHighScores.ts`                         | The high score dialogs (3000, 3001); the tables, shared by the server (MariaDB) or local     |
| `HelpDialogs.tsx`                                            | Help › How to Play (the launcher's rules text) and About                                     |
| `ExtrasTab.tsx`                                              | Options › Extras: background (`background={false}` to leave it out) and sounds               |
| `sound.ts`, `soundEvents.ts`                                 | `playSound`, `beep`, `playEvent`; `soundEvents` and `useStartExit` ("<Title> Start/Exit")    |
| `canvas.ts`                                                  | `useImage(s)`, `useFitScale`, the window background (`fillBackground`, `useBackground`…)     |
| `sprites.ts`, `MaskedSprite.tsx`                             | The masks of CZGAME32.DLL's art applied (`maskSprite`, `applyMask`, `useMasked`…)            |
| `loop.ts`                                                    | `useFrameLoop`, `useFixedStep`: real-time games' timers on requestAnimationFrame             |
| `keys.ts`, `PlayerKeys.tsx`                                  | The 68 keys of Options › Keys                                                                |
| `random.ts`                                                  | The C runtime's `rand()` (`msvcRand`)                                                        |
| `czgame/`                                                    | The board games' framework: pieces, boards, bevels, animation, turns, tabs, help id defaults |
| `cards/`                                                     | The card games' library: cards, poker hands, drag and drop, Faces and Backs tabs             |
| `TouchPad.tsx`, `storage.ts`, `backgrounds.ts`, `catalog.ts` | The on-screen pad, settings in localStorage, the backgrounds, the launcher's catalogue       |

Art shared by several games (cards, piece sets, the board, the "I win / You win / Tie" pictures,
ribbons) is extracted once into `src/assets/shared/czgame/` under the original names (masks,
where a bitmap has one, are still in the bitmap).

## Fidelity

- The rules, the computer player (its search, its skill levels, its randomness), the scoring and
  the timings come from the decompiled code, not from memory of similar games. Record in
  `docs/games/<id>.md` which function does what.
- The window looks like the original: its size and layout, its art, its menus (with their
  accelerators), its options dialog (a `Notebook` with the game's own tabs, then
  `ExtrasTab`), its dialogs with their texts. Run the original under Wine to compare
  ([tools/re/screenshot.sh](../tools/re/screenshot.sh)).
- Sound events and their default sounds, as the game registers them at start (in Bulldozer,
  `FUN_00405440(this, "Move Rock To Target", "click_4")`), after "<Title> Start" and "<Title>
  Exit" (`soundEvents(title, events)`; `useStartExit` plays them).
- Settings that the original keeps in the registry (skill level, piece set, background…) go to
  `storage.ts` under the game's id.
- High scores: `useHighScores(id)` gives the tables (shared by the server, or kept in the
  browser) and `record`/`clear` for the `HallOfFame` dialogs; the game is listed in
  `SCORE_GAMES` (`src/shared/highscores.ts`), with whether a lower score is better.
- Deviations (a bug not reproduced, touch controls, something kept across visits) are listed at
  the end of `docs/games/<id>.md`.

## Modern platforms

- Usable with a mouse, a keyboard and a finger: pointer events (not mouse events), no hover-only
  interaction, the `TouchPad` for keyboard-driven games, drag and drop that works by touch.
- The play field scales: whole pixels when there is room, the width on a phone (`useFitScale`).
- Real-time games run on `requestAnimationFrame` with the original's tick length (StarView
  `Timer`s, `SetTimer`), not on frame rate, and pause when the tab is hidden, a dialog is open or
  a menu is pulled down (`loop.ts`).
- Randomness through an injectable random function, so tests are deterministic.
