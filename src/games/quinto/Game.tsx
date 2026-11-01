import { useEffect, useState } from 'react';
import { CONFIRM_NEW, CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { backgroundStyle } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf, type HighScores } from '../../shell/highscores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { flip, perfectText, start, tableOf as sizeTable, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
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
  const [scores, setScores] = useState<HighScores>(() => loadScores('quinto'));
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('quinto', scores), [scores]);

  const sound = (event: SoundEvent) => playEvent(settings, event);

  const exit = useStartExit(TITLE, settings, onExit);

  const table = sizeTable(settings.width, settings.height);

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
    const place = placeOf(tableOf(scores, table), score, true);
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
      <div className="playfield" style={backgroundStyle(settings.background)}>
        <Board state={game} pieceSet={settings.pieceSet} boardSet={settings.boardSet} onClick={click} />
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          onCancel={() => setOpen(null)}
          onOk={(next) => (game.active ? setOpen({ restart: next }) : apply(next))}
        />
      )}

      {open !== null && typeof open === 'object' && 'restart' in open && (
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_OPTIONS}
          onYes={() => apply(open.restart)}
          onNo={() => setOpen('options')}
        />
      )}

      {open === 'abandon' && (
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_NEW}
          onYes={() => {
            newGame();
            setOpen(null);
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame (${settings.width}x${settings.height})`}
          table={tableOf(scores, table)}
          onClear={() => setScores(cleared(scores, table))}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'solved' in open && (
        <EndDialog
          title={TITLE}
          outcome="win"
          lines={[`Your Score : ${open.solved.moves}`, perfectText(open.solved)]}
          onOk={() => afterVictory(open.solved)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, table, open.place, name, open.highScore));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Quinto"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard: F2 starts a new game. On a touch screen, tap the pieces."
        />
      )}

      {open === 'about' && <AboutDialog title="Quinto" onClose={() => setOpen(null)} />}
    </Window>
  );
}
