import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import { AnimationTab, BoardTab, ConfirmRestart, PiecesTab, SkillLevel } from '../wari/czgame.tsx';
import type { Settings } from './settings.ts';

/** Game › Options (dialog 256): Options, Board, Pieces, Extras and Animation tabs. */
export function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="board-options">
      <SkillLevel skill={draft.skill} onChange={(skill) => setDraft({ ...draft, skill })} />
      <fieldset>
        <legend>Who Goes First</legend>
        <select
          aria-label="Who goes first"
          value={draft.playerFirst ? 0 : 1}
          onChange={(e) => setDraft({ ...draft, playerFirst: e.target.value === '0' })}
        >
          <option value={0}>Player Goes First</option>
          <option value={1}>Computer Goes First</option>
        </select>
      </fieldset>
    </div>
  );

  return (
    <>
      <Dialog
        title="Winding Standoff Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(draft)) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            {
              label: '~Board',
              content: <BoardTab board={draft.board} onChange={(board) => setDraft({ ...draft, board })} />,
            },
            {
              label: '~Pieces',
              content: (
                <PiecesTab
                  pieceSet={draft.pieceSet}
                  twoPieces
                  onChange={(pieceSet) => setDraft({ ...draft, pieceSet })}
                />
              ),
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: (
                <AnimationTab speed={draft.speed} onChange={(speed) => setDraft({ ...draft, speed })}>
                  <fieldset className="mouse-dragging">
                    <legend>Mouse Dragging</legend>
                    <label className="check">
                      <input
                        type="radio"
                        name="drag"
                        checked={draft.dragPieces}
                        onChange={() => setDraft({ ...draft, dragPieces: true })}
                      />
                      <span>
                        <Label text="~Drag Pieces" />
                      </span>
                    </label>
                    <label className="check">
                      <input
                        type="radio"
                        name="drag"
                        checked={!draft.dragPieces}
                        onChange={() => setDraft({ ...draft, dragPieces: false })}
                      />
                      <span>
                        <Label text="D~rag Outlines" />
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
                  </fieldset>
                </AnimationTab>
              ),
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmRestart title="Winding Standoff" onYes={() => props.onOk(draft)} onNo={() => setConfirm(false)} />
      )}
    </>
  );
}
