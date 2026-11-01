import { useCallback, useEffect, useRef, useState } from 'react';
import piece from '../../assets/sechseck/piece.png';
import shapes from '../../assets/sechseck/shapes.png';
import tiles from '../../assets/sechseck/tiles.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { CONFIRM_NEW, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { useImages } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf } from '../../shell/highscores.ts';
import { useFrameLoop } from '../../shell/loop.ts';
import { randomRand } from '../../shell/random.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board, type Art, type Drag } from './Board.tsx';
import { cellAt, inside, slotRect } from './layout.ts';
import { isFree, newGame, place, resume, SIZES, SLOTS, step, type GameEvent, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { BOARD_NAMES, loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'sechseck';
const INFO = gameById(ID)!;

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'game-over'; score: number }
  | { kind: 'high-score'; score: number; rank: number }
  | null;

const begin = (settings: Settings) => newGame(SIZES[settings.boardSize]!, randomRand);

export default function Sechseck({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const table = settings.boardSize;
  // A Hall of Fame per board size.
  const [scores, setScores] = useState(() => loadScores(ID));
  // The original starts a game as its window opens.
  const [view, setView] = useState<State>(() => begin(settings));
  const [open, setOpen] = useState<Open>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
  useEffect(() => saveScores(ID, scores), [scores]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const sound = useCallback((event: SoundEvent) => playEvent(settingsRef.current, event), []);
  const exit = useStartExit('Sechseck', settings, onExit);

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
  const carry = useRef(0);
  useFrameLoop(
    open === null && !menuOpen,
    (elapsed) => {
      let state = game.current;
      const events: GameEvent[] = [];
      if (!state.running) carry.current = 0;
      else carry.current += elapsed;
      for (; carry.current >= 1 && state.running; carry.current--) {
        const r = step(state, randomRand);
        state = r.state;
        events.push(...r.events);
      }
      carry.current %= 1;
      if (state !== game.current) apply(state, events);
    },
    () => {
      const r = resume(game.current, randomRand);
      if (r.state !== game.current) apply(r.state, r.events);
    },
  );

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

  return (
    <Window
      title="Sechseck"
      icon={INFO.smallIcon}
      onClose={exit}
      onMenuChange={setMenuOpen}
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
        background={settings.background}
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
            start(next);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <ConfirmBox title="Sechseck" text={CONFIRM_NEW} onYes={() => start()} onNo={() => setOpen(null)} />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame - ${BOARD_NAMES[table]}`}
          table={tableOf(scores, table)}
          onClose={() => setOpen(null)}
          onClear={() => setScores(cleared(scores, table))}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'game-over' && (
        <MessageBox
          title="Game Over"
          text={`Your final score is ${open.score}`}
          onOk={() => {
            // Then the high score table of the board size, if the score enters it.
            const rank = placeOf(tableOf(scores, table), open.score);
            setOpen(rank >= 0 ? { kind: 'high-score', score: open.score, rank } : null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'high-score' && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, table, open.rank, name, open.score));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Sechseck"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Each neighbour of the cell a piece is dropped on scores one match for the same colour and one for the same shape: 1, 2, 4, 8… up to 2048 points for 12 matches, doubled, tripled or quadrupled on a 2x, 3x or 4x cell. After 5 seconds without a piece placed, a skull takes a free cell. The game ends when the board is full. Drag the pieces with the mouse or a finger; F2 starts a new game."
        />
      )}

      {open === 'about' && <AboutDialog title="Sechseck" onClose={() => setOpen(null)} />}
    </Window>
  );
}
