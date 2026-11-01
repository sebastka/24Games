# Original files

> [!IMPORTANT]
> These files are **not** covered by this repository's MIT license. _24 Games for Windows 95_ is
> © 1995 Expert Software, Inc.; "24 Games" and the Expert logo are trademarks of Expert Software,
> Inc. The games, their art, sounds and help files are © 1995 The Code Zone. StarView (`sv221mn.dll`,
> `tl221mn.dll`) is © Star Division. They are kept here, unmodified, as the reference the web
> version is reverse-engineered from.

`win95/program/` is the `win95\program` directory of the _24 Games for Windows 95_ CD-ROM
(volume label `24GAMES`, files dated October 1995): the installed form of the Windows 95
version, which the installer (`win95\setup.exe`, InstallShield 3) copies to the hard disk.

Not kept: the Windows 3.1 version (`win\`, the same games built for Win32s), the installer, and
`catalog\` (an Expert Software product catalogue).

| Files                       | What                                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| `games.exe`                 | The launcher: the game list, descriptions and rules of all 24 games      |
| `<game>.exe`, `<game>.hlp`  | One program and one WinHelp file per game                                |
| `czgame32.dll`              | Code and art shared by the games (backgrounds, cards, dialogs' artwork)  |
| `sv221mn.dll`, `tl221mn.dll`| StarView 2.21, the C++ GUI toolkit the games are written with            |
| `*.wav`                     | The sounds, shared by all games                                          |
| `crypto1.dat`, `crypto2.dat`| Cryptograms' phrases                                                     |

The web version does not load these files: `npm run assets` extracts what it needs into
`src/assets/`. See [docs/reverse-engineering.md](../docs/reverse-engineering.md).
