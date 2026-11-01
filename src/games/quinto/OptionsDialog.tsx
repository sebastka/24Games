import { useState } from 'react';
import { BoardTab, PiecesTab } from '../../shell/czgame/OptionsTabs.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { MAX_SIZE, MIN_SIZE } from './logic.ts';
import type { Settings } from './settings.ts';

const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

/** Game › Options (dialog 256): board size, board, pieces, then background and sounds. */
export function OptionsDialog(props: { settings: Settings; onOk: (s: Settings) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(props.settings);

  const size = (label: string, key: 'width' | 'height', help: string) => (
    <label className="size" title={help}>
      <span>{label}</span>
      <select value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}>
        {SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const options = (
    <div className="quinto-options">
      <fieldset>
        <legend>Board Size</legend>
        {size(
          'Horizontal',
          'width',
          'The horizontal field controls how many squares wide the board is.  The more squares the board has, the more difficult the game is.',
        )}
        {size(
          'Vertical',
          'height',
          'The vertical field controls how many squares high the board is.  The more squares the board has, the more difficult the game is.',
        )}
      </fieldset>
    </div>
  );

  return (
    <Dialog
      title="Quinto Options"
      className="options"
      buttons={[
        { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
        { label: 'Cancel', cancel: true, onClick: props.onCancel },
      ]}
    >
      <Notebook
        tabs={[
          { label: '~Options', content: options },
          {
            label: '~Board',
            content: <BoardTab value={draft.boardSet} onChange={(boardSet) => setDraft({ ...draft, boardSet })} />,
          },
          {
            label: '~Pieces',
            content: <PiecesTab value={draft.pieceSet} onChange={(pieceSet) => setDraft({ ...draft, pieceSet })} />,
          },
          {
            label: '~Extras',
            content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
          },
        ]}
      />
    </Dialog>
  );
}
