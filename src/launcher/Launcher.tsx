import { useState } from 'react';
import splash from '../assets/shared/splash.png';
import { GAMES, LAUNCHER_ICON } from '../shell/catalog.ts';
import { Dialog } from '../shell/Dialog.tsx';
import { Window } from '../shell/Window.tsx';
import { PLAYABLE } from '../games/index.ts';

/** The game browser of games.exe: the list of games, and the selected game's information. */
export default function Launcher({ onRun }: { onRun: (id: string) => void }) {
  const [selected, setSelected] = useState(() => GAMES.findIndex((g) => g.id in PLAYABLE));
  const [about, setAbout] = useState(false);
  const game = GAMES[selected]!;
  const playable = game.id in PLAYABLE;

  return (
    <Window
      title="24 Games for Windows 95"
      icon={LAUNCHER_ICON}
      className="launcher"
      menus={[
        {
          label: '~Game',
          items: [{ label: `~Run ${game.title}`, disabled: !playable, onSelect: () => onRun(game.id) }],
        },
        { label: '~Help', items: [{ label: '~About 24 Games...', onSelect: () => setAbout(true) }] },
      ]}
    >
      <div className="browser">
        <div className="game-list">
          <ul role="listbox" aria-label="Games" className="listbox" tabIndex={0}>
            {GAMES.map((g, i) => (
              <li
                key={g.id}
                role="option"
                aria-selected={i === selected}
                className={g.id in PLAYABLE ? undefined : 'unavailable'}
                onClick={() => setSelected(i)}
                onDoubleClick={() => g.id in PLAYABLE && onRun(g.id)}
              >
                <img src={g.smallIcon} alt="" width={16} height={16} />
                {g.title}
              </li>
            ))}
          </ul>
          <button type="button" className="run" disabled={!playable} onClick={() => onRun(game.id)}>
            {playable ? (
              <>
                <u>R</u>un {game.title}
              </>
            ) : (
              'Not ported yet'
            )}
          </button>
        </div>
        <fieldset className="game-info">
          <legend>Game Information</legend>
          <dl>
            <dt>
              <img src={game.icon} alt="" width={32} height={32} />
              Name:
            </dt>
            <dd>{game.title}</dd>
            <dt>Type:</dt>
            <dd>{game.category}</dd>
            <dt>Description:</dt>
            <dd>{game.blurb}</dd>
            <dt>Rules Summary:</dt>
            <dd>
              {game.rules.map((r) => (
                <p key={r}>{r}</p>
              ))}
            </dd>
          </dl>
        </fieldset>
      </div>

      {about && (
        <Dialog
          title="About 24 Games"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setAbout(false) }]}
        >
          <div className="about">
            <img src={splash} alt="24 Games for Windows 95, Expert Software" width={385} height={300} />
            <p>
              24 Games for Windows 95 © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software, Inc.
              Games by The Code Zone.
            </p>
            <p>
              This is an independent reimplementation for the browser, not affiliated with Expert Software or The Code
              Zone. The original art, sounds and texts belong to their owners.
            </p>
          </div>
        </Dialog>
      )}
    </Window>
  );
}
