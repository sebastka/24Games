# Reverse engineering

How the original games are taken apart, and what was found. Addresses are virtual addresses in
the Windows 95 executables of [original/win95/program](../original/win95/program) (image base
`0x400000`).

## The toolchain

- **Resources** (art, levels, texts) are read by [scripts/lib/pe.ts](../scripts/lib/pe.ts) and
  turned into web files by [scripts/extract-assets.ts](../scripts/extract-assets.ts) (`npm run
assets`).
- **Code** is decompiled with Ghidra's headless analyser and
  [tools/re/Decompile.java](../tools/re/Decompile.java). The games import StarView by ordinal
  only; [tools/re/pe_exports.py](../tools/re/pe_exports.py) maps the ordinals to the DLLs'
  mangled C++ export names, which the script applies (demangled) before decompiling. The script
  also creates the functions Ghidra misses (only reached through vtables and StarView `Link`
  handlers), which is where the key handlers and menu commands are.

  ```sh
  # Prebuilt from the binary cache (no local compilation).
  G=$(nix build --no-link --print-out-paths --max-jobs 0 nixpkgs#ghidra)/lib/ghidra/support/analyzeHeadless
  P=original/win95/program
  python3 -I tools/re/pe_exports.py $P/sv221mn.dll $P/tl221mn.dll $P/czgame32.dll > /tmp/ordinals.txt
  $G /tmp/ghidra proj -import $P/bulldoze.exe -scriptPath tools/re \
    -postScript Decompile.java /tmp/ordinals.txt /tmp/bulldoze.c
  ```

- **Behaviour** is checked against the originals running under Wine:
  [tools/re/screenshot.sh](../tools/re/screenshot.sh) runs a game on a virtual display, sends it
  keys and takes a screenshot.

## Common to all games

- Written in C++ with **StarView 2.21** (Star Division's portable GUI toolkit, the ancestor of
  OpenOffice's VCL). Its resources are PE resource types 256 and up, each with an 8-byte header
  (id, class, sizes); strings are type 273.
- **Launcher catalogue**: `games.exe` type 273, ids 300-323, one per game:
  `Title|exe|Category|Description|Rules…`, more rule paragraphs after a NUL. Ids 258-281 of its
  bitmaps are the 16×16 list icons, in the same order. → `src/assets/catalog.json`,
  `src/assets/icons/`.
- **Settings** go to `HKLM\Software\Expert\24 Games for Windows 95\<game>` (and `\General`):
  `Background`, `SoundEnabled`, `SkillLevel`, `AnimationSpeed`, one value per sound event…
- **Backgrounds** (Options › Extras): 0-15 are StarView's `ColorName` values (black, blue, green,
  cyan, red, magenta, brown, gray, light gray, light blue…, white: the VGA palette), 16-30 are
  textures, StarView bitmaps 1100-1114 of `czgame32.dll` (`pat1.bmp`…`pat15.bmp`, Windows
  bitmaps 263-277), named in `czgame32.dll`'s strings (Gray Surface, Moo Cow, Psychedelic…).
- **Defaults from the help id**: when the registry has no value, the framework reads a game's
  default looks from its main window's help id (`Window::GetHelpId`; `FUN_004014d0`,
  `FUN_00408450`, `FUN_00408d90` in reversi.exe): the hundreds are the background (2915 / 100 =
  29, Blue Swirl), the tens the board or the card back (reversi.exe's 1632: board 3, Beveled),
  the units the piece set or the card face set (1632 % 10 = 2, Chips). Each game's id is in its
  `docs/games/<game>.md`; in the web version, `defaults(helpId, …)` in
  [src/shell/czgame/settings.ts](../src/shell/czgame/settings.ts) for the board games,
  `lookFromHelpId` in [src/shell/cards/draw.ts](../src/shell/cards/draw.ts) for the card games,
  the games' `settings.ts` otherwise.
- **Sound events**: every game registers "<Title> Start" and "<Title> Exit" first, without a
  default sound, then its own events with their defaults (bulldoze.exe `FUN_00403ff0`). Start
  plays just before the window shows, Exit in the close handler (`FUN_00404ac0`), with
  `sndPlaySound(…, SND_ASYNC | SND_NODEFAULT)`.
- **Dialogs and message boxes of CZGAME32.DLL**, the same in every game: 1000 "Changing the game
  options will restart the game in progress…", 1001 "Are you sure you want to abandon the game
  in progress?", 3000 "Are you sure you want to clear the scores in the high score table?"
  (WarningBoxes, Yes/No); dialogs 1002-1004 "You Lose!", "You Win!", "It's A Tie!" (no title
  bar, a 120×200 hand, OK under the texts); 3000 the Hall of Fame, 3001 "Enter your high score".
  See [reversi.md](games/reversi.md) and [stackblz.md](games/stackblz.md).
- StarView bitmap resources (type 275) hold the original file name and, at byte 10, the index of
  the Windows bitmap: 256 + that byte.
- **Sprites** are bitmaps of twice their size: the image, then its mask (white = transparent)
  below or beside it. The games draw them with a masked blit (`FUN_00406320` in each game).

## Per game

What each game's code does, its data, and where the web version deviates:
`docs/games/<game>.md`, e.g. [Bulldozer](games/bulldoze.md).
