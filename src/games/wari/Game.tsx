import { useCallback, useEffect, useRef, useState } from 'react';
import logoUrl from '../../assets/wari/logo.png';
import { CONFIRM_NEW, ConfirmBox } from '../../shell/Boxes.tsx';
import { backgroundStyle, useFitScale, useImage } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { animate as glide, type Point } from '../../shell/czgame/animate.ts';
import { bevel, centeredText, inside } from '../../shell/czgame/draw.ts';
import { usePieces } from '../../shell/czgame/pieces.ts';
import { EndDialog, type Outcome } from '../../shell/EndDialog.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { counterRect, HEIGHT, MESSAGE, piecePosition, pitRect, WIDTH } from './board.ts';
import {
  computerMove,
  isOver,
  isPlayerPit,
  newBoard,
  play,
  PITS,
  PLAYER_GOAL,
  scores,
  type Board,
  type Transfer,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('wari')!;

// StarView colours of the board.
const BROWN = '#808000';
const YELLOW = '#ffff00';
const BLACK = '#000000';

/** What the canvas shows: the pieces where they lie, the one in flight, the message. */
interface View {
  board: Board;
  /** Each pit's pieces, bottom to top. */
  pieces: Point[][];
  flying: Point | null;
  message: 'player' | 'computer' | null;
}

/** The two lines of each "another turn" message (strings 256-259). */
const MESSAGES = {
  player: ['The last piece you played was in your goal pit.', 'You get another turn!'],
  computer: ['The last piece I played was in my goal pit.', 'I get another turn!  Click here to continue,'],
};

function draw(ctx: CanvasRenderingContext2D, view: View, logo: HTMLImageElement | null, piece: HTMLCanvasElement) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (logo) ctx.drawImage(logo, (WIDTH - logo.width) >> 1, (HEIGHT - logo.height) >> 1);
  for (let pit = 0; pit < PITS; pit++) {
    const r = pitRect(pit);
    const outer = { left: r.left - 2, top: r.top - 2, right: r.right + 2, bottom: r.bottom + 2 };
    bevel(ctx, outer, 2, BROWN, { top: YELLOW, right: BLACK, bottom: BLACK, left: YELLOW });
    bevel(ctx, r, 2, BROWN, { top: BLACK, right: YELLOW, bottom: YELLOW, left: BLACK });
    for (const p of view.pieces[pit]!) ctx.drawImage(piece, p.x, p.y);
    const c = counterRect(pit);
    ctx.fillStyle = BLACK;
    ctx.fillRect(c.left, c.top, c.right - c.left + 1, c.bottom - c.top + 1);
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 1;
    ctx.strokeRect(c.left + 0.5, c.top + 0.5, c.right - c.left, c.bottom - c.top);
    ctx.fillStyle = YELLOW;
    ctx.font = 'bold 20px Arial, Helvetica, sans-serif';
    centeredText(ctx, String(view.board[pit]), c, { dy: 1 });
  }
  if (view.flying) ctx.drawImage(piece, view.flying.x, view.flying.y);
  if (view.message) {
    bevel(ctx, MESSAGE, 2);
    const [first, second] = MESSAGES[view.message];
    const middle = (MESSAGE.top + MESSAGE.bottom) >> 1;
    ctx.fillStyle = '#000080';
    ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
    centeredText(ctx, first!, { ...MESSAGE, bottom: middle }, { dy: 1 });
    centeredText(ctx, second!, { ...MESSAGE, top: middle + 1 }, { dy: 1 });
  }
}

const layout = (board: Board): Point[][] =>
  board.map((n, pit) => Array.from({ length: n }, () => piecePosition(pit, Math.random)));

