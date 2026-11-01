import { useCallback, useEffect, useRef, useState } from 'react';
import tiles0 from '../../assets/voracity/tiles-0.png';
import tiles1 from '../../assets/voracity/tiles-1.png';
import tiles2 from '../../assets/voracity/tiles-2.png';
import tiles3 from '../../assets/voracity/tiles-3.png';
import tiles4 from '../../assets/voracity/tiles-4.png';
import tiles5 from '../../assets/voracity/tiles-5.png';
import codezone from '../../assets/shared/codezone.png';
import { useFitScale, useImage } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { backgroundStyle, bevel } from '../wari/czgame.ts';
import { AboutText } from '../wari/czgame.tsx';
import { EnterName, HallOfFame } from './HighScores.tsx';
import { canMove, cell, DIRECTIONS, enter, isOver, KEYS, move, newGame, place, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('voracity')!;
const SHEETS = [tiles0, tiles1, tiles2, tiles3, tiles4, tiles5];
const TILE = 16;
/** The target's tile in a set (the digits are 1-9, an eaten square 0). */
const TARGET = 10;

/** The window fits the board (`FUN_00407ed0`): 16 pixels a square, plus the frame. */
const width = (size: number) => size * TILE + 8;
const height = (size: number) => size * TILE + 9;

const FRAME = ['#ffffff', '#808080', '#ffffff', '#808080'];
const SUNKEN = ['#808080', '#ffffff', '#808080', '#ffffff'];

/** The board (`FUN_00408590`): a raised frame, a sunken one, the tiles. */
function draw(ctx: CanvasRenderingContext2D, s: State, sheet: HTMLImageElement) {
  const side = s.size * TILE;
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, width(s.size), height(s.size));
  bevel(ctx, { left: 0, top: 0, right: side + 7, bottom: side + 7 }, 1, '#c0c0c0', FRAME);
  bevel(ctx, { left: 3, top: 3, right: side + 4, bottom: side + 4 }, 1, '#c0c0c0', SUNKEN);
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

  useEffect(() => saveSettings(settings), [settings]);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx && sheet) draw(ctx, game, sheet);
  }, [game, sheet]);
  useEffect(redraw, [redraw, scale]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sound('Voracity Start');
  });

  const exit = () => {
    sound('Voracity Exit');
    onExit();
  };

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
    if (place(settings.scores[next.size] ?? [], next.score) >= 0) {
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

  const table = settings.scores[game.size] ?? [];
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
        <Dialog
          title="Voracity"
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setOpen(null);
                restart();
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'no-moves' && (
        <Dialog title="Voracity" buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}>
          <p className="message no-moves">You have no more moves available.</p>
        </Dialog>
      )}

      {open === 'name' && (
        <EnterName
          name={settings.playerName}
          onOk={(name) => {
            setSettings({
              ...settings,
              playerName: name,
              scores: { ...settings.scores, [game.size]: enter(table, { name, score: game.score }) },
            });
            setOpen(null);
          }}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame - ${sizeName(game.size)}`}
          table={table}
          onClear={() => setSettings({ ...settings, scores: { ...settings.scores, [game.size]: [] } })}
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Voracity"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>Keyboard: the digits as on a numeric keypad (8 up, 2 down, 7 up-left…) or the arrow keys.</p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Voracity"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <AboutText title="Voracity" />
          </div>
        </Dialog>
      )}
    </Window>
  );
}
