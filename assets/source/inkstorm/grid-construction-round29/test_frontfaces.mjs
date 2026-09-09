/** CPU contract tests against actual exported overlay triangles, with FrontSide ray tests. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Ray, Vector3 } from 'three';

const stage = path.dirname(fileURLToPath(import.meta.url));
const dirArg = process.argv.indexOf('--dir');
const directory = dirArg >= 0 ? path.resolve(stage, process.argv[dirArg + 1]) : stage;
const auditOnly = process.argv.includes('--audit-only');
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io = new NodeIO();
const tolerance = 2e-4;
const close = (a, b) => Math.abs(a - b) < tolerance;
const glb = p => new Vector3(p[0], p[2], -p[1]);
const key = p => [p.x, p.y, p.z].map(n => n.toFixed(3)).join(',');

async function triangles(family) {
  const doc = await io.read(path.join(directory, family + '-overlay.glb'));
  const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL');
  const indices = primitive.getIndices().getArray();
  const result = [];
  for (let i = 0; i < indices.length; i += 3) {
    const points = Array.from(indices.subarray(i, i + 3), index => new Vector3(...positions.getElement(index, [])));
    const faceNormal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    const shading = new Vector3();
    for (const index of indices.subarray(i, i + 3)) shading.add(new Vector3(...normals.getElement(index, [])));
    result.push({ points, normal: faceNormal, shading: shading.normalize() });
  }
  return result;
}

function volume(tris, center) {
  return tris.reduce((sum, t) => {
    const [a, b, c] = t.points.map(p => p.clone().sub(center));
    return sum + a.dot(b.cross(c)) / 6;
  }, 0);
}

function directedEdges(tris) {
  const edges = new Map();
  for (const t of tris) for (let i = 0; i < 3; i++) {
    const a = key(t.points[i]), b = key(t.points[(i + 1) % 3]);
    const sorted = [a, b].sort();
    const id = sorted.join('|');
    const previous = edges.get(id) ?? { count: 0, orientation: 0 };
    previous.count++; previous.orientation += a === sorted[0] ? 1 : -1; edges.set(id, previous);
  }
  return [...edges.values()].filter(e => e.count !== 2 || e.orientation !== 0).length;
}

function nearestFrontSideHit(tris, origin, direction) {
  const ray = new Ray(origin, direction), hits = [];
  for (const t of tris) {
    const hit = ray.intersectTriangle(...t.points, true, new Vector3());
    if (hit) hits.push(hit.clone());
  }
  return hits.sort((a, b) => a.distanceTo(origin) - b.distanceTo(origin))[0] ?? null;
}

const gantry = await triangles('foundry-gantry');
const ring = { x: -11, y: -.14, z: 41, outer: 1.24, inner: 1.02, depth: .22, sides: 14 };
const ringCenter = glb([ring.x, ring.y, ring.z]);
const radial = p => Math.hypot(p.x - ringCenter.x, p.y - ringCenter.y);
const ringTriangles = gantry.filter(t => t.points.every(p =>
  (close(radial(p), ring.outer) || close(radial(p), ring.inner)) && close(Math.abs(p.z - ringCenter.z), ring.depth / 2)));
const ringWrong = [];
for (const t of ringTriangles) {
  const center = t.points.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / 3);
  let expected, surface;
  if (t.points.every(p => close(radial(p), ring.outer))) {
    expected = new Vector3(center.x - ringCenter.x, center.y - ringCenter.y, 0).normalize(); surface = 'outer';
  } else if (t.points.every(p => close(radial(p), ring.inner))) {
    expected = new Vector3(ringCenter.x - center.x, ringCenter.y - center.y, 0).normalize(); surface = 'inner';
  } else if (t.points.every(p => close(p.z, ringCenter.z + ring.depth / 2))) {
    expected = new Vector3(0, 0, 1); surface = 'front';
  } else { expected = new Vector3(0, 0, -1); surface = 'back'; }
  if (t.normal.dot(expected) < .98 || t.shading.dot(expected) < .98) ringWrong.push(surface);
}
const ringVolume = volume(ringTriangles, ringCenter);
const expectedRingVolume = ring.sides / 2 * Math.sin(Math.PI * 2 / ring.sides)
  * (ring.outer ** 2 - ring.inner ** 2) * ring.depth;
const annulusX = ringCenter.x + (ring.outer + ring.inner) / 2;
const ringFront = nearestFrontSideHit(ringTriangles, new Vector3(annulusX, ringCenter.y, ringCenter.z + 5), new Vector3(0, 0, -1));
const boreFront = nearestFrontSideHit(ringTriangles, ringCenter.clone().add(new Vector3(0, 0, 5)), new Vector3(0, 0, -1));
const boreBack = nearestFrontSideHit(ringTriangles, ringCenter.clone().add(new Vector3(0, 0, -5)), new Vector3(0, 0, 1));

// A complete left-pit cloth shell, excluding seam tubes and the enclosed predecessor.
const cloth = { x: -48, y: -12.1, w: 33.6, d: 10, h: 16.65, nx: 8, ny: 5 };
const topPoints = [], bottomPoints = [];
for (let j = 0; j <= cloth.ny; j++) for (let i = 0; i <= cloth.nx; i++) {
  const u = i / cloth.nx, v = j / cloth.ny;
  const z = cloth.h - 2.5 * v - 2.2 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + .7 * Math.sin(u * 10) * v;
  topPoints.push(glb([cloth.x + (u - .5) * cloth.w, cloth.y - v * cloth.d, z + .015]));
  bottomPoints.push(glb([cloth.x + (u - .5) * cloth.w, cloth.y - v * cloth.d, z - .015]));
}
const belongs = (p, points) => points.some(q => p.distanceToSquared(q) < tolerance ** 2);
const shellPoints = [...topPoints, ...bottomPoints];
const pit = await triangles('pit-complex');
const clothTriangles = pit.filter(t => t.points.every(p => belongs(p, shellPoints)));
const clothWrong = [];
const topTriangles = [];
for (const t of clothTriangles) {
  let expected, surface;
  if (t.points.every(p => belongs(p, topPoints))) { expected = new Vector3(0, 1, 0); surface = 'top'; topTriangles.push(t); }
  else if (t.points.every(p => belongs(p, bottomPoints))) { expected = new Vector3(0, -1, 0); surface = 'bottom'; }
  else if (t.points.every(p => close(p.x, cloth.x - cloth.w / 2))) { expected = new Vector3(-1, 0, 0); surface = 'left'; }
  else if (t.points.every(p => close(p.x, cloth.x + cloth.w / 2))) { expected = new Vector3(1, 0, 0); surface = 'right'; }
  else if (t.points.every(p => close(p.z, -cloth.y))) { expected = new Vector3(0, 0, -1); surface = 'back'; }
  else { expected = new Vector3(0, 0, 1); surface = 'front'; }
  if (t.normal.dot(expected) < .3 || t.shading.dot(expected) < .3) clothWrong.push(surface);
}
const clothCenter = glb([cloth.x, cloth.y - cloth.d / 2, cloth.h]);
const clothVolume = volume(clothTriangles, clothCenter);
const expectedClothVolume = cloth.w * cloth.d * .03;
const topTarget = topTriangles[30].points.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / 3);
const clothTopHit = nearestFrontSideHit(clothTriangles, topTarget.clone().add(new Vector3(0, 5, 0)), new Vector3(0, -1, 0));
const report = {
  directory: path.relative(stage, directory) || '.',
  overlaySha256s: Object.fromEntries(await Promise.all(['pit-complex','pit-district','foundry-gantry'].map(async family =>
    [family, createHash('sha256').update(await readFile(path.join(directory, family + '-overlay.glb'))).digest('hex')]))),
  ring: { triangles: ringTriangles.length, expectedTriangles: ring.sides * 8, wrongFaces: ringWrong.length,
    wrongSurfaces: [...new Set(ringWrong)], signedVolume: ringVolume, expectedVolume: expectedRingVolume,
    inconsistentDirectedEdges: directedEdges(ringTriangles),
    nearestFrontSideZ: ringFront?.z ?? null, expectedFrontZ: ringCenter.z + ring.depth / 2,
    openBoreBothDirections: !boreFront && !boreBack },
  cloth: { triangles: clothTriangles.length, expectedTriangles: cloth.nx * cloth.ny * 4 + (cloth.nx + cloth.ny) * 4,
    wrongFaces: clothWrong.length, wrongSurfaces: [...new Set(clothWrong)], signedVolume: clothVolume,
    expectedVolume: expectedClothVolume, inconsistentDirectedEdges: directedEdges(clothTriangles),
    nearestFrontSideTopY: clothTopHit?.y ?? null, expectedTopY: topTarget.y },
};
await writeFile(path.join(directory, 'frontface-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!auditOnly) {
  assert.equal(report.ring.triangles, report.ring.expectedTriangles);
  assert.equal(report.ring.wrongFaces, 0);
  assert.equal(report.ring.inconsistentDirectedEdges, 0);
  assert(Math.abs(ringVolume - expectedRingVolume) < .0001);
  assert(ringFront && close(ringFront.z, report.ring.expectedFrontZ));
  assert(report.ring.openBoreBothDirections);
  assert.equal(report.cloth.triangles, report.cloth.expectedTriangles);
  assert.equal(report.cloth.wrongFaces, 0);
  assert.equal(report.cloth.inconsistentDirectedEdges, 0);
  assert(Math.abs(clothVolume - expectedClothVolume) < .001);
  assert(clothTopHit && close(clothTopHit.y, topTarget.y));
  console.log('PASS exported ring outward surfaces/open bore and cloth closed-shell FrontSide tests.');
}
