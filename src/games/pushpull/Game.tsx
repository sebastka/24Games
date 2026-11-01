import { useCallback, useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/pushpull/logo.png';
import markerUrl from '../../assets/pushpull/marker.png';
import visitedUrl from '../../assets/pushpull/visited.png';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { backgroundStyle, useFitScale, useImages } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { animate, type Point } from '../../shell/czgame/animate.ts';
import { bevel, centeredText, type Rect } from '../../shell/czgame/draw.ts';
import { BOARD_SHEET, drawSquare, usePieces } from '../../shell/czgame/pieces.ts';
import { EndDialog, type Outcome } from '../../shell/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import {
  captures,
  computerMove,
  depthFor,
  isOver,
  move,
  moves,
  SIZE,
  Square,
  start,
  type MoveEvent,
  type State,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('pushpull')!;

// Window 512×302 (pushpull.exe's window resource), laid out by `FUN_00409920`: the 7×7 board of
// 40-pixel squares at (11, 11) on a panel, the logo, the two pieces, the captures of each side.
const WIDTH = 512;
const HEIGHT = 302;
const ORIGIN = 11;
const SQUARE = 40;
const PANEL: Rect = { left: 4, top: 4, right: 297, bottom: 297 };
const LOGO: Rect = { left: 301, top: 4, right: 508, bottom: 44 };
const ICONS: Rect = { left: 301, top: 48, right: 508, bottom: 84 };
const PLAYER: Rect = { left: 301, top: 88, right: 402, bottom: 297 };
const COMPUTER: Rect = { left: 406, top: 88, right: 508, bottom: 297 };

const squareAt = (i: number): Point => ({
  x: ORIGIN + (i % SIZE) * SQUARE,
  y: ORIGIN + Math.floor(i / SIZE) * SQUARE,
});

/** Where the n-th captured piece of a column goes (`FUN_0040a6e0`): two by two, from the bottom. */
const slot = (column: Rect, n: number): Point => ({
  x: column.left + 15 + (n & 1) * 40,
  y: column.bottom + (-2 - (n & ~1)) * 18,
});

/** A piece: 0 the player's (first piece of the set), 1 the computer's; where it is drawn. */
interface Piece {
  side: 0 | 1;
  at: Point;
}

interface View {
  state: State;
  /** The 20 pieces, on the board or captured in the columns. */
  pieces: Piece[];
  /** The board square of each piece still on it. */
  onBoard: Map<number, Piece>;
  /** The marker while it moves (it is drawn on its square otherwise). */
  flyingMarker: Point | null;
}

function newView(): View {
  const state = start();
  const pieces: Piece[] = [];
  const onBoard = new Map<number, Piece>();
  state.squares.forEach((s, i) => {
    if (s !== Square.Player && s !== Square.Computer) return;
    const { x, y } = squareAt(i);
    const piece: Piece = { side: s === Square.Player ? 0 : 1, at: { x: x + 4, y: y + 4 } };
    pieces.push(piece);
    onBoard.set(i, piece);
  });
  return { state, pieces, onBoard, flyingMarker: null };
}

interface Art {
  sheet: HTMLImageElement;
  logo: HTMLImageElement;
  visited: HTMLImageElement;
  marker: HTMLImageElement;
  pieces: [HTMLCanvasElement, HTMLCanvasElement];
  board: number;
}

function draw(ctx: CanvasRenderingContext2D, view: View, art: Art) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  bevel(ctx, PANEL, 4);
  ctx.drawImage(
    art.logo,
    LOGO.left + ((LOGO.right - LOGO.left + 1) >> 1) - (art.logo.width >> 1),
    LOGO.top - (art.logo.height >> 1) + ((LOGO.bottom - LOGO.top + 1) >> 1),
  );
  for (const r of [ICONS, PLAYER, COMPUTER]) bevel(ctx, r, 2);
  ctx.fillStyle = '#000080';
  ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
  centeredText(ctx, 'Player', { ...PLAYER, bottom: PLAYER.top + 24 }, { dy: 1 });
  centeredText(ctx, 'Computer', { ...COMPUTER, bottom: COMPUTER.top + 24 }, { dy: 1 });
  ctx.drawImage(art.pieces[0], PLAYER.left + ((PLAYER.right - PLAYER.left - 32) >> 1), ICONS.top + 3);
  ctx.drawImage(art.pieces[1], COMPUTER.left + ((COMPUTER.right - COMPUTER.left - 32) >> 1), ICONS.top + 3);
  // The squares (`FUN_004090c0`): the first square of the board on the edges, the second
  // elsewhere; then the visited squares' marks and the marker (`FUN_0040b330`).
  const { squares, marker } = view.state;
  squares.forEach((s, i) => {
    const { x, y } = squareAt(i);
    const col = i % SIZE;
    const row = Math.floor(i / SIZE);
    const edge = (row === 0 || row === SIZE - 1) !== (col === 0 || col === SIZE - 1);
    drawSquare(ctx, art.sheet, art.board, edge ? 0 : 1, x, y);
    if (i === marker && !view.flyingMarker) ctx.drawImage(art.marker, x + 4, y + 4);
    else if (s >= Square.Visited) ctx.drawImage(art.visited, x + 4, y + 4);
  });
  for (const p of view.pieces) ctx.drawImage(art.pieces[p.side], p.at.x, p.at.y);
  if (view.flyingMarker) ctx.drawImage(art.marker, view.flyingMarker.x, view.flyingMarker.y);
}

