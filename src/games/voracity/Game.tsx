import { useCallback, useEffect, useRef, useState } from 'react';
import tiles0 from '../../assets/voracity/tiles-0.png';
import tiles1 from '../../assets/voracity/tiles-1.png';
import tiles2 from '../../assets/voracity/tiles-2.png';
import tiles3 from '../../assets/voracity/tiles-3.png';
import tiles4 from '../../assets/voracity/tiles-4.png';
import tiles5 from '../../assets/voracity/tiles-5.png';
import { CONFIRM_NEW, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { backgroundStyle, useFitScale, useImage } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { bevel } from '../../shell/czgame/draw.ts';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf } from '../../shell/highscores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { canMove, cell, DIRECTIONS, isOver, KEYS, move, newGame, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'voracity';
const INFO = gameById(ID)!;
const SHEETS = [tiles0, tiles1, tiles2, tiles3, tiles4, tiles5];
const TILE = 16;
/** The target's tile in a set (the digits are 1-9, an eaten square 0). */
const TARGET = 10;

/** The window fits the board (`FUN_00407ed0`): 16 pixels a square, plus the frame. */
const width = (size: number) => size * TILE + 8;
const height = (size: number) => size * TILE + 9;

/** The board (`FUN_00408590`): a raised frame, a sunken one, the tiles. */
function draw(ctx: CanvasRenderingContext2D, s: State, sheet: HTMLImageElement) {
  const side = s.size * TILE;
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, width(s.size), height(s.size));
  bevel(ctx, { left: 0, top: 0, right: side + 7, bottom: side + 7 }, 1);
  bevel(ctx, { left: 3, top: 3, right: side + 4, bottom: side + 4 }, 1, undefined, 'sunken');
  for (let x = 0; x < s.size; x++) {
    for (let y = 0; y < s.size; y++) {
      const tile = x === s.x && y === s.y ? TARGET : cell(s, x, y);
      ctx.drawImage(sheet, tile * TILE, 0, TILE, TILE, x * TILE + 4, y * TILE + 4, TILE, TILE);
    }
  }
}

const sizeName = (size: number) => `${size} x ${size} board`;

export default function Voracity({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => newGame(settings.size, Math.random));
  // The game in progress (`0x3b6`): moves are taken, and New asks first.
  const [inProgress, setInProgress] = useState(true);
  const [open, setOpen] = useState<'options' | 'rules' | 'about' | 'abandon' | 'scores' | 'no-moves' | 'name' | null>(
    null,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const w = width(game.size);
  const h = height(game.size);
  const scale = useFitScale(box, w, h);
  const sheet = useImage(SHEETS[settings.tiles]!);

  // The Hall of Fame of each board size (kept with the settings before).
  const [scores, setScores] = useState(() => loadScores(ID, ID));
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores(ID, scores), [scores]);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && sheet) draw(ctx, game, sheet);
  }, [game, sheet]);
  useEffect(redraw, [redraw, scale]);

  const sound = (event: SoundEvent) => playEvent(settings, event);
  const exit = useStartExit('Voracity', settings, onExit);

  const restart = (s: Settings = settings) => {
    setGame(newGame(s.size, Math.random));
    setInProgress(true);
  };
  const askNewGame = () => (inProgress ? setOpen('abandon') : restart());

  /**
   * A move (`FUN_00409150`), then the end of the game (`FUN_00408b80`): a high score asks for a
   * name, otherwise "You have no more moves available."
   */
  const go = (dx: number, dy: number) => {
    if (!inProgress || open) return;
    if (!canMove(game, dx, dy)) {
      beep();
      return;
    }
    const next = move(game, dx, dy);
    sound('Move Piece');
    setGame(next);
    if (!isOver(next)) return;
    setInProgress(false);
    if (placeOf(tableOf(scores, next.size), next.score) >= 0) {
      sound('Game Over - High Score');
      setOpen('name');
    } else {
      sound('Game Over - No High');
      setOpen('no-moves');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || e.ctrlKey || e.altKey) return;
      const direction = KEYS[e.key];
      if (e.key === 'F2') askNewGame();
      else if (direction) go(direction[0], direction[1]);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** A click on a neighbour of the target that it can go towards (`FUN_00408970`). */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!inProgress || open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((((e.clientX - rect.left) * w) / rect.width - 4) / TILE);
    const y = Math.floor((((e.clientY - rect.top) * h) / rect.height - 4) / TILE);
    const direction = DIRECTIONS.find(([dx, dy]) => game.x + dx === x && game.y + dy === y);
    if (direction && canMove(game, direction[0], direction[1])) go(direction[0], direction[1]);
  };

  const table = tableOf(scores, game.size);
  return (
    <Window
      title={`Voracity Score - ${game.score}`}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game voracity"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNewGame },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('scores') },
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
            { label: '~About Voracity...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <div className="playfield" style={backgroundStyle(settings.background)}>
        <div className="board" ref={box}>
          <canvas
            ref={canvas}
            width={w}
            height={h}
            style={{ width: w * scale, height: h * scale }}
            aria-label="Voracity board"
            onPointerDown={onPointerDown}
          />
        </div>
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          sheets={SHEETS}
          inProgress={inProgress}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            setSettings(next);
            setOpen(null);
            restart(next);
          }}
        />
      )}

      {open === 'abandon' && (
        <ConfirmBox
          title="Voracity"
          text={CONFIRM_NEW}
          onYes={() => {
            setOpen(null);
            restart();
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'no-moves' && (
        <MessageBox title="Voracity" icon="info" text="You have no more moves available." onOk={() => setOpen(null)} />
      )}

      {open === 'name' && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            const place = placeOf(table, game.score);
            if (place >= 0) setScores(record(scores, game.size, place, name, game.score));
            setOpen(null);
          }}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame - ${sizeName(game.size)}`}
          table={table}
          onClear={() => setScores(cleared(scores, game.size))}
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Voracity"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard: the digits as on a numeric keypad (8 up, 2 down, 7 up-left…) or the arrow keys."
        />
      )}

      {open === 'about' && <AboutDialog title="Voracity" onClose={() => setOpen(null)} />}
    </Window>
  );
}
