import { useEffect, useState } from 'react';
import levels from '../../assets/bulldoze/levels.json';
import piecesColor from '../../assets/bulldoze/pieces-color.png';
import piecesMono from '../../assets/bulldoze/pieces-mono.png';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { TouchPad } from '../../shell/TouchPad.tsx';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { canUndo, isComplete, move, parseLevel, start, undo, type Direction, type MoveEvent } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { completion, END_SCREEN, type Completion } from './progress.ts';
import './style.css';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';

const SHEETS = [piecesColor, piecesMono];
const INFO = gameById('bulldoze')!;

const begin = (level: number) => start(parseLevel(levels[level - 1]!), level === END_SCREEN);

/** With a texture background, the original's play field (fully covered by tiles) is black. */
const floorOf = (background: number): string => BACKGROUNDS[background]?.color ?? '#000000';

const MOVE_SOUND: Record<MoveEvent, SoundEvent | null> = {
  move: 'Move',
  rock: 'Move Rock',
  rockOnTarget: 'Move Rock To Target',
  turn: null,
};

const COMPLETION_SOUND: Record<Completion['kind'], SoundEvent> = {
  level: 'Complete Level',
  password: 'Receive Password',
  final: 'Complete Final Level',
};

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

type Open = 'options' | 'rules' | 'about' | { completed: number; completion: Completion } | null;

export default function Bulldozer({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState(() => begin(settings.level));
  const [open, setOpen] = useState<Open>(null);
  const { level } = settings;

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent | null) => {
    const name = event && settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  const act = (direction: Direction) => {
    if (open || isComplete(game)) return;
    const { state, event } = move(game, direction);
    setGame(state);
    sound(MOVE_SOUND[event]);
    if (isComplete(state)) {
      const c = completion(level);
      sound(COMPLETION_SOUND[c.kind]);
      setOpen({ completed: level, completion: c });
    }
  };

  const restart = () => setGame(begin(level));
  const undoLast = () => {
    if (!canUndo(game)) return;
    const result = undo(game);
    if (result.beep) beep();
    setGame(result.state);
  };

  const nextLevel = () => {
    const next = level + 1;
    setSettings({ ...settings, level: next });
    setGame(begin(next));
    setOpen(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const direction = KEYS[e.key];
      if (direction) act(direction);
      else if (e.key === 'F2') restart();
      else if (e.key === 'z' && e.ctrlKey) undoLast();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const background = BACKGROUNDS[settings.background];
  return (
    <Window
      title={`Bulldozer - Level ${level}`}
      icon={INFO.smallIcon}
      onClose={onExit}
      className="game bulldozer"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~Restart Level', shortcut: 'F2', onSelect: restart },
            { label: '~Undo Last Move', shortcut: 'Ctrl+Z', disabled: !canUndo(game), onSelect: undoLast },
            { separator: true },
            { label: '~Options...', onSelect: () => setOpen('options') },
            { separator: true },
            { label: 'E~xit', onSelect: onExit },
          ],
        },
        {
          label: '~Help',
          items: [
            { label: '~How to Play', onSelect: () => setOpen('rules') },
            { label: '~About Bulldozer...', onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <div
        className="playfield"
        style={{
          backgroundColor: background?.color,
          backgroundImage: background?.texture && `url(${background.texture})`,
        }}
      >
        <Board state={game} pieces={SHEETS[settings.pieceSet]!} floor={floorOf(settings.background)} onMove={act} />
      </div>
      <TouchPad
        onPress={act}
        left={{ label: 'Undo', onClick: undoLast, disabled: !canUndo(game) }}
        right={{ label: 'Restart', onClick: restart }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          sheets={SHEETS}
          floorOf={floorOf}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            // Like the original, OK restarts the game (at the newly chosen level, if any).
            setSettings(next);
            setGame(begin(next.level));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Bulldozer"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>
              Keyboard: arrow keys to move, F2 to restart the level, Ctrl+Z to undo the last push. On a touch screen,
              swipe on the play field or use the buttons below it.
            </p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Bulldozer"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Bulldozer copyright © 1995 by The Code Zone.</p>
            <p>
              From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software,
              Inc.
            </p>
            <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
          </div>
        </Dialog>
      )}

      {open !== null && typeof open === 'object' && (
        <CompletionDialog completed={open.completed} completion={open.completion} onOk={nextLevel} />
      )}
    </Window>
  );
}

/** The dialogs after a level, with the original's texts. */
function CompletionDialog({
  completed,
  completion,
  onOk,
}: {
  completed: number;
  completion: Completion;
  onOk: () => void;
}) {
  if (completion.kind === 'final') {
    return (
      <Dialog
        title="Acknowledge your brilliance. . ."
        buttons={[{ label: 'Aww Shucks', primary: true, cancel: true, onClick: onOk }]}
      >
        <div className="completion">
          <p className="big">Congratulations!</p>
          <p>You have completed all 60 levels of Bulldozer!</p>
          <p>
            You are now a member of an elite squadron of Bulldozer experts. Have a nice day, secure in your expert
            handling of spatial relationships!
          </p>
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog title="Bulldozer" buttons={[{ label: 'OK', primary: true, cancel: true, onClick: onOk }]}>
      <div className="completion">
        <p className="big">You Completed Level {completed}</p>
        {completion.kind === 'password' && (
          <>
            <p>The password for Level {completed + 1} is</p>
            <p className="password">{completion.password}</p>
          </>
        )}
        <p className="big">Prepare for Level {completed + 1}</p>
      </div>
    </Dialog>
  );
}
