import { useEffect, useState } from 'react';
import layoutData from '../../assets/pegoplis/layouts.json';
import codezone from '../../assets/shared/codezone.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { gameById } from '../../shell/catalog.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { beep, playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { HallOfFameDialog, HighScoreDialog, OutcomeDialog } from '../match/Dialogs.tsx';
import { insert, loadScores, placeOf, saveScores, type Scores } from '../match/hallOfFame.ts';
import { PIECE_SETS } from '../quinto/sets.ts';
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
  const [scores, setScores] = useState<Scores>(() => loadScores('pegoplis', LAYOUTS.length));
  const [open, setOpen] = useState<Open>(null);
  const layout = LAYOUTS[settings.layout]!;
  const title = `${TITLE} - ${layout.name}`;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveScores('pegoplis', scores), [scores]);

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
      const place = placeOf(scores.tables[settings.layout]!, score, false);
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

  const background = BACKGROUNDS[settings.background];
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
      <div
        className="playfield"
        style={{
          backgroundColor: background?.color,
          backgroundImage: background?.texture && `url(${background.texture})`,
        }}
      >
        <Board
          state={game}
          text={layout.text}
          preview={PREVIEWS[settings.layout]!}
          pieceSet={PIECE_SETS[settings.pieceSet]!.src}
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
        <Dialog
          title={title}
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
          title={title}
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

      {open === 'noMoreJumps' && (
        <Dialog title={title} buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}>
          <p className="message info">You cannot jump any more pieces.</p>
        </Dialog>
      )}

      {open !== null && typeof open === 'object' && 'ending' in open && (
        <OutcomeDialog
          outcome={ENDINGS[open.ending].outcome}
          lines={ENDINGS[open.ending].lines}
          onOk={() => setOpen(null)}
        />
      )}

      {open === 'scores' && (
        <HallOfFameDialog
          title={`Hall of Fame - ${layout.name}`}
          table={scores.tables[settings.layout]!}
          onClear={() =>
            setScores({ ...scores, tables: scores.tables.map((t, i) => (i === settings.layout ? [] : t)) })
          }
          onClose={() => setOpen(null)}
        />
      )}

      {open !== null && typeof open === 'object' && 'highScore' in open && (
        <HighScoreDialog
          name={scores.playerName}
          onOk={(name) => {
            const tables = [...scores.tables];
            tables[settings.layout] = insert(tables[settings.layout]!, open.place, { name, score: open.highScore });
            setScores({ tables, playerName: name });
            setOpen(null);
          }}
        />
      )}

      {open === 'rules' && (
        <Dialog
          title="How to Play Pegopolis"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="rules">
            <p>{INFO.blurb}</p>
            {INFO.rules.map((r) => (
              <p key={r}>{r}</p>
            ))}
            <p>Keyboard: F2 starts a new game. On a touch screen, drag the pieces with a finger.</p>
          </div>
        </Dialog>
      )}

      {open === 'about' && (
        <Dialog
          title="About Pegopolis"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setOpen(null) }]}
        >
          <div className="about">
            <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
            <p>Pegopolis copyright © 1995 by The Code Zone.</p>
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
