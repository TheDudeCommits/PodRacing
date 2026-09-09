/** CPU-only candidate packaging. Never writes public/runtime assets. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, '../../../..');
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const { NodeIO } = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const { dedup, prune } = await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const validator = require('gltf-validator');
const io = new NodeIO();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const frozen = JSON.parse(await readFile(path.join(stage, 'frozen-asset-audit.json'), 'utf8'));
const frontfaces = JSON.parse(await readFile(path.join(stage, 'frontface-audit.json'), 'utf8'));
const fixtures = JSON.parse(await readFile(path.join(stage, 'task-fixture-audit.json'), 'utf8'));
const anchorBytes = await readFile(path.join(stage, 'task-light-anchors.json'));
assert.equal(frontfaces.ring.wrongFaces, 0); assert.equal(frontfaces.cloth.wrongFaces, 0);
assert.equal(frontfaces.ring.inconsistentDirectedEdges, 0); assert.equal(frontfaces.cloth.inconsistentDirectedEdges, 0);
assert.equal(frontfaces.ring.openBoreBothDirections, true);
assert.equal(fixtures.sharedAnchorSha256, sha(anchorBytes));
assert.equal(fixtures.fixtures.length, 6);
const caps = { 'pit-complex': 13500, 'pit-district': 17500, 'foundry-gantry': 6500 };
const counts = { 'pit-complex': 3, 'pit-district': 4, 'foundry-gantry': 2 };
await mkdir(path.join(stage, 'candidates'), { recursive: true });

function onePrimitive(doc) {
  const r = doc.getRoot();
  assert.equal(r.listMeshes().length, 1);
  assert.equal(r.listNodes().length, 1);
  assert.equal(r.listScenes().length, 1);
  assert.equal(r.listMaterials().length, 1);
  assert.equal(r.listTextures().length, 0);
  assert.equal(r.listMeshes()[0].listPrimitives().length, 1);
  assert.deepEqual(r.listNodes()[0].getMatrix(), [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  return r.listMeshes()[0].listPrimitives()[0];
}

function snapshot(primitive) {
  return {
    indices: primitive.getIndices().getArray().slice(),
    attributes: Object.fromEntries(primitive.listSemantics().map(semantic => {
      const a = primitive.getAttribute(semantic);
      return [semantic, { array: a.getArray().slice(), type: a.getType(),
        normalized: a.getNormalized(), componentType: a.getComponentType() }];
    })),
  };
}

function assertPrefixPreserved(primitive, source) {
  const indices = primitive.getIndices().getArray();
  assert.deepEqual(Array.from(indices.subarray(0, source.indices.length)), Array.from(source.indices));
  for (const [semantic, expected] of Object.entries(source.attributes)) {
    const a = primitive.getAttribute(semantic);
    assert.equal(a.getType(), expected.type);
    assert.equal(a.getNormalized(), expected.normalized);
    assert.equal(a.getComponentType(), expected.componentType);
    assert.equal(sha(Buffer.from(a.getArray().buffer, a.getArray().byteOffset, expected.array.byteLength)),
      sha(Buffer.from(expected.array.buffer, expected.array.byteOffset, expected.array.byteLength)));
  }
}

const assets = [];
for (const family of Object.keys(caps)) {
  const oldBytes = await readFile(path.join(stage, 'predecessors', family + '.glb'));
  const publicPath = path.join(root, 'public/assets/inkstorm', family + '.glb');
  const oldHash = sha(oldBytes);
  assert.equal(oldHash, frozen.assets.find(a => a.family === family).sha256);
  assert.equal(sha(await readFile(publicPath)), oldHash, 'Runtime source changed before packaging');
  const overlayBytes = await readFile(path.join(stage, family + '-overlay.glb'));
  assert.equal(frontfaces.overlaySha256s[family], sha(overlayBytes), 'Front-face test must match exact current overlay');
  const oldDoc = await io.readBinary(oldBytes), overlayDoc = await io.readBinary(overlayBytes);
  const base = onePrimitive(oldDoc), overlay = onePrimitive(overlayDoc);
  const original = snapshot(base);
  assert.deepEqual(base.listSemantics().sort(), overlay.listSemantics().sort());
  assert.deepEqual(base.listSemantics().sort(), ['COLOR_0', 'NORMAL', 'POSITION']);
  const oldCount = base.getAttribute('POSITION').getCount();
  const newCount = oldCount + overlay.getAttribute('POSITION').getCount();
  const min = base.getAttribute('POSITION').getMin([]), max = base.getAttribute('POSITION').getMax([]);
  for (const semantic of base.listSemantics()) {
    const target = base.getAttribute(semantic), addition = overlay.getAttribute(semantic);
    assert.equal(target.getType(), addition.getType());
    assert.equal(target.getNormalized(), addition.getNormalized());
    assert.equal(target.getComponentType(), addition.getComponentType());
    const a = target.getArray(), b = addition.getArray();
    const joined = new a.constructor(a.length + b.length);
    joined.set(a); joined.set(b, a.length); target.setArray(joined);
  }
  const firstIndices = base.getIndices().getArray(), extraIndices = overlay.getIndices().getArray();
  const IndexArray = newCount < 65536 ? Uint16Array : Uint32Array;
  const indices = new IndexArray(firstIndices.length + extraIndices.length);
  indices.set(firstIndices);
  for (let i = 0; i < extraIndices.length; i++) indices[firstIndices.length + i] = extraIndices[i] + oldCount;
  base.getIndices().setArray(indices);
  // Original material, hierarchy, winding, vertex arrays and index prefix remain intact.
  // The runtime replaces this material with its shared Inkstorm shader, as before.
  await oldDoc.transform(dedup(), prune({ keepAttributes: true, keepIndices: true }));
  assertPrefixPreserved(base, original);
  const bytes = await io.writeBinary(oldDoc);
  const checkDoc = await io.readBinary(bytes), p = onePrimitive(checkDoc);
  assertPrefixPreserved(p, original);
  assert.deepEqual(p.getAttribute('POSITION').getMin([]), min);
  assert.deepEqual(p.getAttribute('POSITION').getMax([]), max);
  assert.equal(p.getIndices().getCount(), original.indices.length + extraIndices.length);
  assert.equal(p.getAttribute('POSITION').getCount(), newCount);
  const triangles = p.getIndices().getCount() / 3;
  assert(triangles <= caps[family]);
  assert.equal(Math.max(...p.getIndices().getArray()) < newCount, true);
  const position = p.getAttribute('POSITION'), normal = p.getAttribute('NORMAL'), color = p.getAttribute('COLOR_0');
  for (const a of [position, normal, color]) assert(Array.from(a.getArray()).every(Number.isFinite));
  let maxNormalLengthError = 0;
  for (let i = 0; i < normal.getCount(); i++) {
    maxNormalLengthError = Math.max(maxNormalLengthError, Math.abs(Math.hypot(...normal.getElement(i, [])) - 1));
  }
  assert(maxNormalLengthError < .001);
  assert(color.getMin([]).every(v => v >= 0) && color.getMax([]).every(v => v <= 1));
  const validation = await validator.validateBytes(bytes, { uri: family + '.glb', maxIssues: 1000 });
  assert.equal(validation.issues.numErrors, 0);
  assert.equal(validation.issues.numWarnings, 0);
  const candidatePath = path.join(stage, 'candidates', family + '.glb');
  await writeFile(candidatePath, bytes);
  assert.equal(sha(await readFile(publicPath)), oldHash, 'Runtime asset was modified');
  assets.push({ family, candidatePath: path.relative(root, candidatePath),
    predecessorSha256: oldHash, overlaySha256: sha(overlayBytes), candidateSha256: sha(bytes),
    predecessorBytes: oldBytes.length, overlayBytes: overlayBytes.length, candidateBytes: bytes.length,
    originalTriangles: original.indices.length / 3, addedTriangles: extraIndices.length / 3, triangles,
    vertices: newCount, meshes: 1, primitives: 1, materials: 1, textures: 0,
    uvStatus: 'No TEXCOORD attributes in either predecessor or overlay; original vertex-color/local-position shader contract preserved',
    bounds: { min, max }, maxNormalLengthError,
    preservation: 'Every predecessor POSITION/NORMAL/COLOR_0 byte and every original index retained as exact prefixes after final GLB roundtrip; hierarchy and original material retained',
    runtimeAssetUnchanged: true, validation: validation.issues });
}
const deliveryIncrease = assets.reduce((sum, a) => sum + a.candidateBytes - a.predecessorBytes, 0);
assert(deliveryIncrease <= 1500000);
const receipt = {
  date: '2026-09-08', revision: 3, status: 'CANDIDATES VALIDATED; NOT PUBLISHED; NO VISUAL OR PERFORMANCE ACCEPTANCE',
  previousRevisions: ['versions/v1/', 'versions/v2-blocked-fixtures/'],
  correction: 'Retained v2 ring/cloth winding correction and matched cloth diagonals; moved three district task fixtures under supported v1 lower service rails behind the awning attachment, using shared lighting anchors. Pit task fixtures unchanged; 24 triangles per fixture.',
  frontFaceValidation: 'test_frontfaces.mjs / frontface-audit.json: actual exported normals, signed volumes, closed directed edges, FrontSide ray hits and open bore',
  fixtureValidation: 'test_task_fixtures.mjs / task-fixture-audit.json: exact emitter planes, normals, face areas and contact with predecessor crossbeams',
  sharedTaskLightAnchors: 'task-light-anchors.json', sharedTaskLightAnchorSha256: sha(anchorBytes),
  userPrompt: 'Use Blender MCP and Codex imagegen skill to generate concept images of the target art style for each section. Keep Iterateing until in-world screenshots look as close as possible to those, at 40-60fps.',
  source: 'Original Blender MCP authored additive construction in an isolated scene; no downloads',
  sourceScript: 'build_grid_detail.py', sourceScriptSha256: sha(await readFile(path.join(stage, 'build_grid_detail.py'))),
  mergeScriptSha256: sha(await readFile(fileURLToPath(import.meta.url))),
  blenderReceipt: 'blender-export-receipt.txt', preservedPredecessors: 'predecessors/',
  optimization: 'glTF Transform 4.5.0 exact-prefix concatenation plus dedup/prune; no remesh, simplify or quantization',
  deliveryIncrease, maximumAllPlacementExtraTriangles: assets.reduce((sum, a) => sum + a.addedTriangles * counts[a.family], 0),
  extraDrawCalls: 0, extraMaterials: 0, extraTextures: 0, assets,
};
await writeFile(path.join(stage, 'candidate-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
