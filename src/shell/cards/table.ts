// The window background under the cards (Options › Extras): a StarView colour, or a texture
// tiled from the top left corner of the play field.
import { BACKGROUNDS } from '../backgrounds.ts';
import { useImage } from '../canvas.ts';

/** A 1×1 transparent GIF, for useImage when there is no texture. */
const NONE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/** A function painting background `index` (null until its texture is loaded). */
export function useBackground(index: number): Painter | null {
  const background = BACKGROUNDS[index];
  const texture = useImage(background?.texture ?? NONE);
  if (background?.texture && !texture) return null;
  return (ctx, width, height) => {
    ctx.fillStyle =
      background?.texture && texture ? ctx.createPattern(texture, 'repeat')! : (background?.color ?? '#000000');
    ctx.fillRect(0, 0, width, height);
  };
}
