import { useCallback, useEffect, useRef, useState } from 'react';
import piece from '../../assets/sechseck/piece.png';
import shapes from '../../assets/sechseck/shapes.png';
import tiles from '../../assets/sechseck/tiles.png';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { useImages } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { HallOfFameDialog, NewHighScoreDialog } from '../stackblz/HallOfFame.tsx';
import { cleared, insert, loadScores, rankOf, saveScores } from '../stackblz/highscores.ts';
import { Board, type Art, type Drag } from './Board.tsx';
import { cellAt, inside, slotRect } from './layout.ts';
import { isFree, newGame, place, randomRand, resume, SIZES, SLOTS, step, type GameEvent, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { BOARD_NAMES, loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'sechseck';
const INFO = gameById(ID)!;

/** Longest stretch of time simulated at once (after a stall). */
const MAX_FRAME_MS = 250;

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'game-over'; score: number }
  | { kind: 'high-score'; score: number; rank: number }
  | null;

/** Whether a menu of the menu bar is open (the game pauses, as around the original's menu commands). */
const menuOpen = () => document.querySelector('.sechseck .menubar [aria-expanded="true"]') !== null;

const begin = (settings: Settings) => newGame(SIZES[settings.boardSize]!, randomRand);

export default function Sechseck({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const table = settings.boardSize;
  const [scores, setScores] = useState(() => loadScores(ID, table));
  // The original starts a game as its window opens.
  const [view, setView] = useState<State>(() => begin(settings));
  const [open, setOpen] = useState<Open>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const game = useRef(view);
  const settingsRef = useRef(settings);
  const background = BACKGROUNDS[settings.background];
  const sources = [piece, shapes, tiles];
  if (background?.texture) sources.push(background.texture);
  const images = useImages(sources);
  const art: Art | null = images && {
    piece: images[0]!,
    shapes: images[1]!,
    tiles: images[2]!,
    texture: images[3] ?? null,
  };

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const sound = useCallback((event: SoundEvent) => {
    const s = settingsRef.current;
    const name = s.sounds[event];
    if (s.soundEnabled && name) playSound(name);
  }, []);

  useEffect(() => sound('Sechseck Start'), [sound]);

  /** Takes the new state and plays what happened; a skull cancels a drag; a game over shows the score. */
  const apply = useCallback(
    (state: State, events: readonly GameEvent[]) => {
      game.current = state;
      setView(state);
      for (const e of events) sound(e as SoundEvent);
      if (events.includes('Penalty') || events.includes('Game Over')) setDrag(null);
      if (events.includes('Game Over')) setOpen({ kind: 'game-over', score: state.score });
    },
    [sound],
  );

  const start = (s: Settings = settings) => {
    setDrag(null);
    apply(begin(s), []);
    setOpen(null);
  };
  const askNew = () => (game.current.playing ? setOpen('confirm-new') : start());

  // The game's 100 ms timer and stopwatch, on animation frames: whole milliseconds of simulated
  // time, paused while the tab is hidden, a dialog is open or a menu is pulled down. On resuming,
  // the timer restarts and fires at once, as after the original's menu commands.
  const paused = open !== null;
  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    let carry = 0;
    let wasPaused = false;
    if (!paused) {
      const r = resume(game.current, randomRand);
      if (r.state !== game.current) apply(r.state, r.events);
    }
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const hold = paused || document.hidden || menuOpen();
      if (hold || last === null) {
        wasPaused ||= hold;
        last = now;
        return;
      }
      let state = game.current;
      const events: GameEvent[] = [];
      if (wasPaused) {
        wasPaused = false;
        const r = resume(state, randomRand);
        state = r.state;
        events.push(...r.events);
      }
      const elapsed = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      if (!state.running) carry = 0;
      else carry += elapsed;
      for (; carry >= 1 && state.running; carry--) {
        const r = step(state, randomRand);
        state = r.state;
        events.push(...r.events);
      }
      carry %= 1;
      if (state !== game.current) apply(state, events);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, apply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      askNew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Drag and drop (the shared code at 0x403a10-0x404020): pressing on one of the four pieces
  // picks it up ("Piece Drag"), anywhere else beeps; releasing it on a free cell places it.
  const onDown = (x: number, y: number) => {
    const s = game.current;
    const slot = s.playing && !open ? [...Array(SLOTS).keys()].find((i) => inside(slotRect(i), x, y)) : undefined;
    if (slot === undefined) {
      beep();
      return;
    }
    const r = slotRect(slot);
    setDrag({ slot, x, y, grabX: x - r.left, grabY: y - r.top });
    sound('Piece Drag');
  };
  const onMove = (x: number, y: number) => setDrag((d) => d && { ...d, x, y });
  const onUp = (x: number, y: number) => {
    if (!drag) return;
    setDrag(null);
    const s = game.current;
    const cell = cellAt(s.size, x, y, (i) => isFree(s.cells[i]!));
    if (cell === null) return;
    const r = place(s, drag.slot, cell, randomRand);
    apply(r.state, r.events);
  };

  const exit = () => {
    sound('Sechseck Exit');
    onExit();
  };

  return (
    <Window
      title="Sechseck"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game sechseck"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('scores') },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', shortcut: 'Alt+F4', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: '~About Sechseck...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Board
        state={view}
        art={art}
        background={background?.color ?? '#000000'}
        drag={drag}
        dragBitmaps={settings.dragBitmaps}
        showDragZones={settings.showDragZones}
        showDropZones={settings.showDropZones}
        onDown={onDown}
        onMove={onMove}
        onUp={onUp}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          playing={view.playing}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK starts a new game (on the board size chosen).
            setSettings(next);
            setScores(loadScores(ID, next.boardSize));
            start(next);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <Dialog
          title="Sechseck"
          buttons={[
            { label: '~Yes', primary: true, onClick: () => start() },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'scores' && (
        <HallOfFameDialog
          title={`Hall of Fame - ${BOARD_NAMES[table]}`}
          scores={scores}
          onClose={() => setOpen(null)}
          onClear={() => {
            const next = cleared(scores);
            setScores(next);
            saveScores(ID, next, table);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'game-over' && (
        <Dialog
          title="Game Over"
          buttons={[
            {
              label: 'OK',
              primary: true,
              cancel: true,
              onClick: () => {
                // Then the high score table of the board size, if the score enters it.
                const rank = rankOf(loadScores(ID, table), open.score);
                setOpen(rank >= 0 ? { kind: 'high-score', score: open.score, rank } : null);
              },
            },
          ]}
        >
          <p className="message">Your final score is {open.score}</p>
        </Dialog>
      )}

      {open !== null && typeof open === 'object' && open.kind === 'high-score' && (
        <NewHighScoreDialog
          player={scores.player}
          onOk={(name) => {
            const next = insert(scores, open.rank, name, open.score);
            setScores(next);
            saveScores(ID, next, table);
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Sechseck"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Each neighbour of the cell a piece is dropped on scores one match for the same colour and one for the same
              shape: 1, 2, 4, 8… up to 2048 points for 12 matches, doubled, tripled or quadrupled on a 2x, 3x or 4x
              cell. After 5 seconds without a piece placed, a skull takes a free cell. The game ends when the board is
              full. Drag the pieces with the mouse or a finger; F2 starts a new game.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Sechseck"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Sechseck copyright © 1995 by The Code Zone.</p>
            <p>
              From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software,
              Inc.
            </p>
            <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
