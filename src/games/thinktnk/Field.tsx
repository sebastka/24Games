import { useEffect, useRef } from 'react';
import bulletPng from '../../assets/thinktnk/bullet.png';
import enemyPng from '../../assets/thinktnk/enemy.png';
import explodePng from '../../assets/thinktnk/explode.png';
import logoPng from '../../assets/thinktnk/logo.png';
import pelletsPng from '../../assets/thinktnk/pellets.png';
import playerPng from '../../assets/thinktnk/player.png';
import wallsPng from '../../assets/thinktnk/walls.png';
import { BACKGROUNDS } from '../../shell/backgrounds.ts';
import { fillBackground, useFitScale, useImages } from '../../shell/canvas.ts';
import { bevel } from '../../shell/czgame/draw.ts';
import { coarsePointer } from '../../shell/loop.ts';
import { BULLET, FIELD, frameOf, LANE, PELLET, TANK, type Direction, type State } from './logic.ts';

/** The window's client area (its resource: 512×378): the field, then the panels. */
export const WIDTH = 512;
export const HEIGHT = 378;

/** The four panels (FUN_0040a9a0…): a raised box, its title, its number. */
const PANELS = [
  { label: 'Score', top: 65 },
  { label: 'Tanks', top: 145 },
  { label: 'Level', top: 225 },
  { label: 'Time Bonus', top: 305 },
] as const;

const NAVY = '#000080';

/**
 * The play field as the original draws it: the blocks and pellets on black, the bullets, the
 * tanks, an explosion; on the right, the window background with the logo and the panels.
 * Swipes turn the tank, a tap (by touch) fires.
 */
export function Field(props: { state: State; background: number; onTurn: (d: Direction) => void; onFire: () => void }) {
  const { state } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const texture = BACKGROUNDS[props.background]?.texture;
  const sources = [wallsPng, pelletsPng, bulletPng, playerPng, enemyPng, explodePng, logoPng];
  const images = useImages(texture ? [...sources, texture] : sources);
  const scale = useFitScale(box, WIDTH, HEIGHT, coarsePointer() ? 260 : 80);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !images) return;
    const [walls, pellets, bullet, player, enemy, explode, logo, textureImg] = images as [
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement,
      HTMLImageElement | undefined,
    ];
    fillBackground(ctx, props.background, textureImg ?? null, WIDTH, HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, FIELD, FIELD);
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const look = state.walls[i * 10 + j] ?? 0;
        ctx.drawImage(walls, look * TANK, 0, TANK, TANK, TANK + LANE * i, TANK + LANE * j, TANK, TANK);
      }
    }
    for (const item of state.items) {
      if (item) ctx.drawImage(pellets, item.type * PELLET, 0, PELLET, PELLET, item.x + 3, item.y + 3, PELLET, PELLET);
    }
    for (const b of state.bullets) if (b) ctx.drawImage(bullet, b.x, b.y, BULLET, BULLET);
    const tank = (img: HTMLImageElement, t: { x: number; y: number; vx: number; vy: number }) =>
      ctx.drawImage(img, frameOf(t) * TANK, 0, TANK, TANK, t.x, t.y, TANK, TANK);
    if (!state.dead) tank(player, state.player);
    for (const e of state.enemies) if (e) tank(enemy, e);
    const ex = state.explosion;
    if (ex && ex.counter > 0) ctx.drawImage(explode, (ex.counter - 1) * 32, 0, 32, 32, ex.x, ex.y, 32, 32);

    ctx.drawImage(logo, 382, 4);
    const numbers = [state.score, state.tanks, state.level, state.timeBonus];
    PANELS.forEach((p, i) => {
      bevel(ctx, { left: 385, top: p.top, right: 508, bottom: p.top + 70 }, 2);
      ctx.fillStyle = NAVY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px Arial, Helvetica, sans-serif';
      ctx.fillText(p.label, 446.5, p.top + 11);
      ctx.font = '900 30px "Arial Black", Arial, Helvetica, sans-serif';
      ctx.fillText(String(numbers[i]), 446.5, p.top + 45);
    });
  }, [state, images, props.background]);

  return (
    <div className="field" ref={box}>
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH * scale, height: HEIGHT * scale }}
        aria-label="Play field"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from) return;
          const dx = e.clientX - from.x;
          const dy = e.clientY - from.y;
          // A tap fires on a touch screen; the original ignores (beeps at) mouse clicks.
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
            if (e.pointerType !== 'mouse') props.onFire();
          } else if (Math.abs(dx) > Math.abs(dy)) props.onTurn(dx > 0 ? 'right' : 'left');
          else props.onTurn(dy > 0 ? 'down' : 'up');
        }}
      />
    </div>
  );
}
