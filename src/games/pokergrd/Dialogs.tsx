import { useState } from 'react';
import { CONFIRM_OPTIONS, ConfirmBox } from '../../shell/Boxes.tsx';
import { AnimationTab, BacksTab, FacesTab } from '../../shell/cards/OptionsTabs.tsx';
import { HAND_NAMES } from '../../shell/cards/poker.ts';
import { Dialog, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { Label } from '../../shell/Window.tsx';
import type { LineScore } from './logic.ts';
import { TITLE, type Settings } from './settings.ts';

/** The four ways to draw (pokergrd.exe's options dialog, radio buttons 1-4). */
const VARIANTS = [
  { label: '~One Face Down Pile', twoPiles: false, faceUp: false },
  { label: '~Two Face Down Piles', twoPiles: true, faceUp: false },
  { label: 'One Face ~Up Pile', twoPiles: false, faceUp: true },
  { label: 'Two Face U~p Piles', twoPiles: true, faceUp: true },
];

/** Game › Options: OK restarts the game, after a confirmation if one is in progress. */
export function OptionsDialog(props: {
  settings: Settings;
  inProgress: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="card-tab">
      <fieldset className="game-options">
        <legend>Game Options</legend>
        {VARIANTS.map((v) => (
          <label key={v.label} className="check">
            <input
              type="radio"
              name="variant"
              checked={draft.twoPiles === v.twoPiles && draft.faceUp === v.faceUp}
              onChange={() => setDraft({ ...draft, twoPiles: v.twoPiles, faceUp: v.faceUp })}
            />
            <span>
              <Label text={v.label} />
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );

  return (
    <>
      <Dialog
        title={`${TITLE} Options`}
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
              label: '~Faces',
              content: <FacesTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Backs',
              content: <BacksTab value={draft} onChange={(look) => setDraft({ ...draft, ...look })} />,
            },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
            {
              label: '~Animation',
              content: <AnimationTab value={draft} onChange={(drag) => setDraft({ ...draft, ...drag })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <ConfirmBox
          title={TITLE}
          text={CONFIRM_OPTIONS}
          onYes={() => props.onOk(draft)}
          onNo={() => setConfirm(false)}
        />
      )}
    </>
  );
}

/** "Your Score" (pokergrd.exe dialog 257, filled by FUN_00405bfd): each row's and column's hand. */
export function ScoreDialog(props: { rows: LineScore[]; columns: LineScore[]; total: number; onOk: () => void }) {
  const table = (title: string, first: string, lines: LineScore[]) => (
    <fieldset>
      <legend>{title}</legend>
      <table>
        <thead>
          <tr>
            <th>{first}</th>
            <th>Hand</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                <span>{i + 1}</span>
              </td>
              <td>
                <span>{HAND_NAMES[l.hand]}</span>
              </td>
              <td>
                <span>{l.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </fieldset>
  );
  return (
    <Dialog
      title="Your Score"
      className="your-score"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <div className="scores">
        {table('Row Scores', 'Row', props.rows)}
        {table('Column Score', 'Col', props.columns)}
      </div>
      <p className="total">Total Score = {props.total}</p>
    </Dialog>
  );
}
