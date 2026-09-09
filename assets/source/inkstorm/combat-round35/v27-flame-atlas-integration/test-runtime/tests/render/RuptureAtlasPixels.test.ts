import { describe, expect, it } from 'vitest';
import { RUPTURE_FLAME_ATLAS } from '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v27-flame-atlas-integration/test-runtime/src/render/galactic/RuptureFlameAtlas.ts';

const fileModule: string = 'node:fs', cryptoModule: string = 'node:crypto', zlibModule: string = 'node:zlib', bufferModule: string = 'node:buffer';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const { createHash } = await import(/* @vite-ignore */ cryptoModule);
const { inflateSync } = await import(/* @vite-ignore */ zlibModule);
const { Buffer } = await import(/* @vite-ignore */ bufferModule);

/** Test-only RGBA8 PNG decoding. Reads the actual immutable asset, writes no image. */
function decodeSource() {
  const file = readFileSync('assets/source/inkstorm/combat-round35/v27-flame-atlas-candidate/flame-atlas-raw-v1.png');
  expect(createHash('sha256').update(file).digest('hex')).toBe(RUPTURE_FLAME_ATLAS.sha256);
  expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(file.readUInt32BE(16)).toBe(1254); expect(file.readUInt32BE(20)).toBe(1254);
  expect([...file.subarray(24, 29)]).toEqual([8, 6, 0, 0, 0]); // RGBA8, no interlace
  const chunks: Uint8Array[] = [];
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(file.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const scan = inflateSync(Buffer.concat(chunks)), width = 1254, stride = width * 4;
  expect(scan.length).toBe((stride + 1) * 1254);
  const rgba = new Uint8Array(stride * 1254);
  for (let y = 0; y < 1254; y++) {
    const filter = scan[y * (stride + 1)]!; if (filter > 4) throw new Error('Unexpected PNG filter');
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[y * stride + x - 4]! : 0;
      const b = y ? rgba[(y - 1) * stride + x]! : 0;
      const c = y && x >= 4 ? rgba[(y - 1) * stride + x - 4]! : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      if (filter === 2) predictor = b;
      if (filter === 3) predictor = Math.floor((a + b) / 2);
      if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rgba[y * stride + x] = (scan[y * (stride + 1) + 1 + x]! + predictor) & 255;
    }
  }
  return rgba;
}

describe('actual generated PNG sampling authority', () => {
  it('isolates every meaningful alpha pixel, preserves hot witnesses and fits all artwork within existing hot plate/ground envelopes', () => {
    const rgba = decodeSource(), frames = RUPTURE_FLAME_ATLAS.frames;
    const counts = [0, 0, 0, 0], extrema = frames.map(() => ({ x: 0, y: 0, radius: 0, borderAlpha: 0 }));
    let outside = 0, overlaps = 0, imageBorder = 0;
    for (let y = 0; y < 1254; y++) for (let x = 0; x < 1254; x++) {
      const alpha = rgba[(y * 1254 + x) * 4 + 3]!;
      if (!x || !y || x === 1253 || y === 1253) imageBorder = Math.max(imageBorder, alpha);
      let owners = 0;
      for (let i = 0; i < frames.length; i++) {
        const f = frames[i]!, [x0, y0, x1, y1] = f.rect;
        if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
        const e = extrema[i]!;
        if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) e.borderAlpha = Math.max(e.borderAlpha, alpha);
        if (alpha <= 2) continue; // 2/255 < existing shader discard .008
        owners++; counts[i]!++;
        const dx = Math.abs(x - f.root[0]), dy = Math.abs(y - f.root[1]);
        e.x = Math.max(e.x, dx); e.y = Math.max(e.y, dy); e.radius = Math.max(e.radius, Math.hypot(dx, dy));
      }
      if (alpha > 2 && !owners) outside++;
      if (owners > 1) overlaps++;
    }
    expect(outside).toBe(0); expect(overlaps).toBe(0); expect(imageBorder).toBe(0);
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]!, e = extrema[i]!, at = (f.root[1] * 1254 + f.root[0]) * 4;
      expect(counts[i]).toBeGreaterThan(1000); expect(rgba[at + 3]).toBeGreaterThan(200);
      expect(rgba[at]).toBeGreaterThan(240); expect(rgba[at + 1]).toBeGreaterThan(210);
      expect(e.borderAlpha).toBeLessThanOrEqual(2);
      // Ratios cancel severity; this checks the smallest existing pulsing plate.
      const halfX = (i === 0 ? 3.6 * .78 : 2.45 * .85) * 240;
      const halfY = halfX * (i === 0 ? .82 : .70);
      expect(e.x).toBeLessThan(halfX - 1); expect(e.y).toBeLessThan(halfY - 1);
      // Existing source-ground hot-volume clearance .64*3.6 per severity.
      expect(e.radius / 240).toBeLessThan(3.6 * .64);
    }
  });
});
