import { useEffect, useState } from 'react';
import codezone from '../../assets/shared/codezone.png';
import { gameById } from '../../shell/catalog.ts';
import { AnimationTab, FacesTab } from '../../shell/cards/OptionsTabs.tsx';
import { EndDialog } from '../../shell/cards/EndDialog.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { playSound } from '../../shell/sound.ts';
import { Label, Window } from '../../shell/Window.tsx';
import { Board } from './Board.tsx';
import { canClaim, canUndo, claim, deal, foundationFor, isFoundation, move, undo, type State } from './logic.ts';
import { loadSettings, saveSettings, TITLE, type Settings, type SoundEvent } from './settings.ts';
import './style.css';

const INFO = gameById('siege')!;

type Open = 'options' | 'new' | 'rules' | 'about' | { won: [string, string] } | null;

export default function Siege({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [game, setGame] = useState<State>(() => deal(settings.acesPlaced, Math.random));
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => saveSettings(settings), [settings]);

  const sound = (event: SoundEvent) => {
    const name = settings.sounds[event];
    if (settings.soundEnabled && name) playSound(name);
  };

  useEffect(() => {
    sound(`${TITLE} Start`);
    sound('Deal Cards');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newGame = (s: Settings = settings) => {
    setGame(deal(s.acesPlaced, Math.random));
    sound('Deal Cards');
    setOpen(null);
  };

  const exit = () => {
    sound(`${TITLE} Exit`);
    onExit();
  };

  /** FUN_00409f70: a card moved; when the wings are empty, "You played all of the cards!". */
  const play = (from: number, to: number) => {
    const next = move(game, from, to);
    setGame(next);
    sound(isFoundation(to) ? 'Drop to Foundation' : 'Drop to Tableau');
    if (!next.playing) {
      sound('Victory');
      setOpen({ won: ['You played all', 'of the cards!'] });
    }
  };

  const undoLast = () => canUndo(game) && setGame(undo(game));
  const claimGame = () => {
    setGame(claim(game));
    sound('Victory');
    setOpen({ won: ['You successfully', 'claimed the game!'] });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        if (game.playing) setOpen('new');
        else newGame();
      } else if (e.key === 'z' && e.ctrlKey) undoLast();
      else return;
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
      className="game siege"
      menus={[
        {
          label: '~Game',
          items: [
            { label: '~New', shortcut: 'F2', onSelect: () => (game.playing ? setOpen('new') : newGame()) },
            { label: '~Undo Last Move', shortcut: 'Ctrl+Z', disabled: !canUndo(game), onSelect: undoLast },
            { label: '~Claim', disabled: !canClaim(game), onSelect: claimGame },
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
        look={settings}
        drag={settings}
        background={settings.background}
        onDragStart={() => sound('Drag Card')}
        onMove={play}
        onDoubleClick={(pile) => {
          const to = foundationFor(game, pile);
          if (to === null) return false;
          play(pile, to);
          return true;
        }}
      />

      {open === 'options' && (
        <OptionsDialog
          settings={settings}
          inProgress={game.playing}
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

      {open !== null && typeof open === 'object' && (
        <EndDialog title={TITLE} outcome="win" lines={open.won} onClose={() => setOpen(null)} />
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
              Drag the top card of a wing pile onto a card one rank higher, onto an empty pile, or onto its foundation.
              Double-click (or double-tap) a card to send it to its foundation. When every wing pile is in descending
              order, Game › Claim ends the game. Keyboard: F2 starts a new game, Ctrl+Z undoes the last move.
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

const ANIMATION_LABELS = ['~Drag Cards', 'D~rag Outlines', '~Show Drag Zones', 'S~how Drop Zones'];

/** Game › Options: OK restarts the game, after a confirmation if one is in progress. */
function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);
  const radio = (label: string, acesPlaced: boolean) => (
    <label className="check">
      <input
        type="radio"
        name="aces"
        checked={draft.acesPlaced === acesPlaced}
        onChange={() => setDraft({ ...draft, acesPlaced })}
      />
      <span>
        <Label text={label} />
      </span>
    </label>
  );
  return (
    <>
      <Dialog
        title={`${TITLE} Options`}
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            {
              label: '~Options',
              content: (
                <div className="card-tab">
                  <fieldset className="foundations">
                    <legend>Foundations</legend>
                    {radio('~Place Aces on Foundations', true)}
                    {radio('P~lace Aces in Tableau', false)}
                  </fieldset>
                </div>
              ),
            },
            {
              label: '~Faces',
              content: <FacesTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: (
                <AnimationTab
                  value={draft}
                  labels={ANIMATION_LABELS}
                  onChange={(drag) => setDraft({ ...draft, ...drag })}
                />
              ),
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <Dialog
          title={TITLE}
          buttons={[
            { label: '~Yes', primary: true, onClick: () => props.onOk(draft) },
            { label: '~No', cancel: true, onClick: () => setConfirm(false) },
          ]}
        >
          <p className="message warning">
            Changing the game options will restart the game in progress. Are you sure you want to do this?
          </p>
        </Dialog>
      )}
    </>
  );
}
