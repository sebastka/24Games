import { useEffect, useRef, type ReactNode } from 'react';
import cat from '../../assets/cheesy/cat.png';
import mice from '../../assets/cheesy/mice.png';
import { useImage } from '../../shell/canvas.ts';
import { Dialog } from '../../shell/Dialog.tsx';

/** A control of the original dialog, at its position and size. */
const at = (x: number, y: number, w: number, h: number) => ({ left: x, top: y, width: w, height: h });

/**
 * A dialog body framed with sprites, as these dialogs paint themselves (FUN_00405210,
 * FUN_00405460): a row along the top and the bottom, two columns on each side; the controls at
 * their places of the dialog resource, the OK button included.
 */
function Framed(props: {
  title: string;
  width: number;
  height: number;
  sprite: string;
  size: number;
  sx: number;
  ok: { x: number; y: number };
  onOk: () => void;
  children: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useImage(props.sprite);
  const { width, height, size, sx } = props;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, width, height);
    const draw = (x: number, y: number) => ctx.drawImage(image, sx, 0, size, size, x, y, size, size);
    for (let x = 0; x < width; x += size) {
      draw(x, 0);
      draw(x, height - size);
    }
    for (let y = 0; y < height; y += size) {
      draw(0, y);
      draw(size, y);
      draw(width - size, y);
      draw(width - 2 * size, y);
    }
  }, [image, width, height, size, sx]);
  return (
    <Dialog
      title={props.title}
      className="framed-dialog"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <div className="frame" style={{ width, height }}>
        <canvas ref={canvas} width={width} height={height} aria-hidden="true" />
        {props.children}
        <button type="button" className="primary" style={at(props.ok.x, props.ok.y, 70, 23)} onClick={props.onOk}>
          OK
        </button>
      </div>
    </Dialog>
  );
}

/** Dialog 257 after the last cheddar slice, framed with the player's mouse. */
export function LevelDialog(props: { title: string; level: number; mouse: number; onOk: () => void }) {
  return (
    <Framed
      title={props.title}
      width={320}
      height={192}
      sprite={mice}
      size={32}
      sx={props.mouse * 64}
      ok={{ x: 125, y: 118 }}
      onOk={props.onOk}
    >
      <span style={at(72, 50, 135, 19)}>You Completed Level:</span>
      <span style={at(207, 50, 40, 19)}>{props.level}</span>
      <span style={at(72, 80, 135, 19)}>Prepare For Level:</span>
      <span style={at(207, 80, 40, 19)}>{props.level + 1}</span>
    </Framed>
  );
}

/** Dialog 258 when a cat gets the mouse and mice are left, framed with cats. */
export function GotchaDialog(props: { title: string; mice: number; onOk: () => void }) {
  return (
    <Framed
      title={props.title}
      width={324}
      height={216}
      sprite={cat}
      size={36}
      sx={0}
      ok={{ x: 127, y: 126 }}
      onOk={props.onOk}
    >
      <span className="gotcha" style={at(80, 43, 165, 30)}>
        GOTCHA!
      </span>
      <span style={at(87, 86, 110, 19)}>Mice Remaining:</span>
      <span style={at(197, 86, 40, 19)}>{props.mice}</span>
    </Framed>
  );
}
