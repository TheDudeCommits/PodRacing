import { BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A through-bore pipe union, aligned to local Y. All surfaces are explicit;
 * a closed cylinder across the mouth would read as a solid black stop plate. */
export function createInkstormPipeJoint(radius: number): BufferGeometry {
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('Invalid pressure-pipe radius.');
  const parts: BufferGeometry[] = [];
  const segments = 16, inner = radius * .98, outer = radius + Math.max(.55, radius * .24);
  const paint = (geometry: BufferGeometry, hex: string): void => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.deleteAttribute('uv'); flat.clearGroups();
    const colors = new Float32Array(flat.getAttribute('position').count * 3), color = new Color(hex);
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
    flat.setAttribute('color', new Float32BufferAttribute(colors, 3)); parts.push(flat);
  };
  const annulus = (low: number, high: number, outside: number, color: string): void => {
    const positions: number[] = [], faces: number[] = [];
    for (const y of [low, high]) for (const r of [inner, outside]) for (let i = 0; i < segments; i++) {
      const angle = i * Math.PI * 2 / segments;
      positions.push(r * Math.cos(angle), y, r * Math.sin(angle));
    }
    for (let i = 0; i < segments; i++) {
      const n = (i + 1) % segments;
      const a = i, b = n, c = segments + i, d = segments + n;
      const e = 2 * segments + i, f = 2 * segments + n, g = 3 * segments + i, h = 3 * segments + n;
      // lower ring, upper ring, outside, bore. Counter-clockwise from outside.
      faces.push(a,c,b, b,c,d, e,f,g, f,h,g, c,g,d, d,g,h, a,b,e, b,f,e);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(faces);
    const flat = geometry.toNonIndexed(); geometry.dispose(); flat.computeVertexNormals();
    paint(flat, color);
  };
  annulus(-.62, -.14, outer, '#647882');
  annulus(.14, .62, outer, '#647882');
  annulus(-.14, .14, outer - .14, '#363747');
  const boltCircle = (inner + outer) / 2, boltRadius = Math.min(.17, (outer - inner) * .24);
  for (let i = 0; i < 8; i++) {
    const angle = (i + .5) * Math.PI / 4;
    const bolt = new CylinderGeometry(boltRadius, boltRadius, 1.48, 6);
    bolt.translate(Math.cos(angle) * boltCircle, 0, Math.sin(angle) * boltCircle);
    paint(bolt, '#c2af91');
  }
  const merged = mergeGeometries(parts, false); parts.forEach(p => p.dispose());
  if (!merged) throw new Error('Could not merge the pressure-pipe union.');
  merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}
