import { useState } from 'react';
import layouts from '../../assets/pegoplis/layouts.json';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { BoardPreview, PiecePreview } from '../quinto/Previews.tsx';
import { BOARD_SETS, PIECE_SETS } from '../quinto/sets.ts';
import { AnimationTab } from './AnimationTab.tsx';
import type { Settings } from './settings.ts';

const NAMES = layouts.map((l) => l.name);

/** Game › Options (dialog 256, `FUN_00403970`): layout, board, pieces, extras, animation. */
export function OptionsDialog(props: {
  settings: Settings;
  previews: string[];
  onOk: (s: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);

  const list = (
    legend: string,
    items: string[],
    selected: number,
    onSelect: (i: number) => void,
    preview: React.ReactNode,
    previewLegend: string,
  ) => (
    <div className="pieces pegoplis-sets">
      <fieldset>
        <legend>{legend}</legend>
        <ListBox label={legend} items={items} selected={selected} onSelect={onSelect} rows={7} />
      </fieldset>
      <fieldset>
        <legend>{previewLegend}</legend>
        {preview}
      </fieldset>
    </div>
  );

  return (
    <Dialog
      title="Pegopolis Options"
      className="options"
      buttons={[
        { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
        { label: 'Cancel', cancel: true, onClick: props.onCancel },
      ]}
    >
      <Notebook
        tabs={[
          {
            label: '~Options',
            content: list(
              'Layout Names',
              NAMES,
              draft.layout,
              (layout) => setDraft({ ...draft, layout }),
              <img className="preview" src={props.previews[draft.layout]} alt="" width={80} height={80} />,
              'Layout Preview',
            ),
          },
          {
            label: '~Board',
            content: list(
              'Board Names',
              BOARD_SETS,
              draft.boardSet,
              (boardSet) => setDraft({ ...draft, boardSet }),
              <BoardPreview set={draft.boardSet} />,
              'Board Preview',
            ),
          },
          {
            label: '~Pieces',
            content: list(
              'Piece Names',
              PIECE_SETS.map((p) => p.name),
              draft.pieceSet,
              (pieceSet) => setDraft({ ...draft, pieceSet }),
              <PiecePreview set={draft.pieceSet} />,
              'Piece Preview',
            ),
          },
          {
            label: '~Extras',
            content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
          },
          {
            label: '~Animation',
            content: <AnimationTab value={draft} onChange={(a) => setDraft({ ...draft, ...a })} />,
          },
        ]}
      />
    </Dialog>
  );
}
