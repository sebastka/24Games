import { useState } from 'react';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { MAX_SIZE, MIN_SIZE } from './logic.ts';
import { BoardPreview, PiecePreview } from './Previews.tsx';
import { BOARD_SETS, PIECE_SETS } from './sets.ts';
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

  const sets = (kind: 'board' | 'piece') => (
    <div className="pieces quinto-sets">
      <fieldset>
        <legend>{kind === 'board' ? 'Board Names' : 'Piece Names'}</legend>
        <ListBox
          label={kind === 'board' ? 'Board names' : 'Piece names'}
          items={kind === 'board' ? BOARD_SETS : PIECE_SETS.map((p) => p.name)}
          selected={kind === 'board' ? draft.boardSet : draft.pieceSet}
          onSelect={(i) => setDraft(kind === 'board' ? { ...draft, boardSet: i } : { ...draft, pieceSet: i })}
          rows={7}
        />
      </fieldset>
      <fieldset>
        <legend>{kind === 'board' ? 'Board Preview' : 'Piece Preview'}</legend>
        {kind === 'board' ? <BoardPreview set={draft.boardSet} /> : <PiecePreview set={draft.pieceSet} />}
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
          { label: '~Board', content: sets('board') },
          { label: '~Pieces', content: sets('piece') },
          {
            label: '~Extras',
            content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
          },
        ]}
      />
    </Dialog>
  );
}
