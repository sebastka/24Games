import { useEffect, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { HallOfFame, NewHighScore } from '../../shell/cards/HighScores.tsx';
import { insertScore, placeOf } from '../../shell/cards/scores.ts';
import { Dialog } from '../../shell/Dialog.tsx';
import { playSound } from '../../shell/sound.ts';
import { Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { OptionsDialog, ScoreDialog } from './Dialogs.tsx';
import { CELLS, deal, isOver, place, score, tableOf, type State } from './logic.ts';
import { loadSettings, saveSettings, TITLE, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('pokergrd')!;

type Open = 'options' | 'new' | 'score' | 'final-score' | { name: number } | 'high-scores' | 'rules' | 'about' | null;

export default function PokerPatience({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal(settings, Math.random));
  const [open, setOpen] = useState<Open>(null);
  const over = isOver(game);
  const table = tableOf(settings);

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  // The original plays "<title> Start" when its window opens, then "Deal Cards" for the first deal.
  useEffect(() => {
    sound(`${TITLE} Start`);
    sound('Deal Cards');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newGame = (s: Settings = settings) => {
    setGame(deal(s, Math.random));
    sound('Deal Cards');
    setOpen(null);
  };

  const exit = () => {
    sound(`${TITLE} Exit`);
    onExit();
  };

  /** FUN_00405a11: a card into a cell; the 25th ends the game. */
  const put = (pile: number, cell: number) => {
    const next = place(game, pile, cell);
    if (next === game) return;
    setGame(next);
    if (isOver(next)) {
      sound('Game Over');
      setOpen('final-score');
    }
  };

  /** After the final score: a name for the high score table, if the score enters it. */
  const afterScore = () => {
    const at = placeOf(settings.scores[table] ?? [], score(game).total);
    setOpen(at === null ? null : { name: at });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const key = e.key.toLowerCase();
      if (e.key === 'F2') {
        if (over) newGame();
        else setOpen('new');
      } else if (e.key === 'ArrowLeft' && game.piles.length === 2) setGame({ ...game, selected: 0 });
      else if (e.key === 'ArrowRight' && game.piles.length === 2) setGame({ ...game, selected: 1 });
      else if (/^[a-y]$/.test(key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // FUN_004052e8: a letter fills its cell from the selected pile, with the drop sound.
        const cell = key.charCodeAt(0) - 97;
        if (cell >= CELLS || game.grid[cell]) return;
        sound('Drop Card');
        put(game.selected, cell);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const final = over ? score(game) : null;
  return (
    <Window
      title={TITLE}
      icon={INFO.smallIcon}
      onClose={exit}
      className="game pokergrd"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: () => (over ? newGame() : setOpen('new')) },
            { label: '~Show Current Score...', disabled: !over, onSelect: () => setOpen('score') },
            { label: 'Show ~High Scores...', onSelect: () => setOpen('high-scores') },
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
            { label: `~About ${TITLE}...`, onSelect: () => setOpen('about') },
          ],
        },
      ]}
    >
      <Board
        state={game}
        faceUp={settings.faceUp}
        look={settings}
        drag={settings}
        background={settings.background}
        onSelect={(selected) => setGame({ ...game, selected })}
        onPlace={put}
        onDragStart={() => sound('Drag Card')}
        onDrop={(pile, cell) => {
          sound('Drop Card');
          put(pile, cell);
        }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={!over}
          onCancel={() => setOpen(null)}
          onOk={(next) => {
            setSettings(next);
            newGame(next);
          }}
        />
      )}

      {open === 'new' && (
        <Dialog
          title={TITLE}
          buttons={[
            { label: '~Yes', primary: true, onClick: () => newGame() },
            { label: '~No', cancel: true, onClick: () => setOpen(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to abandon the game in progress?</p>
        </Dialog>
      )}

      {(open === 'score' || open === 'final-score') && final && (
        <ScoreDialog {...final} onOk={() => (open === 'final-score' ? afterScore() : setOpen(null))} />
      )}

      {open !== null && typeof open === 'object' && final && (
        <NewHighScore
          name={settings.playerName}
          onOk={(name) => {
            const scores = [...settings.scores];
            scores[table] = insertScore(scores[table] ?? [], open.name, { name, score: final.total });
            setSettings({ ...settings, scores, playerName: name });
            setOpen(null);
          }}
        />
      )}

      {open === 'high-scores' && (
        <HallOfFame
          title={TITLE}
          table={settings.scores[table] ?? []}
          onClear={() => {
            const scores = [...settings.scores];
            scores[table] = [];
            setSettings({ ...settings, scores });
          }}
          onClose={() => setOpen(null)}
        />
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
              Each row and each column scores its poker hand: pair 1, two pair 3, flush 5, three of a kind 6, full house
              10, straight 12, four of a kind 16, straight flush 30.
            </p>
            <p>
              Keyboard: the letters A to Y fill their cell, the left and right arrows choose the pile, F2 starts a new
              game. With a finger: drag a card, or tap an empty cell.
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
