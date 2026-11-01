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
- StarView bitmap resources (type 275) hold the original file name and, at byte 10, the index of
  the Windows bitmap: 256 + that byte.
- **Sprites** are bitmaps of twice their size: the image, then its mask (white = transparent)
  below or beside it. The games draw them with a masked blit (`FUN_00406320` in each game).

## Per game

What each game's code does, its data, and where the web version deviates:
`docs/games/<game>.md`, e.g. [Bulldozer](games/bulldoze.md).
