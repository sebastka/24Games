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

## Fidelity

### D6. The rules follow the original code, quirks included

- Bulldozer's undo only undoes the last push, and only until the next plain move (a blocked move
  only turns the dozer and keeps it); the menu item is disabled otherwise, as in the original.
- The dozer's cell shows only the dozer (a target under it is hidden); with a texture background
  the play field is black: both as the original draws them.
- After level 60 the "THE END" screen is loaded and can be driven around forever.
- The logic is pure and immutable (`src/games/bulldozer/logic.ts`), with tests of each of these.

### D7. Deviations from the original ⚠️

- **The current level is kept across visits** (localStorage). The original starts at level 1 on
  every launch, with passwords to skip ahead; a browser tab is closed far more casually than a
  program was. Passwords still work, from Options.
- **No garbage password after level 59** (an out-of-bounds read in the original): the plain
  completion dialog is shown.
- **Touch**: swipes on the play field and an on-screen pad (on coarse pointers); the play field
  scales by whole pixels when there is room, to the width on phones.
- **Settings** go to localStorage instead of the registry; the per-event sound choice lists the
  CD's sounds instead of opening a file dialog.
- **Help**: "How to Play" shows the launcher's rules text; the WinHelp files (`.hlp`) are not
  converted yet, and Balloon Help is left out.

### D8. Windows 95 chrome, in CSS

Title bars, menus, bevelled buttons and the options dialogs' spiral notebook (with the original
spiral bitmaps) are drawn with CSS, in the light Windows 95 palette whatever the system theme:
the games' art was made for it.
