import { useEffect, useRef, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { playSound } from '../../shell/sound.ts';
import { TouchPad } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { isKey } from '../cheesy/common/keys.ts';
import { useFixedStep } from '../cheesy/common/loop.ts';
import '../cheesy/common/style.css';
import { Field } from './Field.tsx';
import { COMPUTER_MS, move, newMaze, wayOf, type Direction, type Sound, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import './style.css';
import { loadSettings, saveSettings, type Action, type Settings, type SoundEvent } from './settings.ts';
import { WinDialog } from './WinDialog.tsx';

const INFO = gameById('maze')!;
const TITLE = 'MazeRace';
const random = Math.random;

type Open = 'options' | 'rules' | 'about' | 'confirm-new' | { winner: 0 | 1 } | null;

export default function MazeRace({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGameState] = useState<State>(() => newMaze(settings, [0, 0], random));
  const current = useRef(game);
  /** The maze shown is new: the next race is run on it (the original's 0x13f). */
  const fresh = useRef(true);
  const [open, setOpen] = useState<Open>(null);

  const setGame = (state: State) => {
    current.current = state;
    setGameState(state);
  };

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };
  const sounds = (list: Sound[]) => list.forEach(sound);

  useEffect(() => {
    const s = loadSettings();
    const name = s.sounds['MazeRace Start'];
    if (s.soundEnabled && name) playSound(name);
  }, []);

  const exit = () => {
    sound('MazeRace Exit');
    onExit();
  };

  const step = (index: 0 | 1, d: Direction) => {
    const result = move(current.current, index, d, random);
    setGame(result.state);
    sounds(result.sounds);
    if (result.winner !== null) setOpen({ winner: result.winner });
  };

  // Nestor, played by the computer: one step along the way to the cheese per tick.
  const computer = settings.skill > 0;
  useFixedStep(COMPUTER_MS[settings.skill - 1] ?? 800, computer && game.active && open === null, () =>
    step(1, wayOf(current.current, current.current.mice[1])),
  );

  /** Game › New (F2): a race, on the maze shown if it is new, else on a new one. */
  const begin = () => {
    const maze = fresh.current ? current.current : newMaze(settings, current.current.wins, random);
    fresh.current = false;
    setGame({ ...maze, active: true });
    sound('Begin New Game');
  };
  const askNew = () => (current.current.active ? setOpen('confirm-new') : begin());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') askNew();
      else if (game.active && !open) {
        const players: (0 | 1)[] = computer ? [0] : [0, 1];
        const hit = players
          .map(
            (i) => [i, (Object.keys(settings.keys[i]) as Action[]).find((a) => isKey(e, settings.keys[i][a]))] as const,
          )
          .find(([, a]) => a);
        if (!hit) return;
        step(hit[0], hit[1]!);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game arcade maze"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', shortcut: 'Alt+F4', onSelect: exit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: `~About ${TITLE}...`, onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Field state={game} onMove={(d) => game.active && !open && step(0, d)} />
      <TouchPad
        onPress={(d) => game.active && !open && step(0, d)}
        right={{ label: game.active ? 'New' : 'Start', onClick: askNew }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          playing={game.active}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original: the wins start again, a new maze waits for F2.
            setSettings(next);
            setGame(newMaze(next, [0, 0], random));
            fresh.current = true;
            setOpen(null);
          }}
        />
      )}

      {open === 'confirm-new' && (
        <Dialog
          title={TITLE}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setOpen(null);
                begin();
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open !== null && typeof open === 'object' && (
        <WinDialog title={TITLE} winner={open.winner} wins={game.wins} onOk={() => setOpen(null)} />
      )}

      {open === 'rules' && (
        <Dialog
          title={`How to Play ${TITLE}`}
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Keyboard: F2 starts a race. Hector (white) moves with the arrow keys; Nestor (brown), with two players,
              with W, A, D and X (Options › Keys changes them). On a touch screen, swipe on the maze or use the buttons
              below it to move Hector.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title={`About ${TITLE}`}
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>{TITLE} copyright © 1995 by The Code Zone.</p>
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
