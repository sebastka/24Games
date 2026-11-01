// The options tabs common to the card games (FUN_00403df6 Faces, FUN_00403fec Backs in
// pokergrd.exe, and the Animation tab of the games that drag cards).
import { ListBox } from '../Dialog.tsx';
import { Label } from '../Window.tsx';
import { CARD_H, CARD_W } from './cards.ts';
import type { DragOptions } from './drag.ts';
import { BACKS, backsImage, FACE_SETS, faceStrip, type CardLook } from './draw.ts';
import './cards.css';

/** Options › Faces: the face sets, previewed by their jack of clubs. */
export function FacesTab({ value, onChange }: { value: CardLook; onChange: (value: CardLook) => void }) {
  return (
    <div className="card-tab">
      <fieldset>
        <legend>Face Names</legend>
        <ListBox
          label="Face names"
          items={FACE_SETS}
          selected={value.face}
          onSelect={(face) => onChange({ ...value, face })}
          rows={6}
        />
      </fieldset>
      <fieldset>
        <legend>Face Preview</legend>
        <div
          className="card-preview face"
          role="img"
          aria-label={`${FACE_SETS[value.face]} jack of clubs`}
          style={{ backgroundImage: `url(${faceStrip(value.face)})` }}
        />
      </fieldset>
    </div>
  );
}

/** Options › Backs. */
export function BacksTab({ value, onChange }: { value: CardLook; onChange: (value: CardLook) => void }) {
  return (
    <div className="card-tab">
      <fieldset>
        <legend>Card Back Names</legend>
        <ListBox
          label="Card back names"
          items={BACKS}
          selected={value.back}
          onSelect={(back) => onChange({ ...value, back })}
          rows={6}
        />
      </fieldset>
      <fieldset>
        <legend>Card Back Preview</legend>
        <div
          className="card-preview back"
          role="img"
          aria-label={`${BACKS[value.back]} card back`}
          style={{
            backgroundImage: `url(${backsImage})`,
            backgroundPosition: `${-value.back * CARD_W}px 0`,
            width: CARD_W,
            height: CARD_H,
          }}
        />
      </fieldset>
    </div>
  );
}

const PLAIN_LABELS = ['Drag Cards', 'Drag Outlines', 'Show Drag Zones', 'Show Drop Zones'];

/**
 * Options › Animation: how a dragged card looks, and the drag and drop zones' flashing. `labels`
 * are the four controls' texts when a game gives them mnemonics ("~Drag Cards"…).
 */
export function AnimationTab({
  value,
  onChange,
  labels = PLAIN_LABELS,
}: {
  value: DragOptions;
  onChange: (value: DragOptions) => void;
  labels?: readonly string[];
}) {
  const label = (i: number) => (
    <span>
      <Label text={labels[i]!} />
    </span>
  );
  return (
    <div className="card-tab">
      <fieldset className="mouse-dragging">
        <legend>Mouse Dragging</legend>
        <label className="check">
          <input
            type="radio"
            name="drag-mode"
            checked={value.dragCards}
            onChange={() => onChange({ ...value, dragCards: true })}
          />
          {label(0)}
        </label>
        <label className="check">
          <input
            type="radio"
            name="drag-mode"
            checked={!value.dragCards}
            onChange={() => onChange({ ...value, dragCards: false })}
          />
          {label(1)}
        </label>
        <label className="check zones">
          <input
            type="checkbox"
            checked={value.showDragZones}
            onChange={(e) => onChange({ ...value, showDragZones: e.target.checked })}
          />
          {label(2)}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={value.showDropZones}
            onChange={(e) => onChange({ ...value, showDropZones: e.target.checked })}
          />
          {label(3)}
        </label>
      </fieldset>
    </div>
  );
}
