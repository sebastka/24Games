#!/usr/bin/env bash
# Runs an original game under Wine on a virtual X display, optionally sends it keys, and
# screenshots the screen: the reference for the web version. From the repository root:
#
#   nix shell nixpkgs#wineWow64Packages.stable nixpkgs#xvfb-run nixpkgs#xdotool nixpkgs#imagemagick -c \
#     xvfb-run -a -s '-screen 0 1024x768x24' tools/re/screenshot.sh bulldoze.exe /tmp/shot.png alt+g o
#
# WINEPREFIX defaults to ~/.cache/24games/wine; create it once with `xvfb-run -a wineboot -i`.
# The settings the games write to the registry are in the 32-bit view:
#   wine reg query 'HKLM\Software\Expert\24 Games for Windows 95' /s /reg:32
set -euo pipefail

exe=$1 out=$2
shift 2
export WINEPREFIX=${WINEPREFIX:-$HOME/.cache/24games/wine} WINEDEBUG=-all WINEDLLOVERRIDES='mscoree,mshtml='

# The games need their DLLs next to them; run from a writable copy of the original files.
work=$(mktemp -d)
trap 'wineserver -k 2>/dev/null || true; rm -rf "$work"' EXIT
cp "$(dirname "$0")"/../../original/win95/program/* "$work"/
chmod -R u+w "$work"
cd "$work"

wine "$exe" &
for _ in $(seq 1 60); do
  xdotool search --onlyvisible --name '.' >/dev/null 2>&1 && break
  sleep 1
done
sleep 4
for key in "$@"; do
  xdotool key --delay 150 "$key"
  sleep 0.5
done
sleep 1
import -window root "$out"
