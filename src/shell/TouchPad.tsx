export type PadDirection = 'up' | 'down' | 'left' | 'right';

/**
 * On-screen arrows for touch screens (shown on coarse pointers only), with optional buttons on
 * each side (Undo, Restart, Fire…). `onPress` fires on pointer down, for arcade games;
 * `onRelease` when the finger lifts.
 */
export function TouchPad(props: {
  onPress: (direction: PadDirection) => void;
  onRelease?: (direction: PadDirection) => void;
  left?: { label: string; onClick: () => void; disabled?: boolean };
  right?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const arrow = (direction: PadDirection, glyph: string) => (
    <button
      type="button"
      aria-label={direction[0]!.toUpperCase() + direction.slice(1)}
      className={direction}
      onPointerDown={(e) => {
        e.preventDefault();
        props.onPress(direction);
      }}
      onPointerUp={() => props.onRelease?.(direction)}
      onPointerLeave={() => props.onRelease?.(direction)}
    >
      {glyph}
    </button>
  );
  const side = (b: typeof props.left) =>
    b ? (
      <button type="button" onClick={b.onClick} disabled={b.disabled}>
        {b.label}
      </button>
    ) : (
      <span />
    );
  return (
    <div className="touch-controls">
      {side(props.left)}
      <div className="dpad">
        {arrow('up', '▲')}
        {arrow('left', '◀')}
        {arrow('right', '▶')}
        {arrow('down', '▼')}
      </div>
      {side(props.right)}
    </div>
  );
}
