/** Match actual exported lens planes and structural contact to shared light anchors. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Ray, Vector3 } from 'three';
const stage = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io = new NodeIO();
const anchorBytes = await readFile(path.join(stage, 'task-light-anchors.json'));
const anchors = JSON.parse(anchorBytes);
const sha = b => createHash('sha256').update(b).digest('hex');

async function triangles(filepath) {
  const doc = await io.read(filepath), p = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const a = p.getAttribute('POSITION'), n = p.getAttribute('NORMAL'), c = p.getAttribute('COLOR_0');
  const indices = p.getIndices().getArray(), result = [];
  for (let i = 0; i < indices.length; i += 3) {
    const points = [], normals = [], colors = [];
    for (const index of indices.subarray(i, i + 3)) {
      points.push(new Vector3(...a.getElement(index, [])));
      normals.push(new Vector3(...n.getElement(index, [])));
      colors.push(c.getElement(index, []));
    }
    result.push({ points, normals, colors });
  }
  return result;
}
const fixtures = [];
for (const family of ['pit-complex', 'pit-district']) {
  const overlay = await triangles(path.join(stage, family + '-overlay.glb'));
  const original = await triangles(path.join(stage, 'predecessors', family + '.glb'));
  for (const fixture of anchors.fixtures.filter(f => f.family === family)) {
    const [x, y, z] = fixture.emitterGLB;
    const faces = overlay.filter(t => t.points.every(p => Math.abs(p.y - y) < 1e-5 && Math.abs(p.x - x) <= 1.05001 && Math.abs(p.z - z) <= .34001));
    assert.equal(faces.length, 2, fixture.id + ': exactly two lens underside triangles');
    let area = 0;
    for (const face of faces) {
      const normal = face.points[1].clone().sub(face.points[0]).cross(face.points[2].clone().sub(face.points[0]));
      area += normal.length() / 2;
      assert(normal.normalize().y < -.999, fixture.id + ': outward downward winding');
      assert(face.normals.every(n => n.y < -.999), fixture.id + ': downward exported normals');
      assert(face.colors.every(c => Math.abs(c[0] - 1) < 1e-5 && Math.abs(c[1] - .61) < 1e-5 && Math.abs(c[2] - .16) < 1e-5));
    }
    assert(Math.abs(area - 2.1 * .68) < 1e-5, fixture.id + ': complete emitting area');
    const ray = new Ray(new Vector3(x, y, z), new Vector3(0, 1, 0));
    const hits = original.map(t => ray.intersectTriangle(...t.points, true, new Vector3())).filter(Boolean).sort((a, b) => a.y - b.y);
    assert(hits.length > 0, fixture.id + ': existing beam above fixture');
    const supportY = hits[0].y;
    assert(supportY >= y + .04 && supportY <= y + .36, fixture.id + ': body intersects existing beam underside');
    fixtures.push({ id: fixture.id, family, emitterGLB: fixture.emitterGLB, undersideTriangles: faces.length,
      emittingArea: area, downwardNormals: true, beamUndersideGLBY: supportY,
      bodyTopGLBY: y + .36, beamBodyVerticalOverlap: y + .36 - supportY });
  }
}
const report = { status: 'PASS exact exported lens planes/normals/areas and existing-crossbeam body contacts',
  sharedAnchorSha256: sha(anchorBytes), fixtures,
  limitation: 'This is emitter geometry/contact validation, not a light-occlusion or visual acceptance test.' };
await writeFile(path.join(stage, 'task-fixture-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
