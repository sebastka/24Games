import { useCallback, useEffect, useRef, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import {
  backgroundStyle,
  bevel,
  BOARD_SHEET,
  centeredText,
  drawSquare,
  glide,
  inside,
  usePieces,
  type Outcome,
  type Rect,
} from '../wari/czgame.ts';
import { AboutText, EndDialog } from '../wari/czgame.tsx';
import {
  computerMove,
  computerText,
  endLines,
  isOver,
  MAX_PILE,
  ROWS,
  selectionText,
  take,
  type Move,
  type Piles,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('nim')!;

// Window 380×300 (nim.exe's window resource); the board of 9×6 squares of 40 pixels at (11, 11):
// the row letters, then up to 8 pieces (`FUN_00401000`).
const WIDTH = 380;
const HEIGHT = 300;
const ORIGIN = 11;
const SQUARE = 40;
const PANEL: Rect = { left: 4, top: 4, right: 377, bottom: 257 };
/** The status line, also a button: clicking it takes the chosen pieces. */
const STATUS: Rect = { left: 4, top: 262, right: 376, bottom: 296 };

const FACE = '#c0c0c0';
const LIGHT = '#ffffff';
const SHADOW = '#808080';

const square = (col: number, row: number): Rect => ({
  left: ORIGIN + col * SQUARE,
  top: ORIGIN + row * SQUARE,
  right: ORIGIN + col * SQUARE + SQUARE - 1,
  bottom: ORIGIN + row * SQUARE + SQUARE - 1,
});

/** The chosen pieces: those of `row` from column `from` to its end (`0x260`, `0x261`). */
interface Selection {
  row: number;
  from: number;
}

interface View {
  piles: Piles;
  /** The piles at the start: their squares stay drawn when emptied. */
  shape: Piles;
  selection: Selection | null;
  /** The computer's last move, shown in the status line until the next choice. */
  said: string | null;
  /** Pieces flying off the board: n pieces 40 pixels apart. */
  flying: { x: number; y: number; n: number } | null;
}

const asMove = (piles: Piles, s: Selection | null): Move | null =>
  s && s.from >= 0 && s.from < piles[s.row]! ? { row: s.row, count: piles[s.row]! - s.from } : null;

function draw(
  ctx: CanvasRenderingContext2D,
  view: View,
  inProgress: boolean,
  sheet: HTMLImageElement,
  board: number,
  pieces: [HTMLCanvasElement, HTMLCanvasElement],
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  bevel(ctx, PANEL, 4, FACE, [LIGHT, SHADOW, LIGHT, SHADOW]);
  ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
  for (let row = 0; row < ROWS; row++) {
    const label = square(0, row);
    drawSquare(ctx, sheet, board, 0, label.left, label.top);
    ctx.fillStyle = '#ffff00';
    centeredText(ctx, label, String.fromCharCode(65 + row));
    const selected = view.selection?.row === row ? view.selection.from : Infinity;
    for (let col = 0; col < view.shape[row]!; col++) {
      const r = square(col + 1, row);
      drawSquare(ctx, sheet, board, 1, r.left, r.top);
      if (col < view.piles[row]!) ctx.drawImage(pieces[col >= selected ? 1 : 0], r.left + 4, r.top + 4);
    }
  }
  bevel(ctx, STATUS, 1, FACE, [LIGHT, SHADOW, LIGHT, SHADOW]);
  ctx.fillStyle = '#800000';
  ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
  centeredText(ctx, STATUS, view.said ?? selectionText(inProgress, asMove(view.piles, view.selection)));
  if (view.flying) {
    for (let i = 0; i < view.flying.n; i++) ctx.drawImage(pieces[1], view.flying.x + i * SQUARE, view.flying.y);
  }
}

export default function Nim({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [open, setOpen] = useState<'options' | 'rules' | 'about' | 'abandon' | null>(null);
  const [end, setEnd] = useState<{ outcome: Outcome; lines: [string, string] } | null>(null);
  // The game in progress (`0x26c`).
  const [inProgress, setInProgress] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const sheet = useImage(BOARD_SHEET);
  const pieces = usePieces(settings.pieceSet);
  const view = useRef<View>({ piles: [], shape: [], selection: null, said: null, flying: null });
  const playing = useRef(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  useEffect(() => saveSettings(settings), [settings]);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && sheet && pieces) draw(ctx, view.current, playing.current, sheet, settings.board, pieces);
  }, [sheet, pieces, settings.board]);
  useEffect(redraw, [redraw, scale, inProgress]);
  const latestRedraw = useRef(redraw);
  useEffect(() => {
    latestRedraw.current = redraw;
  });
  const paint = () => latestRedraw.current();

  const sound = (event: SoundEvent) => {
    const s = settingsRef.current;
    const name = s.sounds[event];
    if (s.soundEnabled && name) playSound(name);
  };

  /** Pieces leave a row, flying off to the right of the window (`FUN_00402420`). */
  const remove = async (move: Move, g: number) => {
    const v = view.current;
    const from = v.piles[move.row]! - move.count;
    const start = { x: square(from + 1, move.row).left + 4, y: square(from + 1, move.row).top + 4 };
    v.piles = take(v.piles, move);
    const speed = settingsRef.current.speed;
    if (speed > 0 && move.count > 0) {
      v.flying = { ...start, n: move.count };
      await glide(
        start,
        { x: WIDTH, y: start.y },
        speed,
        (p) => ((v.flying = { ...p, n: move.count }), paint()),
        () => generation.current !== g,
      );
      v.flying = null;
    }
    paint();
  };

  const over = (winner: 'player' | 'computer') => {
    playing.current = false;
    setInProgress(false);
    view.current.said = null;
    view.current.selection = null;
    sound(winner === 'player' ? 'Victory' : 'Defeat');
    setEnd({ outcome: winner, lines: endLines(winner, settingsRef.current.takeLast) });
    paint();
  };

  /**
   * Takes the chosen pieces, then the computer moves (`FUN_004028f0`, Enter or a click on the
   * status line). `computerOnly` starts a game with the computer first.
   */
  const play = async (computerOnly = false) => {
    if (busy.current || !playing.current) return;
    const v = view.current;
    const g = generation.current;
    const { takeLast } = settingsRef.current;
    if (!computerOnly) {
      const move = asMove(v.piles, v.selection);
      if (!move) {
        beep();
        return;
      }
      busy.current = true;
      sound('Player removes pieces');
      v.selection = null;
      await remove(move, g);
      if (generation.current !== g) return;
      if (isOver(v.piles, takeLast)) {
        busy.current = false;
        over('player');
        return;
      }
    }
    busy.current = true;
    const reply = computerMove(v.piles, takeLast, Math.random);
    sound('Computer removes pieces');
    v.said = computerText(reply);
    paint();
    await remove(reply, g);
    if (generation.current !== g) return;
    busy.current = false;
    if (isOver(v.piles, takeLast)) over('computer');
  };

  /** Game › New (F2). */
  const newGame = (s: Settings = settingsRef.current) => {
    settingsRef.current = s;
    generation.current++;
    busy.current = false;
    playing.current = true;
    view.current = { piles: [...s.piles], shape: [...s.piles], selection: null, said: null, flying: null };
    setInProgress(true);
    setEnd(null);
    paint();
    if (!s.playerFirst) void play(true);
  };

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sound('Nim Start');
    newGame();
  });

  const exit = () => {
    sound('Nim Exit');
    onExit();
  };
  const askNewGame = () => (inProgress ? setOpen('abandon') : newGame());

  /** A new choice, with its sound; the status line shows it. */
  const choose = (selection: Selection | null, withSound = true) => {
    if (withSound) sound('Select Pieces');
    const v = view.current;
    v.selection = selection && asMove(v.piles, selection) ? selection : null;
    v.said = null;
    paint();
  };

  const idle = () => playing.current && !busy.current && !open && !end;

  /** A row's letter (`FUN_00401bf0`): the last piece of the row, then one more each time. */
  const letter = (row: number) => {
    const v = view.current;
    if (v.selection?.row !== row) choose({ row, from: v.piles[row]! - 1 });
    else if (v.selection.from > 0) choose({ row, from: v.selection.from - 1 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || end) return;
      const key = e.key.toLowerCase();
      if (e.key === 'F2') askNewGame();
      else if (!idle() || e.ctrlKey || e.altKey) return;
      else if (key.length === 1 && key >= 'a' && key <= 'f') letter(key.charCodeAt(0) - 97);
      else if (e.key === 'Enter') void play();
      else if (e.key === ' ') choose(null, false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** A click (`FUN_004020c0`): the status line takes, a letter takes the whole row, a piece takes it and those on its right. */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!idle()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * WIDTH) / rect.width;
    const y = ((e.clientY - rect.top) * HEIGHT) / rect.height;
    if (inside(STATUS, x, y)) {
      void play();
      return;
    }
    const piles = view.current.piles;
    for (let row = 0; row < ROWS; row++) {
      if (inside(square(0, row), x, y)) {
        if (piles[row]! > 0) choose({ row, from: 0 });
        return;
      }
      for (let col = 0; col < MAX_PILE; col++) {
        if (inside(square(col + 1, row), x, y)) {
          if (col < piles[row]!) choose({ row, from: col });
          return;
        }
      }
    }
    if (view.current.selection) choose(null, false);
  };

  return (
    <Window
      title="Nim"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game nim"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNewGame },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: '~About Nim...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <div className="playfield" style={backgroundStyle(settings.background)}>
        <div className="board" ref={box}>
          <canvas
            ref={canvas}
            width={WIDTH}
            height={HEIGHT}
            style={{ width: WIDTH * scale, height: HEIGHT * scale }}
            aria-label="Nim board"
            onPointerDown={onPointerDown}
          />
        </div>
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={inProgress}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            setSettings(next);
            setOpen(null);
            newGame(next);
          }}
        />
      )}

      {open === 'abandon' && (
        <Dialog
          title="Nim"
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setOpen(null);
                newGame();
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Nim"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Click a piece to choose it and the pieces on its right, or a row's letter for the whole row; then press
              Enter or click the line under the board. Keyboard: A to F choose pieces from the end of a row, Space
              clears the choice.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Nim"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <AboutText title="Nim" />
          </div>
        </Dialog>
      )}

      {end && (
        <EndDialog
          outcome={end.outcome}
          lines={end.lines}
          onOk={() => {
            setEnd(null);
            paint();
          }}
        />
      )}
    </Window>
  );
}
