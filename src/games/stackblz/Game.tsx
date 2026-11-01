import { useCallback, useEffect, useRef, useState } from 'react';
import diagonal from '../../assets/stackblz/diagonal.png';
import horizontal from '../../assets/stackblz/horizontal.png';
import pieces from '../../assets/stackblz/pieces.png';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { useImages } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { playSound } from '../../shell/sound.ts';
import { TouchPad, type PadDirection } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { Board, type Art } from './Board.tsx';
import { HallOfFameDialog, NewHighScoreDialog } from './HallOfFame.tsx';
import { cleared, insert, loadScores, rankOf, saveScores } from './highscores.ts';
import {
  act,
  initial,
  newGame,
  randomRand,
  restartTimer,
  step,
  stop,
  type Action,
  type GameEvent,
  type State,
} from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { actionFor, loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const ID = 'stackblz';
const INFO = gameById(ID)!;

/** Longest stretch of time simulated at once (after a stall), as a timer would not catch up either. */
const MAX_FRAME_MS = 250;

/** Touch pad arrows, as the default keys: ▲ is the Up key, "Rotate Down". */
const PAD: Record<PadDirection, Action> = { left: 'left', right: 'right', up: 'rotateDown', down: 'rotateUp' };

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'confirm-new'
  | { kind: 'game-over' }
  | { kind: 'high-score'; score: number; rank: number }
  | null;

/** Whether a menu of the menu bar is open (the game pauses, as the original does around menu commands). */
const menuOpen = () => document.querySelector('.stackblz .menubar [aria-expanded="true"]') !== null;

export default function StackBlitz({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [scores, setScores] = useState(() => loadScores(ID));
  const [view, setView] = useState<State>(() => initial(randomRand));
  const [started, setStarted] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const game = useRef(view);
  const settingsRef = useRef(settings);
  const background = BACKGROUNDS[settings.background];
  const images = useImages(
    background?.texture ? [pieces, horizontal, diagonal, background.texture] : [pieces, horizontal, diagonal],
  );
  const art: Art | null = images && {
    pieces: images[0]!,
    horizontal: images[1]!,
    diagonal: images[2]!,
    texture: images[3] ?? null,
  };

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores(ID, scores), [scores]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const sound = useCallback((event: SoundEvent) => {
    const s = settingsRef.current;
    const name = s.sounds[event];
    if (s.soundEnabled && name) playSound(name);
  }, []);

  useEffect(() => sound('StackBlitz Start'), [sound]);

  /** Takes the new state and plays what happened; a game over brings the high score dialogs. */
  const apply = useCallback(
    (state: State, events: readonly GameEvent[]) => {
      game.current = state;
      setView(state);
      for (const e of events) sound(e);
      if (events.includes('Game Over')) {
        const rank = rankOf(loadScores(ID), state.score);
        setOpen(rank >= 0 ? { kind: 'high-score', score: state.score, rank } : { kind: 'game-over' });
      }
    },
    [sound],
  );

  const doAction = (action: Action) => {
    if (open || !game.current.playing) return;
    const r = act(game.current, action, randomRand);
    apply(r.state, r.events);
  };

  const start = () => {
    const r = newGame(game.current, randomRand);
    setStarted(true);
    apply(r.state, r.events);
    setOpen(null);
  };
  const askNew = () => (game.current.playing ? setOpen('confirm-new') : start());

  // The game's timer, on animation frames: whole milliseconds of simulated time, paused while
  // the tab is hidden, a dialog is open or a menu is pulled down. Like the original's Timer::Start
  // after a pause, the timer's count restarts on resuming.
  const paused = open !== null;
  useEffect(() => {
    // A dialog was just closed: the timer restarts.
    if (!paused) game.current = restartTimer(game.current);
    let frame = 0;
    let last: number | null = null;
    let carry = 0;
    let wasPaused = false;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const hold = paused || document.hidden || menuOpen();
      if (hold || last === null) {
        wasPaused ||= hold;
        last = now;
        return;
      }
      let state = game.current;
      if (wasPaused) {
        wasPaused = false;
        state = restartTimer(state);
      }
      const elapsed = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      if (!state.playing) {
        carry = 0;
        return;
      }
      carry += elapsed;
      const events: GameEvent[] = [];
      for (; carry >= 1 && state.playing; carry--) {
        const r = step(state, [], randomRand);
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
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'F2') askNew();
      else {
        const action = game.current.playing ? actionFor(settings.keys, e.key) : undefined;
        if (!action) return;
        doAction(action);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exit = () => {
    sound('StackBlitz Exit');
    onExit();
  };

  return (
    <Window
      title="StackBlitz"
      icon={INFO.smallIcon}
      onClose={exit}
      className="game stackblz"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: 'Show High Scores...', onSelect: () => setOpen('scores') },
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
            { label: '~About StackBlitz...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Board
        state={view}
        art={art}
        pieceSet={settings.pieceSet}
        background={background?.color ?? '#000000'}
        values={started}
        onAction={doAction}
      />
      <TouchPad
        onPress={(d) => doAction(PAD[d])}
        left={{ label: 'New', onClick: askNew }}
        right={{ label: 'Drop', onClick: () => doAction('drop'), disabled: !view.playing }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          sheet={pieces}
          playing={view.playing}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK ends the game in progress ("Press F2 To Begin").
            setSettings(next);
            apply(stop(game.current), []);
            setOpen(null);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <Dialog
          title="StackBlitz"
          buttons={[
            { label: '~Yes', primary: true, onClick: start },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'scores' && (
        <HallOfFameDialog scores={scores} onClose={() => setOpen(null)} onClear={() => setScores(cleared(scores))} />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'high-score' && (
        <NewHighScoreDialog
          player={scores.player}
          onOk={(name) => {
            setScores(insert(scores, open.rank, name, open.score));
            setOpen(null);
          }}
        />
      )}

      {open !== null && typeof open === 'object' && open.kind === 'game-over' && (
        <Dialog
          title="Game Over"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <p className="message">Sorry, you stacked 'em a bit too high!</p>
        </Dialog>
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play StackBlitz"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Keyboard (Game › Options › Keys): Left and Right arrows to move the stack, Down and Up arrows to rotate
              it, Space to drop it; F2 starts a new game. On a touch screen, drag the stack sideways, tap to rotate it,
              swipe down to drop it, or use the buttons below the play field.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About StackBlitz"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>StackBlitz copyright © 1995 by The Code Zone.</p>
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
