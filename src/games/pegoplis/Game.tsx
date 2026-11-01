import { useEffect, useState } from 'react';
import layoutData from '../../assets/pegoplis/layouts.json';
import { CONFIRM_NEW, CONFIRM_OPTIONS, ConfirmBox, MessageBox } from '../../shell/Boxes.tsx';
import { backgroundStyle } from '../../shell/canvas.ts';
import { gameById } from '../../shell/catalog.ts';
import { EndDialog } from '../../shell/EndDialog.tsx';
import { HallOfFame, NewHighScore } from '../../shell/HallOfFame.tsx';
import { AboutDialog, RulesDialog } from '../../shell/HelpDialogs.tsx';
import { cleared, loadScores, placeOf, record, saveScores, tableOf, type HighScores } from '../../shell/highscores.ts';
import { beep, playEvent, useStartExit } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { jump, piecesLeft, start, type Layout, type Outcome, type State } from './logic.ts';
import { OptionsDialog } from './OptionsDialog.tsx';
import { loadSettings, saveSettings, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('pegoplis')!;
const TITLE = 'Pegopolis';
const LAYOUTS = layoutData as Layout[];
const previewUrls = import.meta.glob<string>('../../assets/pegoplis/preview-*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});
const PREVIEWS = LAYOUTS.map((_, n) => previewUrls[`../../assets/pegoplis/preview-${n}.png`]!);

/** The end of a game: the dialog's outcome and lines, and its sound (FUN_00402140). */
const ENDINGS: Record<
  Exclude<Outcome, 'stuck' | null>,
  { outcome: 'win' | 'lose'; lines: string[]; sound: SoundEvent }
> = {
  matched: { outcome: 'win', lines: ['You matched', 'the pattern!'], sound: 'Victory' },
  tooMany: { outcome: 'lose', lines: ['Too many pieces', 'removed from board.'], sound: 'Defeat' },
  failed: { outcome: 'lose', lines: ['You failed to', 'match the pattern.'], sound: 'Defeat' },
};

type Open =
  | 'options'
  | 'rules'
  | 'about'
  | 'scores'
  | 'abandon'
  | 'noMoreJumps'
  | { restart: Settings }
  | { ending: Exclude<Outcome, 'stuck' | null> }
  | { highScore: string; place: number }
  | null;

export default function Pegopolis({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => start(LAYOUTS[settings.layout]!));
  const [scores, setScores] = useState<HighScores>(() => loadScores('pegoplis'));
  const [open, setOpen] = useState<Open>(null);
  const layout = LAYOUTS[settings.layout]!;
  const title = `${TITLE} - ${layout.name}`;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('pegoplis', scores), [scores]);

  const sound = (event: SoundEvent) => playEvent(settings, event);

  const exit = useStartExit(TITLE, settings, onExit);

  const drop = (from: { x: number; y: number }, to: { x: number; y: number } | null) => {
    const result = to && jump(game, from, to);
    if (!result) {
      sound('Piece Drop Error');
      return;
    }
    sound('Piece Drop');
    setGame(result.state);
    const { outcome } = result;
    if (outcome === 'stuck') {
      // A score layout with no jump left: the Hall of Fame, else "You cannot jump any more pieces."
      const score = String(piecesLeft(result.state));
      const place = placeOf(tableOf(scores, settings.layout), score, true);
      setOpen(place >= 0 ? { highScore: score, place } : 'noMoreJumps');
    } else if (outcome) {
      setOpen({ ending: outcome });
      sound(ENDINGS[outcome].sound);
    }
  };

  const newGame = (s = settings) => setGame(start(LAYOUTS[s.layout]!));
  // Game › New: once a piece is moved, only on confirmation; a fresh board stays as it is.
  const askNew = () => {
    if (!game.active) newGame();
    else if (game.moved) setOpen('abandon');
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
      title={title}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game pegoplis"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: askNew },
            // Only the layouts with a score have a Hall of Fame.
            { label: 'Show ~High Scores...', disabled: !game.score, onSelect: () => setOpen('scores') },
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
          text={layout.text}
          preview={PREVIEWS[settings.layout]!}
          pieceSet={settings.pieceSet}
          boardSet={settings.boardSet}
          dragBitmaps={settings.dragBitmaps}
          showDragZones={settings.showDragZones}
          showDropZones={settings.showDropZones}
          onDragStart={() => sound('Piece Drag')}
          onDrop={drop}
          onMiss={beep}
        />
      </div>

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          previews={PREVIEWS}
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

      {open === 'noMoreJumps' && (
        <MessageBox title={title} icon="info" text="You cannot jump any more pieces." onOk={() => setOpen(null)} />
      )}

      {open !== null && typeof open === 'object' && 'ending' in open && (
        <EndDialog
          title={TITLE}
          outcome={ENDINGS[open.ending].outcome}
          lines={ENDINGS[open.ending].lines}
          onOk={() => setOpen(null)}
        />
      )}

      {open === 'scores' && (
        <HallOfFame
          title={`Hall of Fame - ${layout.name}`}
          table={tableOf(scores, settings.layout)}
          onClear={() => setScores(cleared(scores, settings.layout))}
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <NewHighScore
          name={scores.player}
          onOk={(name) => {
            setScores(record(scores, settings.layout, open.place, name, open.highScore));
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <RulesDialog
          title="Pegopolis"
          info={INFO}
          onClose={() => setOpen(null)}
          controls="Keyboard: F2 starts a new game. On a touch screen, drag the pieces with a finger."
        />
      )}

      {open === 'about' && <AboutDialog title="Pegopolis" onClose={() => setOpen(null)} />}
    </Window>
  );
}
