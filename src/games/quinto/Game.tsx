import { useEffect, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { HallOfFameDialog, HighScoreDialog, OutcomeDialog } from '../match/Dialogs.tsx';
import { insert, loadScores, placeOf, saveScores, type Scores } from '../match/hallOfFame.ts';
import { Board } from './Board.tsx';
import { flip, perfectText, start, tableOf, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { PIECE_SETS } from './sets.ts';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('quinto')!;
const TITLE = 'Quinto';

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'abandon'
  | { restart: Settings }
  | { solved: State }
  | { highScore: string; place: number }
  | null;

export default function Quinto({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => start(settings.width, settings.height));
  const [scores, setScores] = useState<Scores>(() => loadScores('quinto', 10));
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('quinto', scores), [scores]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  // "<title> Start", once (by default no sound).
  const [atStart] = useState(settings);
  useEffect(() => {
    const name = atStart.sounds[`${TITLE} Start`];
    if (atStart.soundEnabled && name) playSound(name);
  }, [atStart]);
  const exit = () => {
    sound(`${TITLE} Exit`);
    onExit();
  };

  const table = tableOf(settings.width, settings.height);

  const click = (x: number, y: number) => {
    if (open) return;
    if (!game.active) {
      beep();
      return;
    }
    if (x < 0) return;
    sound('Flip Pieces');
    const next = flip(game, x, y);
    setGame(next);
    if (!next.active) {
      setOpen({ solved: next });
      sound('Puzzle Solved');
    }
  };

  const afterVictory = (solved: State) => {
    const score = String(solved.moves);
    const place = placeOf(scores.tables[table]!, score, false);
    setOpen(place >= 0 ? { highScore: score, place } : null);
  };

  const newGame = (s = settings) => setGame(start(s.width, s.height));
  // Game › New: once a move is made, only on confirmation; a fresh board stays as it is.
  const askNew = () => {
    if (!game.active) newGame();
    else if (game.moves > 0) setOpen('abandon');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || open) return;
      e.preventDefault();
      askNew();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const apply = (next: Settings) => {
    setSettings(next);
    newGame(next);
    setOpen(null);
  };

  const background = BACKGROUNDS[settings.background];
  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game quinto"
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
            { label: '~How to play', onSelect: () => setOpen('rules') },
            { label: '~About ...', onSelect: () => setOpen('about') },
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
        <Board
          state={game}
          pieceSet={PIECE_SETS[settings.pieceSet]!.src}
          boardSet={settings.boardSet}
          onClick={click}
        />
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          onCancel={() => setOpen(null)}
          onOk={(next) => (game.active ? setOpen({ restart: next }) : apply(next))}
        />
      )}

      {open !== null && typeof open === 'object' && 'restart' in open && (
        <Dialog
          title={TITLE}
          buttons={[
            { label: '~Yes', primary: true, onClick: () => apply(open.restart) },
            { label: '~No', cancel: true, onClick: () => setOpen('options') },
          ]}
        >
          <p className="message warning">
            Changing the game options will restart the game in progress. Are you sure you want to do this?
          </p>
        </Dialog>
      )}

      {open === 'abandon' && (
        <Dialog
          title={TITLE}
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                newGame();
                setOpen(null);
              },
            },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {open === 'scores' && (
        <HallOfFameDialog
          title={`Hall of Fame (${settings.width}x${settings.height})`}
          table={scores.tables[table]!}
          onClear={() => setScores({ ...scores, tables: scores.tables.map((t, i) => (i === table ? [] : t)) })}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'solved' in open && (
        <OutcomeDialog
          outcome="win"
          lines={[`Your Score : ${open.solved.moves}`, perfectText(open.solved)]}
          onOk={() => afterVictory(open.solved)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <HighScoreDialog
          name={scores.playerName}
          onOk={(name) => {
            const tables = [...scores.tables];
            tables[table] = insert(tables[table]!, open.place, { name, score: open.highScore });
            setScores({ tables, playerName: name });
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Quinto"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>Keyboard: F2 starts a new game. On a touch screen, tap the pieces.</p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Quinto"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Quinto copyright © 1995 by The Code Zone.</p>
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
