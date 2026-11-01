import { useState } from 'react';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import { CONFIRM_OPTIONS, ConfirmBox } from '../reversi/shared/Boxes.tsx';
import { AnimationTab, BoardTab, Choice, PiecesTab, SkillLevel } from '../reversi/shared/OptionsTabs.tsx';
import { LAYOUTS, type Progression, type Settings } from './settings.ts';

const NUMBERS = Array.from({ length: LAYOUTS }, (_, i) => String(i + 1));

/** A radio button of the Layout tab, with its drop-down list of boards (enabled when checked). */
function LayoutChoice(props: {
  label: string;
  checked: boolean;
  onCheck: () => void;
  board?: { value: number; onChange: (board: number) => void };
}) {
  return (
    <div className="layout-choice">
      <label className="check">
        <input type="radio" name="layout" checked={props.checked} onChange={props.onCheck} />
        <span>
          <Label text={props.label} />
        </span>
      </label>
      {props.board && (
        <select
          aria-label={props.label.replace('~', '')}
          disabled={!props.checked}
          value={props.board.value}
          onChange={(e) => props.board!.onChange(Number(e.target.value))}
        >
          {NUMBERS.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Game › Options (`FUN_004048d0`, dialog 256): skill level and who goes first; the board layout
 * (a number, random, or stepping from a number); board, pieces, extras; animation and mouse
 * dragging. OK restarts the game on the next layout, after a confirmation if one is in progress
 * (`FUN_004048a0`).
 */
export function OptionsDialog(props: {
  settings: Settings;
  /** The layout being played (0-34). */
  layout: number;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [number, setNumber] = useState(props.layout);
  const [from, setFrom] = useState(props.layout);
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<Settings>) => setDraft({ ...draft, ...patch });

  /** The settings to apply: Board Number plays that board, Step From starts from it. */
  const result = (): Settings => {
    const p: Progression = draft.progression;
    const startingBoard =
      p === 'same' ? number : p === 'sequential' ? (from + LAYOUTS - 1) % LAYOUTS : draft.startingBoard;
    return { ...draft, startingBoard };
  };

  const options = (
    <div className="board-options">
      <SkillLevel value={draft.skill} onChange={(skill) => set({ skill })} />
      <div className="choices">
        <Choice
          legend="Who Goes First"
          items={['Player Goes First', 'Computer Goes First']}
          value={draft.playerFirst ? 0 : 1}
          onChange={(i) => set({ playerFirst: i === 0 })}
        />
      </div>
    </div>
  );

  const layout = (
    <div className="layout-tab">
      <fieldset>
        <legend>Board Layout</legend>
        <LayoutChoice
          label="Board ~Number"
          checked={draft.progression === 'same'}
          onCheck={() => set({ progression: 'same' })}
          board={{ value: number, onChange: setNumber }}
        />
        <LayoutChoice
          label="~Random"
          checked={draft.progression === 'random'}
          onCheck={() => set({ progression: 'random' })}
        />
        <LayoutChoice
          label="Step ~From"
          checked={draft.progression === 'sequential'}
          onCheck={() => set({ progression: 'sequential' })}
          board={{ value: from, onChange: setFrom }}
        />
      </fieldset>
      <p>Choose a board (1-35) - Board 1 is blank</p>
    </div>
  );

  const dragging = (
    <fieldset className="dragging">
      <legend>Mouse Dragging</legend>
      <label className="check">
        <input type="radio" name="drag" checked={draft.dragBitmaps} onChange={() => set({ dragBitmaps: true })} />
        <span>
          <Label text="~Drag Pieces" />
        </span>
      </label>
      <label className="check">
        <input type="radio" name="drag" checked={!draft.dragBitmaps} onChange={() => set({ dragBitmaps: false })} />
        <span>
          <Label text="D~rag Outlines" />
        </span>
      </label>
      <label className="check zones">
        <input
          type="checkbox"
          checked={draft.showDragZones}
          onChange={(e) => set({ showDragZones: e.target.checked })}
        />
        <span>
          <Label text="~Show Drag Zones" />
        </span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={draft.showDropZones}
          onChange={(e) => set({ showDropZones: e.target.checked })}
        />
        <span>
          <Label text="S~how Drop Zones" />
        </span>
      </label>
    </fieldset>
  );

  return (
    <>
      <Dialog
        title="Engulf Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: () => (props.inProgress ? setConfirm(true) : props.onOk(result())) },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Layout', content: layout },
            { label: '~Board', content: <BoardTab value={draft.board} onChange={(board) => set({ board })} /> },
            {
              label: '~Pieces',
              content: <PiecesTab value={draft.pieceSet} onChange={(pieceSet) => set({ pieceSet })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: (
                <AnimationTab value={draft.animation} onChange={(animation) => set({ animation })} extra={dragging} />
              ),
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title="Engulf"
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(result())}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}
