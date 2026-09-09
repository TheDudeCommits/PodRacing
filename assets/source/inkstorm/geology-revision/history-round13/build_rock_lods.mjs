/**
 * Original Inkstorm rock LODs. Source GLBs are read-only.
 *
 * Install tools outside the game checkout, then regenerate:
 * npm install --prefix /tmp/inkstorm-rock-lod-tools --no-audit --no-fund --save-exact meshoptimizer@1.2.0 @gltf-transform/core@4.5.0 @gltf-transform/functions@4.5.0 gltf-validator@2.0.0-dev.3.10
 * node assets/source/inkstorm/build_rock_lods.mjs /tmp/inkstorm-rock-lod-tools
 *
 * Hard-normal and color seams stop the standard CLI simplifier well above
 * the distant-geometry budget. Attribute-aware permissive simplification
 * instead weights both normals and vertex paint, retaining original vertex
 * values. It never interpolates colors or modifies the original sculptures.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const toolDirectory = path.resolve(process.argv[2] ?? '/tmp/inkstorm-rock-lod-tools');
const toolRequire = createRequire(path.join(toolDirectory, 'package.json'));
const toolImport = (name) => import(pathToFileURL(toolRequire.resolve(name)).href);
const { NodeIO } = await toolImport('@gltf-transform/core');
const { compactPrimitive, dedup, prune } = await toolImport('@gltf-transform/functions');
const { MeshoptSimplifier } = await toolImport('meshoptimizer');
const validator = toolRequire('gltf-validator');
await MeshoptSimplifier.ready;
const io = new NodeIO();
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceDirectory = path.join(root, 'assets/source/inkstorm');
const assetDirectory = path.join(root, 'public/assets/inkstorm');
const records = [];

function summarize(document) {
  const documentRoot = document.getRoot();
  const meshes = documentRoot.listMeshes();
  const primitives = meshes.flatMap((mesh) => mesh.listPrimitives());
  assert.equal(meshes.length, 1);
  assert.equal(primitives.length, 1);
  assert.equal(documentRoot.listMaterials().length, 1);
  const primitive = primitives[0];
  const position = primitive.getAttribute('POSITION');
  const normal = primitive.getAttribute('NORMAL');
  const color = primitive.getAttribute('COLOR_0');
  assert(position && normal && color);
  assert.equal(primitive.getMode(), 4);
  assert.equal(position.getType(), 'VEC3');
  assert.equal(normal.getType(), 'VEC3');
  assert.equal(color.getType(), 'VEC3');
  assert.equal(normal.getCount(), position.getCount());
  assert.equal(color.getCount(), position.getCount());
  let minimumNormalLength = Infinity;
  let maximumNormalLength = -Infinity;
  for (let i = 0; i < normal.getCount(); i++) {
    const vector = normal.getElement(i, []);
    const length = Math.hypot(...vector);
    minimumNormalLength = Math.min(minimumNormalLength, length);
    maximumNormalLength = Math.max(maximumNormalLength, length);
  }
  for (const accessor of [position, normal, color]) {
    assert(Array.from(accessor.getArray()).every(Number.isFinite));
  }
  assert(minimumNormalLength > 0.999 && maximumNormalLength < 1.001);
  const colorMinimum = color.getMin([]);
  const colorMaximum = color.getMax([]);
  assert(colorMinimum.every((value) => value >= 0));
  assert(colorMaximum.every((value) => value <= 1));
  return {
    meshCount: meshes.length,
    primitiveCount: primitives.length,
    materialCount: documentRoot.listMaterials().length,
    vertices: position.getCount(),
    triangles: primitive.getIndices().getCount() / 3,
    attributes: primitive.listSemantics(),
    bounds: { min: position.getMin([]), max: position.getMax([]) },
    normals: { minimumLength: minimumNormalLength, maximumLength: maximumNormalLength, finite: true },
    colors: { min: colorMinimum, max: colorMaximum, finite: true, withinUnitRange: true },
  };
}

for (const [name, triangleTarget] of [['canyon-buttress', 1798], ['sandstone-scree', 1198]]) {
  const sourcePath = path.join(assetDirectory, `${name}.glb`);
  const outputPath = path.join(assetDirectory, `${name}-lod.glb`);
  const sourceBytes = await readFile(sourcePath);
  const sourceHash = digest(sourceBytes);
  const document = await io.readBinary(sourceBytes);
  const sourceSummary = summarize(document);
  const primitive = document.getRoot().listMeshes()[0].listPrimitives()[0];
  const positions = primitive.getAttribute('POSITION').getArray();
  const normals = primitive.getAttribute('NORMAL').getArray();
  const colors = primitive.getAttribute('COLOR_0').getArray();
  const attributes = new Float32Array(positions.length * 2);
  for (let i = 0; i < positions.length / 3; i++) {
    for (let component = 0; component < 3; component++) {
      attributes[i * 6 + component] = normals[i * 3 + component];
      attributes[i * 6 + component + 3] = colors[i * 3 + component];
    }
  }
  // Lock one position on each of the six bounding planes, including every
  // normal/color duplicate at that position. This preserves the exact size
  // and ground origin while allowing the remaining coplanar floor to reduce.
  const lockedPositions = new Set();
  const positionKey = (index) => Array.from(positions.subarray(index * 3, index * 3 + 3)).join(',');
  for (let component = 0; component < 3; component++) {
    for (const bound of [sourceSummary.bounds.min[component], sourceSummary.bounds.max[component]]) {
      for (let i = 0; i < positions.length / 3; i++) {
        if (positions[i * 3 + component] === bound) {
          lockedPositions.add(positionKey(i));
          break;
        }
      }
    }
  }
  const locks = new Uint8Array(positions.length / 3);
  for (let i = 0; i < locks.length; i++) {
    if (lockedPositions.has(positionKey(i))) locks[i] = 1;
  }
  const [reducedIndices, relativeAttributeAwareError] = MeshoptSimplifier.simplifyWithAttributes(
    new Uint32Array(primitive.getIndices().getArray()), positions, 3,
    attributes, 6, [0.1, 0.1, 0.1, 0.6, 0.6, 0.6], locks,
    triangleTarget * 3, 0.02, ['Permissive'],
  );
  primitive.getIndices().setArray(reducedIndices);
  compactPrimitive(primitive);
  await document.transform(dedup(), prune());
  const outputBytes = await io.writeBinary(document);
  const validation = await validator.validateBytes(outputBytes, { uri: `${name}-lod.glb`, maxIssues: 1000 });
  assert.equal(validation.issues.numErrors, 0);
  assert.equal(validation.issues.numWarnings, 0);
  const outputSummary = summarize(await io.readBinary(outputBytes));
  assert(outputSummary.triangles <= triangleTarget);
  assert.deepEqual(outputSummary.bounds, sourceSummary.bounds);
  assert.equal(digest(await readFile(sourcePath)), sourceHash, 'Original asset changed');
  await writeFile(outputPath, outputBytes);
  records.push({
    asset: `${name}-lod.glb`,
    sourceAsset: `${name}.glb`,
    sourceSha256: sourceHash,
    sourceUnchanged: true,
    source: sourceSummary,
    output: { bytes: outputBytes.byteLength, sha256: digest(outputBytes), ...outputSummary },
    triangleReductionPercent: 100 * (1 - outputSummary.triangles / sourceSummary.triangles),
    method: {
      library: 'meshoptimizer 1.2.0',
      operation: 'simplifyWithAttributes',
      flags: ['Permissive'],
      normalWeights: [0.1, 0.1, 0.1],
      colorWeights: [0.6, 0.6, 0.6],
      targetTriangles: triangleTarget,
      errorLimit: 0.02,
      relativeAttributeAwareError,
      positionsNormalsAndColors: 'Selected original vertex values, unchanged; no attribute interpolation',
      boundingExtrema: 'Locked; output bounds and ground origin exactly match source',
      isolatedComponentPruning: false,
      serialization: 'glTF Transform 4.5.0 compactPrimitive + dedup + prune',
    },
    validation: {
      library: 'Khronos glTF Validator 2.0.0-dev.3.10',
      errors: validation.issues.numErrors,
      warnings: validation.issues.numWarnings,
      infos: validation.issues.numInfos,
      hints: validation.issues.numHints,
      messages: validation.issues.messages,
    },
  });
  console.log(`${name}: ${sourceSummary.triangles} -> ${outputSummary.triangles} triangles, ${outputBytes.byteLength} bytes, validator clean`);
}
await writeFile(path.join(sourceDirectory, 'rock-lod-receipt.json'), `${JSON.stringify({
  sourceScript: 'build_rock_lods.mjs',
  purpose: 'Distant LODs of the original Inkstorm fractured rocks; full-detail assets remain unchanged',
  regeneration: [
    'npm install --prefix /tmp/inkstorm-rock-lod-tools --no-audit --no-fund --save-exact meshoptimizer@1.2.0 @gltf-transform/core@4.5.0 @gltf-transform/functions@4.5.0 gltf-validator@2.0.0-dev.3.10',
    'node assets/source/inkstorm/build_rock_lods.mjs /tmp/inkstorm-rock-lod-tools',
  ],
  assets: records,
}, null, 2)}\n`);
