import { useEffect, useRef, useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { KEY_NAMES } from '../../shell/keys.ts';
import { PlayerKeys } from '../../shell/PlayerKeys.tsx';
import { TILE } from './Board.tsx';
import type { Action } from './logic.ts';
import { KEY_ACTIONS, PIECE_SETS, type Settings } from './settings.ts';

/** The Keys page's groups: moves and drop, then the rotations. */
const KEY_GROUPS = [KEY_ACTIONS.slice(0, 3), KEY_ACTIONS.slice(3)].map((group) =>
  group.map(({ action, label }): [Action, string] => [action, label]),
);

/** A value for each of the five keys. */
const mapKeys = <T,>(f: (action: Action) => T): Record<Action, T> =>
  Object.fromEntries(KEY_ACTIONS.map(({ action }) => [action, f(action)])) as Record<Action, T>;

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

  // As the original's Keys page: moves and drop on the left, rotations on the right.
  const keys = (
    <PlayerKeys
      legend="Player Keys"
      layout="columns"
      groups={KEY_GROUPS}
      keys={mapKeys((action) => KEY_NAMES[draft.keys[action]]!)}
      onChange={(k) => setDraft({ ...draft, keys: mapKeys((action) => KEY_NAMES.indexOf(k[action])) })}
    />
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
        <ConfirmBox
          title="StackBlitz"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
