import { useEffect, useRef } from 'react';
import hector from '../../assets/maze/hector.png';
import nestor from '../../assets/maze/nestor.png';
import { useImage } from '../../shell/canvas.ts';
import { Dialog } from '../../shell/Dialog.tsx';

const W = 319;
const H = 186;
const at = (x: number, y: number, w: number, h: number) => ({ left: x, top: y, width: w, height: h });

/**
 * Dialog 258 when a mouse reaches the cheese (FUN_00401000), framed with the winner
 * (FUN_00404e60: rows of 29×31 mice along the top and bottom, two columns on each side), with
 * both mice's wins.
 */
export function WinDialog(props: { title: string; winner: 0 | 1; wins: readonly [number, number]; onOk: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useImage(props.winner === 0 ? hector : nestor);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += 29) {
      ctx.drawImage(image, x, 0);
      ctx.drawImage(image, x, H - 31);
    }
    for (let y = 0; y < H; y += 31) {
      for (const x of [0, 29, W - 29, W - 58]) ctx.drawImage(image, x, y);
    }
  }, [image]);
  return (
    <Dialog
      title={props.title}
      className="framed-dialog"
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onOk }]}
    >
      <div className="frame" style={{ width: W, height: H }}>
        <canvas ref={canvas} width={W} height={H} aria-hidden="true" />
        <span style={at(82, 50, 115, 19)}>White Mouse Wins:</span>
        <span style={at(197, 50, 40, 19)}>{props.wins[0]}</span>
        <span style={at(82, 80, 115, 19)}>Brown Mouse Wins:</span>
        <span style={at(197, 80, 40, 19)}>{props.wins[1]}</span>
        <button type="button" className="primary" style={at(125, 110, 70, 23)} onClick={props.onOk}>
          OK
        </button>
      </div>
    </Dialog>
  );
}
