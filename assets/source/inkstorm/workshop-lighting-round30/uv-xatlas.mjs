/** CPU-only watlas candidate. Source attributes are copied exactly via xref.
 * node uv-xatlas.mjs pit-complex [--width 2048 --height 2048 --priority-weight 2]
 * Auditing is a separate mandatory command; this script never asserts UV PASS.
 */
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import * as watlas from './tools/node_modules/watlas/dist/watlas.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const argv = process.argv.slice(2), family = argv.shift();
let tag = '';
assert(['pit-complex', 'pit-district'].includes(family), 'Provide frozen family');
const opts = {width: 2048, height: 2048, priorityWeight: 2, nativePadding: 16, nativeResolution: 2048, border: 9,
  maxCost:2, normalSeamWeight:4, straightnessWeight:6};
const flags = {'--width':'width', '--height':'height', '--priority-weight':'priorityWeight', '--native-padding':'nativePadding', '--native-resolution':'nativeResolution', '--border':'border',
  '--max-cost':'maxCost', '--normal-seam-weight':'normalSeamWeight', '--straightness-weight':'straightnessWeight'};
for (let i = 0; i < argv.length; i += 2) {
  if (argv[i] === '--tag') { tag = argv[i + 1]; assert(/^[a-zA-Z0-9_-]+$/.test(tag)); continue; }
  assert(flags[argv[i]] && argv[i + 1] !== undefined, `Unknown flag ${argv[i]}`);
  opts[flags[argv[i]]] = Number(argv[i + 1]);
}
assert(Object.values(opts).every(n => Number.isFinite(n) && n >= 0));
assert(opts.width > 2*opts.border && opts.height > 2*opts.border);
const input = JSON.parse(await readFile(path.join(here, 'inputs', `${family}.json`)));
const sourceBytes = await readFile(path.join(root, input.sourcePath));
assert.equal(sha(sourceBytes), input.sourceSha256);
const metrics = JSON.parse(await readFile(path.join(here, 'source-metrics.json'))).assets.find(a => a.family === family);
assert.equal(metrics.sha256, input.sourceSha256);
const positions = input.attributes.POSITION.values, normals = input.attributes.NORMAL.values;
const vec = (a, id) => a.slice(id * 3, id * 3 + 3);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const groups = [{name:'priority', weight:opts.priorityWeight, faces:[]}, {name:'remaining', weight:1, faces:[]}];
for (let face = 0; face < input.indices.length / 3; face++) {
  const ids = input.indices.slice(face * 3, face * 3 + 3);
  const center = ids.reduce((sum, id) => sum.map((n, k) => n + positions[id * 3 + k] / 3), [0,0,0]);
  const n = ids.reduce((sum, id) => sum.map((n, k) => n + normals[id * 3 + k]), [0,0,0]);
  const nl = Math.hypot(...n), unitN = n.map(x => x / (nl || 1));
  const priority = metrics.sourcesGLB.some(light => {
    const d = sub(light, center), dl = Math.hypot(...d);
    return center[1] < light[1] + .05 && dl < 32 && dl > 1e-6 && dot(unitN, d) / dl > .05;
  });
  groups[priority ? 0 : 1].faces.push({sourceTriangleId:face, ids});
}
const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {Document, NodeIO} = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
await watlas.Initialize();
const atlas = new watlas.Atlas(), start = performance.now();
let report;
try {
  for (const group of groups) {
    const ids = new Map(), localToSource = [], p = [], n = [], indices = [];
    for (const face of group.faces) for (const sourceId of face.ids) {
      if (!ids.has(sourceId)) {
        ids.set(sourceId, localToSource.length); localToSource.push(sourceId);
        p.push(...vec(positions, sourceId).map(x => x * group.weight)); n.push(...vec(normals, sourceId));
      }
      indices.push(ids.get(sourceId));
    }
    group.localToSource = localToSource; group.indices = indices;
    atlas.addMesh({vertexPositionData:new Float32Array(p), vertexNormalData:new Float32Array(n),
      vertexCount:localToSource.length, vertexPositionStride:12, vertexNormalStride:12,
      indexData:new Uint32Array(indices), indexCount:indices.length, epsilon:1e-7});
  }
  const chartOptions = {maxIterations:4, fixWinding:false, maxCost:opts.maxCost,
    normalSeamWeight:opts.normalSeamWeight, straightnessWeight:opts.straightnessWeight};
  const packOptions = {resolution:opts.nativeResolution, padding:opts.nativePadding, bilinear:true,
    blockAlign:true, bruteForce:false, rotateCharts:true, rotateChartsToAxis:true};
  console.log(JSON.stringify({stage:'compute-charts', family, groups:groups.map(g => ({name:g.name, faces:g.faces.length, weight:g.weight}))}));
  atlas.computeCharts(chartOptions);
  console.log(JSON.stringify({stage:'pack-charts', charts:atlas.chartCount, packOptions}));
  atlas.packCharts(packOptions);
  assert.equal(atlas.meshCount, groups.length);
  assert.equal(atlas.atlasCount, 1, `Expected one atlas, got ${atlas.atlasCount}`);
  const nativeWidth = atlas.width, nativeHeight = atlas.height;
  const sx = (opts.width - opts.border * 2) / nativeWidth;
  const sy = (opts.height - opts.border * 2) / nativeHeight;
  const output = new Document(), buffer = output.createBuffer(), primitive = output.createPrimitive();
  const sourceIds = [], uv = [], outIndices = [], exactArrays = Object.fromEntries(Object.keys(input.attributes).map(s => [s, []]));
  const sourceFaceOrder = [];
  let offset = 0;
  for (let mi = 0; mi < groups.length; mi++) {
    const mesh = atlas.getMesh(mi), group = groups[mi];
    const indexArray = new Uint32Array(mesh.indexCount); mesh.getIndexArray(indexArray);
    assert.equal(indexArray.length, group.indices.length);
    const references = [];
    for (let vertexIndex = 0; vertexIndex < mesh.vertexCount; vertexIndex++) {
      const v = mesh.getVertex(vertexIndex), sourceId = group.localToSource[v.xref];
      assert.equal(v.atlasIndex, 0); assert(Number.isInteger(sourceId));
      references.push(sourceId); sourceIds.push(sourceId);
      // The intermediate glTF UV convention is explicitly top-left. The bake
      // loader consumes validator corners converted back to bottom-left.
      uv.push((opts.border + v.uv[0] * sx) / opts.width, (opts.border + v.uv[1] * sy) / opts.height);
      for (const [semantic, attr] of Object.entries(input.attributes))
        exactArrays[semantic].push(...attr.values.slice(sourceId * attr.elementSize, (sourceId + 1) * attr.elementSize));
    }
    // xatlas preserves input face ordering; verify every returned corner before
    // relying on it. Final validator also independently maps cyclic identities.
    for (let corner = 0; corner < indexArray.length; corner++) {
      assert.equal(references[indexArray[corner]], group.localToSource[group.indices[corner]], `xref corner ${corner}`);
      outIndices.push(offset + indexArray[corner]);
    }
    sourceFaceOrder.push(...group.faces.map(f => f.sourceTriangleId));
    offset += mesh.vertexCount;
  }
  for (const [semantic, attr] of Object.entries(input.attributes)) {
    assert.equal(attr.componentType, 5126, 'Frozen source expected FLOAT attributes');
    primitive.setAttribute(semantic, output.createAccessor(semantic).setBuffer(buffer).setType(attr.type).setArray(new Float32Array(exactArrays[semantic])));
  }
  primitive.setAttribute('_SOURCE_ID', output.createAccessor('source-id').setBuffer(buffer).setType('SCALAR').setArray(new Float32Array(sourceIds)));
  // Generic glTF attributes retain their numeric values on Blender import.
  // The white-bake shader explicitly converts GLB (x,y,z) -> Blender (x,-z,y).
  primitive.setAttribute('_SOURCE_NORMAL', output.createAccessor('source-normal-glb').setBuffer(buffer).setType('VEC3').setArray(new Float32Array(exactArrays.NORMAL)));
  primitive.setAttribute('TEXCOORD_0', output.createAccessor('uv').setBuffer(buffer).setType('VEC2').setArray(new Float32Array(uv)));
  primitive.setIndices(output.createAccessor('indices').setBuffer(buffer).setType('SCALAR').setArray(new Uint32Array(outIndices)));
  output.createScene('frozen-source-uv-candidate').addChild(output.createNode(family).setMesh(output.createMesh(family).addPrimitive(primitive)));
  const stem = `${family}-xatlas-${opts.width}x${opts.height}${tag ? '-'+tag : ''}`;
  const outputBytes = await new NodeIO().writeBinary(output), filename = `${stem}-uv-export.glb`;
  await writeFile(path.join(here, filename), outputBytes);
  const utilization = new Float32Array(atlas.atlasCount); atlas.getUtilization(utilization);
  report = {status:'UNVALIDATED_UV_CANDIDATE_NOT_BAKED', family, sourceSha256:input.sourceSha256,
    generator:{name:'watlas', version:'1.0.1', license:'MIT', documentation:'https://github.com/toji/watlas'},
    options:opts, chartOptions, packOptions, nativeWidth, nativeHeight, atlasCount:atlas.atlasCount,
    chartCount:atlas.chartCount, nativeTexelsPerUnit:atlas.texelsPerUnit, nativeUtilization:Array.from(utilization),
    scaleToOutput:[sx,sy], globalUvAnisotropy:Math.max(sx,sy)/Math.min(sx,sy),
    outputVertices:sourceIds.length, sourceVertices:positions.length/3, triangles:outIndices.length/3,
    groups:groups.map(g => ({name:g.name, faces:g.faces.length, positionWeightForPackingOnly:g.weight})),
    authoredAttributesCopiedByOriginalId:true, sourceNormalAttributeCoordinates:'Original GLB (x,y,z), untransformed; exact NORMAL clone for the white shader',
    sourceFaceOrder, outputPath:filename, outputSha256:sha(outputBytes),
    outputBytes:outputBytes.length, elapsedSeconds:(performance.now()-start)/1000,
    rgba8WithMipsMiB:opts.width*opts.height*4*4/3/1048576,
    acceptance:'Run validate-uv.mjs on this export. No bake/UV/visual PASS claimed by this generator.'};
  await writeFile(path.join(here, `${stem}.json`), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,sourceFaceOrder:undefined},null,2));
} finally { atlas.delete(); }
