import { Float32BufferAttribute, type BufferGeometry } from 'three';

/** Smooth only the normal attribute. UV/color splits, positions and winding stay exact. */
export function smoothStoneNormals(geometry: BufferGeometry, creaseDegrees = 62): void {
  const p = geometry.getAttribute('position'), original = geometry.getAttribute('normal');
  if (!p || !original) return;
  const keys: string[] = [], faces = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e5)},${Math.round(p.getY(i) * 1e5)},${Math.round(p.getZ(i) * 1e5)}`;
    keys.push(key); if (!faces.has(key)) faces.set(key, []);
  }
  const count = geometry.index?.count ?? p.count;
  for (let i = 0; i < count; i += 3) {
    const a = geometry.index?.getX(i) ?? i, b = geometry.index?.getX(i + 1) ?? i + 1, c = geometry.index?.getX(i + 2) ?? i + 2;
    const ux = p.getX(b) - p.getX(a), uy = p.getY(b) - p.getY(a), uz = p.getZ(b) - p.getZ(a);
    const vx = p.getX(c) - p.getX(a), vy = p.getY(c) - p.getY(a), vz = p.getZ(c) - p.getZ(a);
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, length = Math.hypot(x, y, z);
    if (length < 1e-10) continue;
    for (const vertex of [a, b, c]) faces.get(keys[vertex]!)!.push(x, y, z, length);
  }
  const result = new Float32Array(p.count * 3), threshold = Math.cos(creaseDegrees * Math.PI / 180);
  for (let i = 0; i < p.count; i++) {
    const ox = original.getX(i), oy = original.getY(i), oz = original.getZ(i), ol = Math.hypot(ox, oy, oz) || 1;
    let x = 0, y = 0, z = 0;
    const incident = faces.get(keys[i]!)!;
    for (let j = 0; j < incident.length; j += 4) {
      const nx = incident[j]!, ny = incident[j + 1]!, nz = incident[j + 2]!, length = incident[j + 3]!;
      if ((nx * ox + ny * oy + nz * oz) / (length * ol) < threshold) continue;
      x += nx; y += ny; z += nz;
    }
    let length = Math.hypot(x, y, z);
    if (length < 1e-10) { x = ox; y = oy; z = oz; length = ol; }
    result.set([x / length, y / length, z / length], i * 3);
  }
  geometry.setAttribute('normal', new Float32BufferAttribute(result, 3));
}