export default function Wari({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [open, setOpen] = useState<'options' | 'rules' | 'about' | 'abandon' | null>(null);
  const [end, setEnd] = useState<{ outcome: Outcome; lines: [string, string] } | null>(null);
  // The game in progress (`0x2e2`): moves are taken, and New asks first.
  const [inProgress, setInProgress] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scale = useFitScale(box, WIDTH, HEIGHT);
  const logo = useImage(logoUrl);
  const pieces = usePieces(settings.pieceSet);
  const view = useRef<View>({ board: Array(PITS).fill(0), pieces: [], flying: null, message: null });
  // Moves in flight; a new game makes the sequence of the previous one stop.
  const busy = useRef(false);
  const generation = useRef(0);
  const resume = useRef<(() => void) | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  useEffect(() => saveSettings(settings), [settings]);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && pieces) draw(ctx, view.current, logo, pieces[0]);
  }, [logo, pieces]);
  useEffect(redraw, [redraw, scale]);
  // The move sequences outlive renders: they draw with the latest images.
  const latestRedraw = useRef(redraw);
  useEffect(() => {
    latestRedraw.current = redraw;
  });
  const paint = () => latestRedraw.current();

  const sound = (event: SoundEvent) => playEvent(settingsRef.current, event);

  /** Moves the pieces of a move one by one, with their sounds (`FUN_00409f30`). */
  const animate = async (transfers: Transfer[], generationAtStart: number) => {
    const v = view.current;
    const stale = () => generation.current !== generationAtStart;
    for (const { from, to } of transfers) {
      const piece = v.pieces[from]!.pop()!;
      v.board = v.board.map((n, i) => (i === from ? n - 1 : n));
      sound(v.pieces[from]!.length === 0 ? 'Pick Up - Empty Pit' : 'Pick Up - Full Pit');
      const target = piecePosition(to, Math.random);
      const speed = settingsRef.current.speed;
      if (speed > 0) {
        v.flying = piece;
        await glide(piece, target, speed, (p) => ((v.flying = p), paint()), stale);
        if (stale()) return;
        v.flying = null;
      }
      v.pieces[to]!.push(target);
      v.board = v.board.map((n, i) => (i === to ? n + 1 : n));
      sound(v.pieces[to]!.length < 2 ? 'Drop - Empty Pit' : 'Drop - Full Pit');
      paint();
    }
  };

  const finish = (board: Board) => {
    const { player, computer } = scores(board);
    const yours = `Your Score : ${player}`;
    const mine = `My Score : ${computer}`;
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
    setInProgress(false);
  };

  /**
   * A move of the player, then the computer's (`FUN_004099b0`), until it is the player's turn
   * again or the game is over. Also starts a game with the computer first (pit 6, the player's
   * empty goal, is then "played": nothing moves and the turn passes).
   */
  const turn = async (pit: number) => {
    busy.current = true;
    const g = generation.current;
    let board = view.current.board;
    const mine = play(board, pit);
    await animate(mine.transfers, g);
    if (generation.current !== g) return;
    board = mine.board;
    if (!mine.extraTurn) {
      while (!isOver(board)) {
        const move = play(board, computerMove(board, settingsRef.current.skill));
        await animate(move.transfers, g);
        if (generation.current !== g) return;
        board = move.board;
        if (!move.extraTurn || isOver(board)) break;
        view.current.message = 'computer';
        paint();
        await new Promise<void>((r) => (resume.current = r));
        if (generation.current !== g) return;
        view.current.message = null;
        paint();
      }
    } else if (!isOver(board)) {
      view.current.message = 'player';
    }
    view.current.board = board;
    paint();
    busy.current = false;
    if (isOver(board)) finish(board);
  };

  /** Game › New (`FUN_00409530`). */
  const newGame = (s: Settings = settingsRef.current) => {
    settingsRef.current = s;
    generation.current++;
    resume.current = null;
    busy.current = false;
    const board = newBoard(s.perPit, Math.random);
    view.current = { board, pieces: layout(board), flying: null, message: null };
    setInProgress(true);
    setEnd(null);
    paint();
    if (!s.playerFirst) void turn(PLAYER_GOAL);
  };

  // A first game at start, after the "Wari Start" sound.
  const exit = useStartExit('Wari', settings, onExit);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    newGame();
  });

  /** Game › New (F2): asks first during a game. */
  const askNewGame = () => (inProgress ? setOpen('abandon') : newGame());

  const select = (pit: number) => {
    if (!inProgress || busy.current || open || end) return;
    if (!isPlayerPit(pit) || view.current.board[pit] === 0) return;
    void turn(pit);
  };

  const dismissComputerMessage = () => {
    const r = resume.current;
    resume.current = null;
    r?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || end) return;
      if (e.key === 'F2') askNewGame();
      else if (resume.current && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) dismissComputerMessage();
      else if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.altKey) select(Number(e.key) - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * WIDTH) / rect.width;
    const y = ((e.clientY - rect.top) * HEIGHT) / rect.height;
    if (resume.current) {
      // The computer's message is a modal dialog: only a click on it goes on.
      if (inside(MESSAGE, x, y)) dismissComputerMessage();
      return;
    }
    if (view.current.message === 'player') {
      view.current.message = null;
      paint();
    }
    for (let pit = 0; pit < 6; pit++) if (inside(pitRect(pit), x, y)) select(pit);
  };

  return (
    <Window
      title="Wari"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game wari"
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
            { label: '~About Wari...', onSelect: () => setOpen('about') },
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
            aria-label="Wari board"
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
            // OK restarts the game (with the new rules), as in the original.
            setSettings(next);
            setOpen(null);
            newGame(next);
          }}
        />
      )}

      {open === 'abandon' && (
        <ConfirmBox
          title="Wari"
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
          title="Wari"
          info={INFO}
          controls="Keyboard: 1 to 6 play your pits, from the left."
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'about' && <AboutDialog title="Wari" onClose={() => setOpen(null)} />}

      {end && <EndDialog title="Wari" outcome={end.outcome} lines={end.lines} onOk={() => setEnd(null)} />}
    </Window>
  );
}
