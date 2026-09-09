import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute,
  IcosahedronGeometry, LatheGeometry, Vector2,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared hardware is deeper for salvage; mines retain their former ±.21m slab. */
export const SOLID_HARDWARE_MINE_DEPTH_SCALE = .44;
/** Every grounded chunk starts at this local plane before instance scaling. */
export const SOLID_RUBBLE_BASE_Y = -.4;

export function createSolidHardwareGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const add = (source: BufferGeometry, surface: number, signal = 0): void => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.clearGroups(); geometry.deleteAttribute('uv');
    geometry.computeVertexNormals();
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('aHardwareSignal', new Float32BufferAttribute(new Float32Array(count).fill(signal), 1));
    geometry.setAttribute('aHardwareSurface', new Float32BufferAttribute(new Float32Array(count).fill(surface), 1));
    parts.push(geometry);
  };
  const profile = (points: readonly (readonly [number, number])[]): LatheGeometry =>
    new LatheGeometry(points.map(([radius, y]) => new Vector2(radius, y)), 8);

  // A closed back, thick angular sidewall, and open front lip surround a
  // physically recessed receiver. No closed front cap hides the recess.
  add(profile([[.62, -.44], [.82, -.31], [.88, -.10], [.86, .25], [.76, .48]]), 0);
  add(new CylinderGeometry(.62, .62, .06, 8).translate(0, -.44, 0), 0);
  add(profile([[.76, .48], [.63, .48], [.56, .31], [.56, .14]]), 1);
  add(new CylinderGeometry(.56, .56, .08, 8).translate(0, .10, 0), 2);
  add(new BoxGeometry(2.1, .22, .24).translate(0, -.17, 0), 0);
  add(new BoxGeometry(.24, .22, 2.1).translate(0, -.17, 0), 0);
  // Raised receiver ribs make the dark front legible when its signal is off.
  add(new BoxGeometry(.20, .08, .68).translate(0, .18, 0), 1);
  add(new BoxGeometry(.68, .08, .13).translate(0, .18, .13), 1);
  // Only these inset bars carry pickup/armed-state color; the full rim is metal.
  for (const x of [-.32, .32]) add(new BoxGeometry(.12, .055, .38).translate(x, .19, -.015), 2, 1);
  add(new BoxGeometry(.28, .055, .075).translate(0, .19, -.34), 2, 1);

  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error('Unable to build solid salvage hardware.');
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function createSolidRubbleGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  // Five closed 20-face chunks retain the old low triangle budget. Broad,
  // overlapping masses share a base instead of forming vertically spaced chips.
  const chunks = [
    [-.22, .08, .36, .18, .11],
    [.24, -.16, .31, -.26, .61],
    [.12, .28, .26, .41, -.38],
    [-.32, -.22, .19, -.23, .82],
    [.34, .19, .18, .57, .24],
  ] as const;
  for (const [index, [x, z, radius, pitch, yaw]] of chunks.entries()) {
    const source = new IcosahedronGeometry(radius, 0);
    const rock = source.index ? source.toNonIndexed() : source.clone();
    source.dispose(); rock.deleteAttribute('uv'); rock.clearGroups();
    const position = rock.getAttribute('position');
    for (let vertex = 0; vertex < position.count; vertex++) {
      const px = position.getX(vertex), py = position.getY(vertex), pz = position.getZ(vertex);
      // Coordinate-derived deformation gives duplicated face vertices exactly
      // the same new position, preserving the closed shell without welding.
      const wear = .9 + .06 * Math.sin(px * 11 + py * 7 - pz * 9 + index * 2.1);
      position.setXYZ(vertex, (px * .96 + py * .10) * wear, py * wear, (pz * .94 - py * .06) * wear);
    }
    rock.rotateX(pitch).rotateY(yaw);
    rock.computeBoundingBox();
    rock.translate(x, SOLID_RUBBLE_BASE_Y - rock.boundingBox!.min.y, z);
    rock.computeVertexNormals();
    const facet = new Float32Array(position.count);
    for (let face = 0; face < position.count; face += 3) {
      const value = .9 + .14 * (.5 + .5 * Math.sin(face * 1.31 + index * 2.7));
      facet.fill(value, face, face + 3);
    }
    rock.setAttribute('aSolidFacet', new Float32BufferAttribute(facet, 1));
    parts.push(rock);
  }
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error('Unable to build solid hazard rubble.');
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
