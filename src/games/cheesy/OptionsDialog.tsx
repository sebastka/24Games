import { useEffect, useRef, useState } from 'react';
import mice from '../../assets/cheesy/mice.png';
import { Dialog, ListBox, Notebook } from '../../shell/Dialog.tsx';
import { ExtrasTab } from '../../shell/ExtrasTab.tsx';
import { useImage } from '../../shell/canvas.ts';
import { PlayerKeys } from './common/PlayerKeys.tsx';
import { SIZES } from './logic.ts';
import { MOUSE_NAMES, type Action, type Settings } from './settings.ts';

/** Mouse Preview (FUN_00404320): three rows of four mice, looking left and right in turn. */
function MousePreview({ mouse }: { mouse: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useImage(mice);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, 128, 96);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) ctx.drawImage(image, (mouse * 2 + (x % 2)) * 32, 0, 32, 32, x * 32, y * 32, 32, 32);
    }
  }, [image, mouse]);
  return <canvas ref={canvas} width={128} height={96} className="preview" aria-label="Mouse preview" />;
}

/** The Player Keys, laid out as the original's dialog: up, then left, right and bomb, then down. */
const KEY_ROWS: [Action, string][][] = [
  [['up', 'Mouse Up']],
  [
    ['left', 'Mouse Left'],
    ['right', 'Mouse Right'],
    ['bomb', 'CheeseBomb'],
  ],
  [['down', 'Mouse Down']],
];

/**
 * Game › Options (dialog 256, FUN_00404b10): board size and keys, the mouse, background and
 * sounds. OK during a game first asks whether to restart it.
 */
export function OptionsDialog(props: {
  settings: Settings;
  playing: boolean;
  onOk: (settings: Settings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(props.settings);
  const [confirm, setConfirm] = useState(false);

  const options = (
    <div className="cheesy-options">
      <fieldset className="board-size">
        <legend>Board Size</legend>
        {SIZES.map((s, i) => (
          <label key={s.label} className="check">
            <input
              type="radio"
              name="board-size"
              checked={draft.size === i}
              onChange={() => setDraft({ ...draft, size: i })}
            />
            {s.label}
          </label>
        ))}
      </fieldset>
      <PlayerKeys
        legend="Player Keys"
        rows={KEY_ROWS}
        keys={draft.keys}
        onChange={(keys) => setDraft({ ...draft, keys })}
      />
    </div>
  );

  const pieces = (
    <div className="pieces">
      <fieldset>
        <legend>Mouse Names</legend>
        <ListBox
          label="Mouse names"
          items={MOUSE_NAMES}
          selected={draft.mouse}
          onSelect={(mouse) => setDraft({ ...draft, mouse })}
          rows={6}
        />
      </fieldset>
      <fieldset>
        <legend>Mouse Preview</legend>
        <MousePreview mouse={draft.mouse} />
      </fieldset>
    </div>
  );

  const accept = () => (props.playing ? setConfirm(true) : props.onOk(draft));

  return (
    <>
      <Dialog
        title="Cheesy Pursuit Options"
        className="options"
        buttons={[
          { label: 'OK', primary: true, onClick: accept },
          { label: 'Cancel', cancel: true, onClick: props.onCancel },
        ]}
      >
        <Notebook
          tabs={[
            { label: '~Options', content: options },
            { label: '~Pieces', content: pieces },
            {
              label: '~Extras',
              content: <ExtrasTab value={draft} onChange={(extras) => setDraft({ ...draft, ...extras })} />,
            },
          ]}
        />
      </Dialog>
      {confirm && (
        <Dialog
          title="Cheesy Pursuit"
          buttons={[
            { label: '~Yes', primary: true, onClick: () => props.onOk(draft) },
            { label: '~No', cancel: true, onClick: () => setConfirm(false) },
          ]}
        >
          <p className="message warning">
            Changing the game options will restart the game in progress. Are you sure you want to do this?
          </p>
        </Dialog>
      )}
    </>
  );
}
