import { useEffect, useRef, useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import '../../shell/czgame/style.css';
import { SIZES } from './logic.ts';
import { TILE_SETS, type Settings } from './settings.ts';

const SIZE_LABELS = ['~15 x 15', '1~9 x 19', '~22 x 22', '2~5 x 25'];

/** The Pieces tab's preview (`FUN_004096a0`): 8 × 7 tiles, every tile of the set in turn. */
function TilePreview({ sheet }: { sheet: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 8; col++) {
          ctx.drawImage(img, ((row + col * 7) % 11) * 16, 0, 16, 16, col * 16, row * 16, 16, 16);
        }
      }
    };
    img.src = sheet;
  }, [sheet]);
  return <canvas ref={canvas} width={128} height={112} className="preview" aria-label="Piece preview" />;
}

/** Game › Options (dialog 256): Options (board size), Pieces and Extras tabs. */
export function OptionsDialog(props: {
  settings: Settings;
  sheets: string[];
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="board-options">
      <fieldset className="skill-level">
        <legend>Board Size</legend>
        {SIZES.map((size, i) => (
          <label key={size} className="check">
            <input
              type="radio"
              name="size"
              checked={draft.size === size}
              onChange={() => setDraft({ ...draft, size })}
            />
            <span>
              <Label text={SIZE_LABELS[i]!} />
            </span>
          </label>
        ))}
      </fieldset>
      <div className="explanation">
        <p>The Board Size buttons determine the dimensions of the board you will be playing.</p>
        <p>Smaller board sizes play faster, but the scoring possibilities are much lower than with larger boards.</p>
      </div>
    </div>
  );

  const pieces = (
    <div className="pieces">
      <fieldset>
        <legend>Piece Names</legend>
        <ListBox
          label="Piece names"
          items={TILE_SETS}
          selected={draft.tiles}
          onSelect={(tiles) => setDraft({ ...draft, tiles })}
          rows={6}
        />
      </fieldset>
      <fieldset>
        <legend>Piece Preview</legend>
        <TilePreview sheet={props.sheets[draft.tiles]!} />
      </fieldset>
    </div>
  );

  return (
    <>
      <Dialog
        title="Voracity Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
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
      {confirm && (
        <ConfirmBox
          title="Voracity"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
