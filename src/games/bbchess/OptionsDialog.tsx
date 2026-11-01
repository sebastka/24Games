import { useState } from 'react';
import { BoardTab, DraggingTab } from '../../shell/czgame/OptionsTabs.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import type { Settings } from './settings.ts';

/** Game › Options (dialog 256, `FUN_00403784`): board, extras, animation. */
export function OptionsDialog(props: { settings: Settings; onOk: (s: Settings) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(props.settings);
  return (
    <Dialog
      title="Black Box Chess Options"
      className="options"
      buttons={[
        { label: 'OK', primary: true, onClick: () => props.onOk(draft) },
        { label: 'Cancel', cancel: true, onClick: props.onCancel },
      ]}
    >
      <Notebook
        tabs={[
          {
            label: '~Board',
            content: <BoardTab value={draft.boardSet} onChange={(boardSet) => setDraft({ ...draft, boardSet })} />,
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
