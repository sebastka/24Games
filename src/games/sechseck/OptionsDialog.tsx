import { useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import type { Settings } from './settings.ts';

const SIZE_LABELS = ['~Small', '~Medium', '~Large'];

/** Game › Options (dialog 256, FUN_0040b920): board size, background and sounds, mouse dragging. */
export function OptionsDialog(props: {
  settings: Settings;
  /** A game is in progress: OK asks first. OK always starts a new game. */
  playing: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="board-size">
      <fieldset>
        <legend>Board Size</legend>
        {SIZE_LABELS.map((label, i) => (
          <label key={label} className="radio">
            <input
              type="radio"
              name="board-size"
              checked={draft.boardSize === i}
              onChange={() => setDraft({ ...draft, boardSize: i })}
            />
            <span>
              <Label text={label} />
            </span>
          </label>
        ))}
      </fieldset>
      <div className="explanation">
        <p>Changing the size of the game board controls both the length of the game and the scoring possibilities.</p>
        <p>
          A larger board takes longer to play, but it is easier to build high-scoring combinations. It is also easier to
          separate pieces into different 'zones' on the board.
        </p>
      </div>
    </div>
  );

  const animation = (
    <div className="sechseck-animation">
      <fieldset>
        <legend>Mouse Dragging</legend>
        {[true, false].map((bitmaps) => (
          <label key={String(bitmaps)} className="radio">
            <input
              type="radio"
              name="drag"
              checked={draft.dragBitmaps === bitmaps}
              onChange={() => setDraft({ ...draft, dragBitmaps: bitmaps })}
            />
            <span>
              <Label text={bitmaps ? '~Drag Pieces' : 'D~rag Outlines'} />
            </span>
          </label>
        ))}
      </fieldset>
      <div className="zones">
        <label className="check">
          <input
            type="checkbox"
            checked={draft.showDropZones}
            onChange={(e) => setDraft({ ...draft, showDropZones: e.target.checked })}
          />
          <span>
            <Label text="S~how Drop Zones" />
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.showDragZones}
            onChange={(e) => setDraft({ ...draft, showDragZones: e.target.checked })}
          />
          <span>
            <Label text="~Show Drag Zones" />
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        title="Sechseck Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.playing ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            { label: '~Animation', content: animation },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="Sechseck"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