const SOUNDS: Record<MoveEvent, SoundEvent> = {
  marker: 'Move Marker',
  capturePlayer: "Capture Player's Piece",
  captureComputer: "Capture Computer's Piece",
};

export default function PushPull({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [open, setOpen] = useState<'options' | 'rules' | 'about' | 'abandon' | null>(null);
  const [end, setEnd] = useState<{ outcome: Outcome; lines: [string, string] } | null>(null);
  // The game in progress (`0x20c`).
  const [inProgress, setInProgress] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const images = useImages([BOARD_SHEET, logoUrl, visitedUrl, markerUrl]);
  const pieces = usePieces(settings.pieceSet);
  const view = useRef<View>(newView());
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
    if (!ctx || !images || !pieces) return;
    const [sheet, logo, visited, marker] = images as [
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
    ];
    draw(ctx, view.current, { sheet, logo, visited, marker, pieces, board: settings.board });
  }, [images, pieces, settings.board]);
  useEffect(redraw, [redraw, scale]);
  const latestRedraw = useRef(redraw);
  useEffect(() => {
    latestRedraw.current = redraw;
  });
  const paint = () => latestRedraw.current();

  const sound = (event: SoundEvent) => playEvent(settingsRef.current, event);

  /** The end of the game, with the scores (end of `FUN_0040aa20`). */
  const finish = () => {
    const { player, computer } = captures(view.current.state);
    const yours = `Your Score : ${player}`;
    const mine = `My Score : ${computer}`;
    playing.current = false;
    setInProgress(false);
    if (player < computer) {
      sound('Defeat');
      setEnd({ outcome: 'lose', lines: [mine, yours] });
    } else if (computer < player) {
      sound('Victory');
      setEnd({ outcome: 'win', lines: [yours, mine] });
    } else {
      sound('Tie');
      setEnd({ outcome: 'tie', lines: [yours, mine] });
    }
  };

  /**
   * The marker goes to `square` (`FUN_0040aa20`): it glides there, then a piece on that square
   * flies to its owner's column. Returns whether the game goes on.
   */
  const go = async (square: number, g: number): Promise<boolean> => {
    const v = view.current;
    const stale = () => generation.current !== g;
    const speed = settingsRef.current.speed;
    const before = captures(v.state);
    const from = v.state.marker;
    if (from >= 0 && speed > 0) {
      const a = squareAt(from);
      const b = squareAt(square);
      v.flyingMarker = { x: a.x + 4, y: a.y + 4 };
      await animate(v.flyingMarker, { x: b.x + 4, y: b.y + 4 }, speed, (p) => ((v.flyingMarker = p), paint()), stale);
      if (stale()) return false;
      v.flyingMarker = null;
    }
    const { state, event } = move(v.state, square);
    v.state = state;
    sound(SOUNDS[event]);
    const piece = v.onBoard.get(square);
    if (piece) {
      v.onBoard.delete(square);
      const target = piece.side === 0 ? slot(PLAYER, before.player) : slot(COMPUTER, before.computer);
      if (speed > 0) {
        await animate(piece.at, target, speed, (p) => ((piece.at = p), paint()), stale);
        if (stale()) return false;
      }
      piece.at = target;
    }
    paint();
    if (isOver(v.state)) {
      finish();
      return false;
    }
    return true;
  };

  /** The computer's turn: its look-ahead, then its move. */
  const reply = async (g: number) => {
    const depth = depthFor(settingsRef.current.skill, Math.random);
    await go(computerMove(view.current.state, depth, Math.random), g);
  };

  /** A click on a square the marker can go to (`FUN_0040a7c0`), then the computer's reply. */
  const play = async (square: number) => {
    busy.current = true;
    const g = generation.current;
    if (await go(square, g)) await reply(g);
    if (generation.current === g) busy.current = false;
  };

  /** Game › New (`FUN_0040a280`). */
  const newGame = (s: Settings = settingsRef.current) => {
    settingsRef.current = s;
    generation.current++;
    busy.current = false;
    playing.current = true;
    view.current = newView();
    setInProgress(true);
    setEnd(null);
    paint();
    if (!s.playerFirst) {
      busy.current = true;
      const g = generation.current;
      void reply(g).then(() => {
        if (generation.current === g) busy.current = false;
      });
    }
  };

  const exit = useStartExit('Push-Pull', settings, onExit);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    newGame();
  });
  const askNewGame = () => (inProgress ? setOpen('abandon') : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || end || e.key !== 'F2') return;
      e.preventDefault();
      askNewGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const squareUnder = (e: React.PointerEvent<HTMLCanvasElement>): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * WIDTH) / rect.width - ORIGIN;
    const y = ((e.clientY - rect.top) * HEIGHT) / rect.height - ORIGIN;
    if (x < 0 || y < 0 || x >= SIZE * SQUARE || y >= SIZE * SQUARE) return -1;
    return Math.floor(y / SQUARE) * SIZE + Math.floor(x / SQUARE);
  };

  const available = (square: number) =>
    playing.current && !busy.current && square >= 0 && moves(view.current.state).includes(square);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (open || end || busy.current) return;
    if (!playing.current) {
      beep();
      return;
    }
    const square = squareUnder(e);
    if (available(square)) void play(square);
  };

  return (
    <Window
      title="Push-Pull"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game pushpull"
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
            { label: '~About Push-Pull...', onSelect: () => setOpen('about') },
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
            aria-label="Push-Pull board"
            onPointerDown={onPointerDown}
            onPointerMove={(e) => {
              // The original's pointer changes over the squares the marker can go to.
              e.currentTarget.style.cursor = available(squareUnder(e)) ? 'pointer' : '';
            }}
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
        <ConfirmBox
          title="Push-Pull"
          text={CONFIRM_NEW}
          onYes={() => {
            setOpen(null);
            newGame();
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Push-Pull"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="The marker moves to any of the eight squares around it that it has not visited yet. Your pieces are the ones of the horizontal rows: each one captured, by you or by the computer, is a point for you."
        />
      )}

      {open === 'about' && <AboutDialog title="Push-Pull" onClose={() => setOpen(null)} />}

      {end && <EndDialog title="Push-Pull" outcome={end.outcome} lines={end.lines} onOk={() => setEnd(null)} />}
    </Window>
  );
}
