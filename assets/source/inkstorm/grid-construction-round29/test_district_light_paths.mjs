/** CPU ray test: rejected above-awning emitters vs supported below-awning emitters. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Ray, Vector3 } from 'three';
const stage = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io = new NodeIO(), variants = [];
const glb = ([x, y, z]) => new Vector3(x, z, -y);
for (const [name, directory] of [['rejected-v2', path.join(stage, 'versions/v2-blocked-fixtures')], ['current-v4', stage]]) {
  const bytes = await readFile(path.join(directory, 'candidates/pit-district.glb'));
  const anchors = JSON.parse(await readFile(path.join(directory, 'task-light-anchors.json'), 'utf8'));
  const doc = await io.readBinary(bytes), p = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const positions = p.getAttribute('POSITION'), indices = p.getIndices().getArray(), triangles = [];
  for (let i = 0; i < indices.length; i += 3) triangles.push([0, 1, 2].map(k => new Vector3(...positions.getElement(indices[i + k], []))));
  const paths = [];
  for (const [bay, [x, back]] of [[-39, 13], [-2, 17], [38, 10]].entries()) {
    const fixture = anchors.fixtures.filter(f => f.family === 'pit-district')[bay];
    for (const [targetName, target] of [['above-engine', [x - 1, back - 7, 4.6]], ['above-bench', [x + 2, back - 3, 2.65]], ['work-aisle', [x + 6, back - 9, 1.2]]]) {
      const origin = new Vector3(...fixture.emitterGLB), end = glb(target), length = origin.distanceTo(end);
      const ray = new Ray(origin, end.clone().sub(origin).normalize()), hits = [];
      for (const triangle of triangles) {
        const hit = ray.intersectTriangle(...triangle, true, new Vector3());
        if (hit && origin.distanceTo(hit) > .012 && origin.distanceTo(hit) < length - .02) hits.push(hit.clone());
      }
      hits.sort((a, b) => a.distanceTo(origin) - b.distanceTo(origin));
      paths.push({ fixture: fixture.id, target: targetName, clear: hits.length === 0, nearestHitGLB: hits[0]?.toArray() ?? null });
    }
  }
  const clear = paths.filter(p => p.clear).length;
  assert.equal(clear, name === 'current-v4' ? 9 : 0, name + ': engine/bench/aisle paths');
  variants.push({ name, candidateSha256: createHash('sha256').update(bytes).digest('hex'), clearPaths: clear, totalPaths: paths.length, paths });
}
const report = { status: 'PASS: all 9 rejected anchor paths hit opaque geometry; all 9 corrected anchor paths are clear',
  method: 'Actual final candidate triangles, FrontSide segment rays; skip self intersection within 12mm',
  limitation: 'Selected source-to-work-area paths only; this does not establish shadows/occlusion for every receiver or visual acceptance.', variants };
await writeFile(path.join(stage, 'district-light-paths-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, variants: variants.map(({ paths, ...summary }) => summary) }, null, 2));
