import { useState } from 'react';
import layouts from '../../assets/pegoplis/layouts.json';
import { BoardTab, DraggingTab, ListTab, PiecesTab } from '../../shell/czgame/OptionsTabs.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
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
            content: (
              <ListTab
                legend="Layout Names"
                items={NAMES}
                value={draft.layout}
                onChange={(layout) => setDraft({ ...draft, layout })}
                previewLegend="Layout Preview"
                preview={<img className="preview" src={props.previews[draft.layout]} alt="" width={80} height={80} />}
              />
            ),
          },
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
          {
            label: '~Animation',
            content: (
              <DraggingTab
                value={{
                  drag: draft.dragBitmaps,
                  showDragZones: draft.showDragZones,
                  showDropZones: draft.showDropZones,
                }}
                onChange={({ drag, ...zones }) => setDraft({ ...draft, dragBitmaps: drag, ...zones })}
              />
            ),
          },
        ]}
      />
    </Dialog>
  );
}
