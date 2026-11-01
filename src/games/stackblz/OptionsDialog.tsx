import { useEffect, useRef, useState } from 'react';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { TILE } from './Board.tsx';
import { KEY_ACTIONS, KEYS, PIECE_SETS, type Settings } from './settings.ts';

/** Stack Piece Preview (FUN_0040ac10): the six pieces, 3×2, on 4×3 empty cells. */
function PiecePreview({ sheet, set }: { sheet: string; set: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      for (let i = 0; i < 12; i++) {
        ctx.drawImage(img, 0, set * TILE, TILE, TILE, (i % 4) * TILE, Math.floor(i / 4) * TILE, TILE, TILE);
      }
      for (let p = 1; p <= 6; p++) {
        const x = 16 + ((p - 1) % 3) * TILE;
        const y = 16 + Math.floor((p - 1) / 3) * TILE;
        ctx.drawImage(img, p * TILE, set * TILE, TILE, TILE, x, y, TILE, TILE);
      }
    };
    img.src = sheet;
  }, [sheet, set]);
  return (
    <canvas ref={canvas} width={4 * TILE} height={3 * TILE} className="preview" aria-label="Stack piece preview" />
  );
}

/** Game › Options (dialog 256, FUN_0040a5e0): piece set, keys, background and sounds. */
export function OptionsDialog(props: {
  settings: Settings;
  sheet: string;
  /** A game is in progress: OK asks first, then restarts it. */
  playing: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="pieces">
      <fieldset>
        <legend>Stack Piece Names</legend>
        <ListBox
          label="Stack piece names"
          items={PIECE_SETS}
          selected={draft.pieceSet}
          onSelect={(pieceSet) => setDraft({ ...draft, pieceSet })}
          rows={7}
        />
      </fieldset>
      <fieldset>
        <legend>Stack Piece Preview</legend>
        <PiecePreview sheet={props.sheet} set={draft.pieceSet} />
      </fieldset>
    </div>
  );

  const keySelect = ({ action, label }: (typeof KEY_ACTIONS)[number]) => (
    <label key={action}>
      <span>{label}</span>
      <select
        value={draft.keys[action]}
        onChange={(e) => setDraft({ ...draft, keys: { ...draft.keys, [action]: Number(e.target.value) } })}
      >
        {KEYS.map(([name], i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );

  // As the original's Keys page: moves and drop on the left, rotations on the right.
  const keys = (
    <fieldset className="player-keys">
      <legend>Player Keys</legend>
      <div>{KEY_ACTIONS.slice(0, 3).map(keySelect)}</div>
      <div className="rotations">{KEY_ACTIONS.slice(3).map(keySelect)}</div>
    </fieldset>
  );

  return (
    <>
      <Dialog
        title="StackBlitz Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.playing ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Keys', content: keys },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <Dialog
          title="StackBlitz"
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
