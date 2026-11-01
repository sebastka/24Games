// Options › Animation of the drag-and-drop games (Pegopolis, Black Box Chess): "Mouse Dragging".
import { Label } from '../../shell/Window.tsx';
import './animation.css';

export interface Animation {
  /** Drag the pieces (DragBitmaps), else their outlines. */
  dragBitmaps: boolean;
  showDragZones: boolean;
  showDropZones: boolean;
}

export function AnimationTab({ value, onChange }: { value: Animation; onChange: (value: Animation) => void }) {
  const check = (label: string, key: 'showDragZones' | 'showDropZones', help: string) => (
    <label className="check" title={help}>
      <input type="checkbox" checked={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.checked })} />
      <span>
        <Label text={label} />
      </span>
    </label>
  );

  return (
    <div className="cz-animation">
      <fieldset>
        <legend>Mouse Dragging</legend>
        <label
          className="radio"
          title="If this radio button is selected, mouse dragging will drag the actual pieces on the board."
        >
          <input
            type="radio"
            name="drag"
            checked={value.dragBitmaps}
            onChange={() => onChange({ ...value, dragBitmaps: true })}
          />
          <span>
            <Label text="~Drag Pieces" />
          </span>
        </label>
        <label
          className="radio"
          title="If this radio button is selected, mouse dragging will not drag the playing piece itself. Rather it will drag an outline of the piece.  This is better for slower systems."
        >
          <input
            type="radio"
            name="drag"
            checked={!value.dragBitmaps}
            onChange={() => onChange({ ...value, dragBitmaps: false })}
          />
          <span>
            <Label text="D~rag Outlines" />
          </span>
        </label>
        <div className="gap" />
        {check(
          '~Show Drag Zones',
          'showDragZones',
          'If this box is checked, the pieces that are available for mouse-dragging will flash when the mouse is moved over them. This is good when you are just learning how to play.',
        )}
        {check(
          'S~how Drop Zones',
          'showDropZones',
          'If this box is checked, the available locations where a piece can be dropped will flash when dragged over. This is good when you are just learning how to play.',
        )}
      </fieldset>
    </div>
  );
}
