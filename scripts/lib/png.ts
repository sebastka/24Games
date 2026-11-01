// Minimal PNG encoder: 8-bit RGBA, or indexed colour when the image has at most 256 distinct
// RGBA values (all the original art does: it is 1- or 4-bit), which keeps the files small.
import { crc32, deflateSync } from 'node:zlib';
import type { Image } from './dib.ts';

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function encodePng({ width, height, rgba }: Image): Uint8Array {
  const colours = new Map<number, number>();
  const view = new DataView(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let i = 0; i < width * height && colours.size <= 256; i++) {
    const c = view.getUint32(i * 4);
    if (!colours.has(c)) colours.set(c, colours.size);
  }
  const indexed = colours.size <= 256;

  const bytesPerPixel = indexed ? 1 : 4;
  const raw = new Uint8Array(height * (1 + width * bytesPerPixel));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * bytesPerPixel); // filter byte 0 (none) first
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (indexed) raw[row + 1 + x] = colours.get(view.getUint32(p))!;
      else raw.set(rgba.subarray(p, p + 4), row + 1 + x * 4);
    }
  }

  const ihdr = new Uint8Array(13);
  const h = new DataView(ihdr.buffer);
  h.setUint32(0, width);
  h.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = indexed ? 3 : 6; // palette or RGBA

  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];
  if (indexed) {
    const plte = new Uint8Array(colours.size * 3);
    const trns = new Uint8Array(colours.size);
    for (const [c, i] of colours) {
      plte.set([c >>> 24, (c >>> 16) & 0xff, (c >>> 8) & 0xff], i * 3);
      trns[i] = c & 0xff;
    }
    parts.push(chunk('PLTE', plte));
    if (trns.some((a) => a !== 255)) parts.push(chunk('tRNS', trns));
  }
  parts.push(chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array()));
  return concat(parts);
}
