import { useEffect, useRef, useState } from 'react';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { TILE } from './Board.tsx';
import { checkPassword, STARTING_LEVELS } from './progress.ts';
import { PIECE_SETS, type Settings } from './settings.ts';

/** Piece Set Preview: walls around the dozer, a rock on a target (bulldoze.exe's .data). */
const PREVIEW = [9, 8, 8, 13, 8, 7, 3, 8, 10, 8, 8, 12];

function PiecePreview({ sheet, floor }: { sheet: string; floor: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, 4 * TILE, 3 * TILE);
      PREVIEW.forEach((tile, i) =>
        ctx.drawImage(img, tile * TILE, 0, TILE, TILE, (i % 4) * TILE, Math.floor(i / 4) * TILE, TILE, TILE),
      );
    };
    img.src = sheet;
  }, [sheet, floor]);
  return <canvas ref={canvas} width={4 * TILE} height={3 * TILE} className="preview" aria-label="Piece set preview" />;
}

type Prompt = { kind: 'confirm-level-1' } | { kind: 'password'; level: number } | { kind: 'wrong-password' } | null;

/** Game › Options: starting level (with passwords), piece set, background and sounds. */
export function OptionsDialog(props: {
  settings: Settings;
  sheets: string[];
  floorOf: (background: number) => string;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [chosen, setChosen] = useState(Math.max(0, STARTING_LEVELS.indexOf(props.settings.level)));
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [typed, setTyped] = useState('');

  const askFor = (i: number) => {
    setChosen(i);
    const level = STARTING_LEVELS[i]!;
    if (level === 1) setPrompt({ kind: 'confirm-level-1' });
    else {
      setTyped('');
      setPrompt({ kind: 'password', level });
    }
  };

  const options = (
    <div className="starting-level">
      <fieldset>
        <legend>Starting Level</legend>
        <ListBox
          label="Starting level"
          items={STARTING_LEVELS.map((l) => `Level ${l}`)}
          selected={chosen}
          onSelect={setChosen}
          onActivate={askFor}
          rows={7}
        />
      </fieldset>
      <div className="explanation">
        <p>
          To change to a new level, double-click it in the list box. You will be required to enter the password you
          received when you last conquered that level.
        </p>
        <p>You are given a password for every fourth level you conquer.</p>
        <p className="current">Current Level = {draft.level}</p>
      </div>
    </div>
  );

  const pieces = (
    <div className="pieces">
      <fieldset>
        <legend>Piece Set Names</legend>
        <ListBox
          label="Piece sets"
          items={PIECE_SETS}
          selected={draft.pieceSet}
          onSelect={(pieceSet) => setDraft({ ...draft, pieceSet })}
          rows={4}
        />
      </fieldset>
      <fieldset>
        <legend>Piece Set Preview</legend>
        <PiecePreview sheet={props.sheets[draft.pieceSet]!} floor={props.floorOf(draft.background)} />
      </fieldset>
    </div>
  );

  return (
    <>
      <Dialog
        title="Bulldozer Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Pieces', content: pieces },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
          ]}
        />
      </Dialog>

      {prompt?.kind === 'confirm-level-1' && (
        <Dialog
          title="Bulldozer"
          buttons={[
            {
              label: '~Yes',
              primary: true,
              onClick: () => {
                setDraft({ ...draft, level: 1 });
                setPrompt(null);
              },
            },
            { label: '~No', cancel: true, onClick: () => setPrompt(null) },
          ]}
        >
          <p className="message warning">Are you sure you want to return to level 1?</p>
        </Dialog>
      )}

      {prompt?.kind === 'password' && (
        <Dialog
          title={`Enter the password for level ${prompt.level}`}
          buttons={[
            {
              label: 'OK',
              primary: true,
              onClick: () => {
                if (checkPassword(prompt.level, typed)) {
                  setDraft({ ...draft, level: prompt.level });
                  setPrompt(null);
                } else setPrompt({ kind: 'wrong-password' });
              },
            },
          ]}
        >
          <p>Please enter the password for level {prompt.level}.</p>
          <input
            type="text"
            aria-label="Password"
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </Dialog>
      )}

      {prompt?.kind === 'wrong-password' && (
        <Dialog
          title="Bulldozer"
          buttons={[{ label: 'OK', primary: true, cancel: true, onClick: () => setPrompt(null) }]}
        >
          <p className="message error">Sorry, you did not enter the correct password.</p>
        </Dialog>
      )}
    </>
  );
}
