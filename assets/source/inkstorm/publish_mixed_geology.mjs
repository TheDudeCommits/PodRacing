/** Restore broad sandstone and publish the preserved round-14 sculpture as accents.
 * No mesh re-authoring, network, browser, or Blender scene mutation is performed.
 * node assets/source/inkstorm/publish_mixed_geology.mjs [--check]
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = path.join(root, 'assets/source/inkstorm');
const publicDir = path.join(root, 'public/assets/inkstorm');
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const validator = require('gltf-validator');
const io = new NodeIO();
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const checkOnly = process.argv.includes('--check');
if (!checkOnly && !process.argv.includes('--restore-round15')) {
  throw new Error('Historical round-15 publisher. Current scanned cliffs use scanned-geology/publish_scanned_geology.mjs. Add --restore-round15 only for an intentional historical rollback.');
}
const definitions = [
  ['canyon-buttress.glb', 'history-round13/canyon-buttress.glb', 'a65200e93cf582925bd4ee496e9a91569152156e59c56a23a157bd8a66b708e2'],
  ['canyon-buttress-lod.glb', 'history-round13/canyon-buttress-lod.glb', 'a358427e62edcfaf1a1e3308b3662ecd9715078c6066717099f9902a3c671e7c'],
  ['fractured-spire.glb', 'history-round14/canyon-buttress.glb', 'e82a86b1e0667dace700cfe5b24d6af8e2dc0ae1b4f6da6160ade168a4df79d7'],
  ['fractured-spire-lod.glb', 'history-round14/canyon-buttress-lod.glb', 'b0203d116d7b3bbf9858a06d0366a90ce08c8aa6b4a2b43ae2167a01df92dccc'],
];
const preserved = [];
for (const [asset, relative, hash] of definitions) {
  const sourcePath = path.join(source, 'geology-revision', relative);
  const bytes = await readFile(sourcePath);
  assert.equal(sha256(bytes), hash, `Preserved source changed: ${relative}`);
  if (checkOnly) assert.equal(sha256(await readFile(path.join(publicDir, asset))), hash, `Published bytes differ: ${asset}`);
  else await writeFile(path.join(publicDir, asset), bytes);
  preserved.push({ asset, sourcePath: path.relative(root, sourcePath), sha256: hash });
}
const assets = [];
for (const asset of (await readdir(publicDir)).filter(name => name.endsWith('.glb')).sort()) {
  const bytes = await readFile(path.join(publicDir, asset));
  const report = await validator.validateBytes(bytes, { uri: asset, maxIssues: 1000 });
  assert.equal(report.issues.numErrors, 0, JSON.stringify(report.issues));
  assert.equal(report.issues.numWarnings, 0, JSON.stringify(report.issues));
  const document = await io.readBinary(bytes), meshes = document.getRoot().listMeshes();
  const primitives = meshes.flatMap(mesh => mesh.listPrimitives());
  const positions = primitives.map(primitive => primitive.getAttribute('POSITION'));
  const min = [0,1,2].map(axis => Math.min(...positions.map(position => position.getMin([])[axis])));
  const max = [0,1,2].map(axis => Math.max(...positions.map(position => position.getMax([])[axis])));
  const triangles = primitives.reduce((sum, primitive) => sum + (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3, 0);
  if (definitions.some(([name]) => name === asset)) {
    assert.equal(meshes.length, 1); assert.equal(primitives.length, 1);
    assert.equal(document.getRoot().listMaterials().length, 1);
    assert.deepEqual(min, [-40,0,-50]); assert.deepEqual(max, [40,120,50]);
    assert(triangles <= (asset.endsWith('-lod.glb') ? 3000 : 8000));
    for (const semantic of ['POSITION','NORMAL','COLOR_0']) {
      const attribute = primitives[0].getAttribute(semantic);
      assert(attribute); assert(Array.from(attribute.getArray()).every(Number.isFinite));
    }
    const normal = primitives[0].getAttribute('NORMAL');
    for (let i=0; i<normal.getCount(); i++) assert(Math.abs(Math.hypot(...normal.getElement(i, [])) - 1) < .001);
  }
  assets.push({ asset, bytes: bytes.length, sha256: sha256(bytes), meshes: meshes.length,
    primitives: primitives.length, materials: document.getRoot().listMaterials().length, triangles,
    bounds: { min, max }, validation: { errors: report.issues.numErrors, warnings: report.issues.numWarnings,
      infos: report.issues.numInfos, hints: report.issues.numHints } });
}
const receipt = { date: '2026-09-07', source: 'Original Blender geometry; no downloaded assets',
  operation: 'Byte-exact restoration of broad round-13 cliffs and preservation of round-14 sculpture under fractured-spire runtime family',
  internalMeshNames: 'The fractured-spire files retain historical canyon-buttress internal mesh/node names to preserve the approved sculpture bytes. Runtime family and asset URL are fractured-spire.',
  placement: 'At most 15 percent of ordinary broad-cliff placements become separate open-ground accents. Canyon, hairpin, start, chicane, fork dividers and citadel remain broad. Accent dimensions never exceed the original placement footprint; selected accents are at least 260 m apart.',
  validation: 'All public Inkstorm GLBs validated with Khronos glTF Validator; four geology assets additionally assert triangle budgets, identical exact bounds, one primitive/material, finite attributes and unit normals.',
  performance: 'Adds one high and one low geometry, with separate instanced material batches. Full runtime performance must be measured on the integrated build.',
  preserved, assets };
if (!checkOnly) await writeFile(path.join(source, 'mixed-geology-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', checkOnly, assets: assets.length, geology: assets.filter(asset => definitions.some(([name]) => name === asset.asset)) }, null, 2));
