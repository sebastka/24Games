# Design decisions

Decisions taken while building 24Games, with their rationale. What the original games do is in
[docs/reverse-engineering.md](docs/reverse-engineering.md). Entries marked ⚠️ are the ones most
worth reviewing.

## Scope and architecture

### D1. A reimplementation, not an emulation ⚠️

- **Choice.** Each game is rewritten in TypeScript from its decompiled code, with the original
  art, sounds and texts extracted from the executables.
- **Why.** The games are small, turn-based and 640×480: their rules fit in a few hundred lines
  each, and a rewrite runs anywhere (phones included), scales sharply, and can add touch controls.
- **Cost.** Every game has to be decompiled and rewritten; fidelity depends on reading the code
  right. The originals running under Wine are the reference to compare against.
- _Alternative._ Running the original executables in the browser (v86 with Windows 95, or
  Boxedwine): every game at once and exact, but megabytes of emulator and OS, slow on phones,
  no touch, and a Windows licence.

### D2. Stack: React 19, Vite 8, TypeScript, Canvas 2D; nothing else at run time

- Same toolchain and conventions as the other TypeScript projects (ferrocine-ui): `tsc` 7 for
  typechecking, ESLint, Prettier, `node --test` with type stripping, no test framework.
- React for the chrome (windows, menus, dialogs, the launcher), a canvas for each play field.
- A static site: nginx (Docker Hardened Image, non-root, read-only) serves it; no server code.

### D3. The original files and the extracted assets are committed ⚠️

- **Choice.** `original/win95/program` (7 MB) is a verbatim copy of the CD's installed files;
  `src/assets` (1.2 MB) is what `npm run assets` extracts from it, and what the build uses. Both
  are committed. CI re-runs the extraction and fails if the output differs.
- **Why.** The game is long out of print; keeping the originals next to the code makes the
  reverse engineering reproducible, and committing the extracted assets keeps the build (and the
  Docker image) independent of the original files.
- **Cost.** The originals remain © Expert Software and The Code Zone ("abandonware" is not a
  legal status): the repository says so in the README and in `original/README.md`, and the MIT
  licence covers only the new code. Publishing the repository or the image distributes them.
- _Alternative._ "Bring your own CD": parse the original files in the browser (the same PE
  parser runs there) and keep them in IndexedDB; nothing copyrighted is distributed, at the cost
  of an import step for every player.

### D4. The asset pipeline is TypeScript without dependencies

- A PE resource reader, DIB and icon decoders and a PNG encoder (`scripts/lib/`, about 300 lines,
  unit-tested against the original files) instead of icoutils/ImageMagick: `npm run assets` runs
  anywhere Node runs, including CI.
- Sprites become PNGs with an alpha channel (from the originals' masks); 1- and 4-bit art stays
  indexed, so the PNGs are smaller than the BMPs. WAVs (8-bit PCM, small, played by every
  browser) are copied as they are.

### D5. Hash routes

`#/bulldoze` rather than `/bulldoze`: the site is plain static files, any static host works, and
nginx needs no rewrite rules beyond the SPA fallback.

### D9. The CZGAME framework once, in src/shell

- **Choice.** What the originals share (the framework code statically linked into every
  executable, CZGAME32.DLL's dialogs and art) is one module of `src/shell`: the Hall of Fame,
  the end-of-game dialogs, the message boxes, Options › Extras and the Keys, Board, Pieces and
  Animation tabs, the masked sprites, bevels, piece animation, the timers' loop, `rand()`;
  `src/shell/czgame` for the board games, `src/shell/cards` for the card games. A game imports
  from the shell and its own directory only.
- **Why.** The originals behave the same in every game; one implementation keeps them so (one
  look of the Hall of Fame, one end dialog) and a fix reaches every game. The games were first
  ported in parallel, each with its copy.
- **Cost.** Where the copies disagreed, one was kept, checked against the decompiled code or the
  originals under Wine: e.g. the bevel's corner pixels (the edges drawn top, right, bottom,
  left, `FUN_00404260`), the Hall of Fame's buttons over the flag, the end dialogs without a
  title bar, an animation step of 4 ms. High scores saved by the earlier per-game formats are
  still read.

## Fidelity

### D6. The rules follow the original code, quirks included

- Each game's rules, computer player, timings and scoring are rewritten from its decompiled code,
  with the quirks that make the game what it was: Bulldozer's undo of the last push only, Think
  Tank's time bonus that is shown but never added, Siege's undo that cannot take a card back from
  the first foundation, the Poker Machine's pay table read from the top… Each game's page in
  [docs/games/](docs/games) lists them.
- The logic is pure and immutable (`src/games/<id>/logic.ts`), with tests of these behaviours;
  where the original was observed under Wine (the computer's opening moves, the scores), the tests
  check the same results.

### D7. Bugs that spoil the game are fixed ⚠️

- **Choice.** A bug of the original is fixed when it spoils play; it is then documented in the
  game's page (the original behaviour, marked **Fixed**, and a deviation) and in the README:
  - Cryptograms: every phrase is equally likely (a signed overflow showed the file's first phrase
    in about half the games).
  - Wari: the search budgets the original meant (it read its table one entry too far, so that
    Difficult played better than Expert).
  - Nim: with "Leave the Last Piece", taking every remaining piece ends the game (it stalled).
  - Core Meltdown: the computer's opening square cannot be clicked (clicking it lost the game).
  - Bulldozer: no garbage password after level 59 (an out-of-bounds read); Nim: key G no longer
    selects a seventh row, which corrupted the options; Think Tank: a respawn gives up instead of
    hanging when there is no free spot.
- **Why.** These are accidents, not design: a player of the time would have called them bugs, and
  keeping them only makes the games worse. The other quirks are kept (D6).
- **Cost.** The fixed games no longer replay the original exactly; where a test compares with the
  original (Wari's opening moves under Wine), it runs with the original's values.

### D8. Windows 95 chrome, in CSS

Title bars, menus, bevelled buttons and the options dialogs' spiral notebook (with the original
spiral bitmaps) are drawn with CSS, in the light Windows 95 palette whatever the system theme:
the games' art was made for it.

### D10. Other deviations, for modern platforms ⚠️

- **Bulldozer keeps the current level across visits** (localStorage). The original starts at
  level 1 on every launch, with passwords to skip ahead; a browser tab is closed far more
  casually than a program was. Passwords still work, from Options.
- **Touch**: drag and drop by touch, swipes and an on-screen pad (on coarse pointers) for the
  keyboard-driven games, an on-screen keyboard for Cryptograms; the play fields scale by whole
  pixels when there is room, to the width on phones.
- **Settings and high scores** go to localStorage instead of the registry; the per-event sound
  choice lists the CD's sounds instead of opening a file dialog.
- **Help**: "How to Play" shows the launcher's rules text; the WinHelp files (`.hlp`) are not
  converted yet, and Balloon Help is left out.
- The windows keep the original's default size (several originals could be resized).
