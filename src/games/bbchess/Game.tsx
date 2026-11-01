import { useEffect, useState } from 'react';
import { CONFIRM_NEW, CONFIRM_OPTIONS, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { backgroundStyle } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf, type HighScores } from '../../shell/highscores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board, type Press } from './Board.tsx';
import { canGuess, deal, giveUp, guess, place, reveal, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('bbchess')!;
const TITLE = 'Black Box Chess';

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'abandon'
  | 'badGuess'
  | 'won'
  | { restart: Settings }
  | { highScore: string; place: number }
  | null;

export default function BlackBoxChess({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal());
  // After Give Up the title loses its score (FUN_00401aae).
  const [gaveUp, setGaveUp] = useState(false);
  const [scores, setScores] = useState<HighScores>(() => loadScores('bbchess'));
  const [open, setOpen] = useState<Open>(null);
  const title = gaveUp ? TITLE : `${TITLE} Score - ${game.score}`;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('bbchess', scores), [scores]);

  const sound = (event: SoundEvent) => playEvent(settings, event);

  const exit = useStartExit(TITLE, settings, onExit);

  const newGame = () => {
    setGame(deal());
    setGaveUp(false);
  };

  const askGuess = () => {
    if (!canGuess(game)) {
      beep();
      return;
    }
    const result = guess(game);
    setGame(result.state);
    if (result.right) {
      setOpen('won');
      sound('Victory');
    } else {
      setOpen('badGuess');
      sound('Bad Guess');
    }
  };

  const surrender = () => {
    if (!game.active) return;
    setGame(giveUp(game));
    setGaveUp(true);
    sound('Give Up');
  };

  const press = (p: Press) => {
    if (open) return;
    if (!game.active) {
      beep();
      return;
    }
    if (p.kind === 'guess') askGuess();
    else if (p.kind === 'giveUp') surrender();
    else if (p.kind === 'square') {
      const next = reveal(game, p.at);
      if (next) {
        setGame(next);
        sound('Click Board Square');
      }
    } else beep();
  };

  const askNew = () => (game.active ? setOpen('abandon') : newGame());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === 'F2') askNew();
      else if (e.key === 'Enter' && canGuess(game)) askGuess();
      else if (e.key.toLowerCase() === 'g' && e.ctrlKey) surrender();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const apply = (next: Settings) => {
    setSettings(next);
    newGame();
    setOpen(null);
  };

  const afterVictory = () => {
    const score = String(game.score);
    const place = placeOf(tableOf(scores, 0), score);
    setOpen(place >= 0 ? { highScore: score, place } : null);
  };

  return (
    <Window
      title={title}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game bbchess"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            { label: '~High Scores...', onSelect: () => setOpen('scores') },
            { separator: true },
            { label: '~Guess', shortcut: 'Return', disabled: !canGuess(game), onSelect: askGuess },
            { label: 'Give ~Up', shortcut: 'Ctrl+G', disabled: !game.active, onSelect: surrender },
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
        <Board
          state={game}
          boardSet={settings.boardSet}
          dragBitmaps={settings.dragBitmaps}
          showDragZones={settings.showDragZones}
          showDropZones={settings.showDropZones}
          onPress={press}
          onDragStart={() => sound('Piece Drag')}
          onDrop={(piece, to, ok) => {
            // A drop outside the zones puts the piece back, silently (FUN_00403166).
            if (!ok) return;
            setGame(place(game, piece, to));
            sound('Piece Drop');
          }}
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
        <ConfirmBox
          title={title}
          text={CONFIRM_OPTIONS}
          onYes={() => apply(open.restart)}
          onNo={() => setOpen('options')}
        />
      )}

      {open === 'abandon' && (
        <ConfirmBox
          title={title}
          text={CONFIRM_NEW}
          onYes={() => {
            newGame();
            setOpen(null);
          }}
          onNo={() => setOpen(null)}
        />
      )}

      {open === 'badGuess' && (
        <MessageBox
          title={title}
          icon="info"
          text="Sorry, you haven't guessed the sequence yet. Keep trying!"
          onOk={() => setOpen(null)}
        />
      )}

      {open === 'won' && (
        <EndDialog
          title={TITLE}
          outcome="win"
          lines={['You have correctly', 'guessed the position.']}
          onOk={afterVictory}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title="Hall of Fame"
          table={tableOf(scores, 0)}
          onClear={() => setScores(cleared(scores, 0))}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, 0, open.place, name, open.highScore));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Black Box Chess"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard: Enter to guess, Ctrl+G to give up, F2 for a new game. On a touch screen, tap the squares and drag the pieces with a finger."
        />
      )}

      {open === 'about' && <AboutDialog title="Black Box Chess" onClose={() => setOpen(null)} />}
    </Window>
  );
}
