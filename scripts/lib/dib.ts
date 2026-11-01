// Decoders for Windows device-independent bitmaps, as stored in RT_BITMAP and RT_ICON resources
// (a BITMAPINFOHEADER, a palette, then bottom-up rows padded to 4 bytes).

export interface Image {
  width: number;
  height: number;
  /** Top-down RGBA, 4 bytes per pixel. */
  rgba: Uint8Array;
}

interface Header {
  width: number;
  height: number;
  bitCount: number;
  palette: [number, number, number][];
  pixels: number;
}

function header(dib: Uint8Array): Header {
  const view = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
  const size = view.getUint32(0, true);
  if (size !== 40) throw new Error(`unsupported DIB header size ${size}`);
  const bitCount = view.getUint16(14, true);
  if (view.getUint32(16, true) !== 0) throw new Error('compressed DIBs are not supported');
  const colorsUsed = view.getUint32(32, true);
  const paletteSize = bitCount <= 8 ? colorsUsed || 1 << bitCount : 0;
  const palette: [number, number, number][] = [];
  for (let i = 0; i < paletteSize; i++) {
    const at = size + i * 4;
    palette.push([dib[at + 2]!, dib[at + 1]!, dib[at]!]);
  }
  return {
    width: view.getInt32(4, true),
    height: view.getInt32(8, true),
    bitCount,
    palette,
    pixels: size + paletteSize * 4,
  };
}

const stride = (width: number, bitCount: number): number => Math.ceil((width * bitCount) / 32) * 4;

/** Reads `height` bottom-up rows at `offset` into top-down RGBA (alpha 255). */
function rows(dib: Uint8Array, h: Header, offset: number, height: number, bitCount: number): Image {
  const { width } = h;
  const rgba = new Uint8Array(width * height * 4);
  const rowBytes = stride(width, bitCount);
  for (let y = 0; y < height; y++) {
    const row = offset + (height - 1 - y) * rowBytes;
    for (let x = 0; x < width; x++) {
      let rgb: readonly number[];
      if (bitCount === 24) {
        const p = row + x * 3;
        rgb = [dib[p + 2]!, dib[p + 1]!, dib[p]!];
      } else {
        const bit = x * bitCount;
        const index = (dib[row + (bit >> 3)]! >> (8 - bitCount - (bit & 7))) & ((1 << bitCount) - 1);
        rgb = h.palette[index] ?? [0, 0, 0];
      }
      rgba.set([rgb[0]!, rgb[1]!, rgb[2]!, 255], (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

/** An RT_BITMAP resource (1, 4, 8 or 24 bits per pixel, uncompressed). */
export function decodeBitmap(dib: Uint8Array): Image {
  const h = header(dib);
  if (![1, 4, 8, 24].includes(h.bitCount)) throw new Error(`unsupported bit count ${h.bitCount}`);
  return rows(dib, h, h.pixels, Math.abs(h.height), h.bitCount);
}

/**
 * An RT_ICON resource: a DIB of twice the icon's height, the colour (XOR) image followed by the
 * 1-bit transparency (AND) mask, where 1 means transparent.
 */
export function decodeIcon(dib: Uint8Array): Image {
  const h = header(dib);
  const height = h.height / 2;
  const image = rows(dib, h, h.pixels, height, h.bitCount);
  const maskOffset = h.pixels + stride(h.width, h.bitCount) * height;
  const mask = rows(
    dib,
    {
      ...h,
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ],
    },
    maskOffset,
    height,
    1,
  );
  for (let i = 0; i < h.width * height; i++) {
    if (mask.rgba[i * 4] === 255) image.rgba[i * 4 + 3] = 0;
  }
  return image;
}

/** The `index`-th entry of an RT_GROUP_ICON resource: the id of its RT_ICON. */
export function groupIconId(group: Uint8Array, index = 0): number {
  const view = new DataView(group.buffer, group.byteOffset, group.byteLength);
  const count = view.getUint16(4, true);
  if (index >= count) throw new Error(`icon group has ${count} entries`);
  return view.getUint16(6 + index * 14 + 12, true);
}

/** The `w`×`h` rectangle of `image` at (`x`, `y`). */
export function crop(image: Image, x: number, y: number, w: number, h: number): Image {
  const rgba = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * image.width + x) * 4;
    rgba.set(image.rgba.subarray(from, from + w * 4), row * w * 4);
  }
  return { width: w, height: h, rgba };
}
