/** CPU-only audit of a temporary Blender UV export. Never modifies its inputs.
 * node validate-uv.mjs pit-complex /absolute/path/temporary.glb --width 2048 --height 1024
 * Emits a diagnostic receipt even on failure; transfer accepts only a PASS file.
 */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Matrix3, Matrix4, Vector3} from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '../../../..');
const sha256 = b => createHash('sha256').update(b).digest('hex');
const args = process.argv.slice(2);
const family = args.shift(), exportArg = args.shift();
const options = {
  width: 2048, height: 1024, padding: 8, positionTolerance: 1e-5,
  normalTolerance: 1e-5, normalAngleTolerance: null, uvSemantic: 'TEXCOORD_0', sourceSemantic: '_SOURCE_ID',
  maxCandidatePairs: 5000000, overlapAreaEpsilon: 1e-6, outputStem: family,
};
const switches = {
  '--width': ['width', Number], '--height': ['height', Number],
  '--padding': ['padding', Number], '--position-tolerance': ['positionTolerance', Number],
  '--normal-tolerance': ['normalTolerance', Number], '--uv-semantic': ['uvSemantic', String],
  '--normal-angle-tolerance': ['normalAngleTolerance', Number],
  '--output-stem': ['outputStem', String],
  '--source-semantic': ['sourceSemantic', String], '--max-candidate-pairs': ['maxCandidatePairs', Number],
};
const usage = 'node validate-uv.mjs <pit-complex|pit-district> <temporary.glb> [--width 2048 --height 1024 --padding 8]';
if (family === '--self-test') {
  selfTest();
} else if (!['pit-complex', 'pit-district'].includes(family) || !exportArg) {
  console.error(usage); process.exitCode = 2;
} else {
  for (let i = 0; i < args.length; i += 2) {
    const spec = switches[args[i]];
    if (!spec || args[i + 1] === undefined) throw new Error(`Unknown/incomplete option ${args[i]}`);
    options[spec[0]] = spec[1](args[i + 1]);
  }
  await main();
}

async function main() {
  const failures = [], warnings = [];
  const report = {
    status: 'FAIL', family, createdAt: new Date().toISOString(),
    scope: 'UV topology, geometric correspondence, spacing, density and texel-center occupancy; not bake or runtime acceptance',
    exportPath: path.resolve(exportArg), options, failures, warnings,
  };
  const fail = (check, detail) => failures.push({check, detail});
  let corners = [];
  try {
    for (const k of ['width', 'height', 'maxCandidatePairs'])
      if (!Number.isSafeInteger(options[k]) || options[k] < 1) throw new Error(`Invalid ${k}`);
    for (const k of ['padding', 'positionTolerance', 'normalTolerance'])
      if (!Number.isFinite(options[k]) || options[k] < 0) throw new Error(`Invalid ${k}`);
    if (options.normalAngleTolerance !== null && (!Number.isFinite(options.normalAngleTolerance) || options.normalAngleTolerance < 0))
      throw new Error('Invalid normalAngleTolerance');
    if (options.width * options.height > 33554432) throw new Error('Raster exceeds 32 Mi texels; explicitly revise the audit before increasing it');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(options.outputStem)) throw new Error('Output stem must be a plain filename stem');
    // The transfer gate requires eight pixels regardless of a diagnostic CLI override.
    if (options.padding < 8) fail('padding-policy', 'A diagnostic threshold below eight pixels cannot produce a transfer PASS');

    const inputBytes = await readFile(path.join(here, 'inputs', `${family}.json`));
    const input = JSON.parse(inputBytes);
    report.inputJsonSha256 = sha256(inputBytes);
    report.sourceSha256 = input.sourceSha256;
    if (input.family !== family) throw new Error('Frozen input family mismatch');
    const frozenBytes = await readFile(path.join(project, input.sourcePath));
    if (sha256(frozenBytes) !== input.sourceSha256) throw new Error('Frozen source GLB changed since source extraction');
    const metrics = JSON.parse(await readFile(path.join(here, 'source-metrics.json')));
    const sourceMetric = metrics.assets.find(a => a.family === family);
    if (!sourceMetric || sourceMetric.sha256 !== input.sourceSha256) throw new Error('Source metrics hash mismatch');
    const sourceP = input.attributes.POSITION.values, sourceN = input.attributes.NORMAL.values;
    const sourceI = input.indices, vertexCount = sourceP.length / 3, triangleCount = sourceI.length / 3;
    if (!Number.isInteger(triangleCount) || input.attributes.POSITION.elementSize !== 3 || input.attributes.NORMAL.elementSize !== 3)
      throw new Error('Unexpected source attribute dimensions');
    const vector = (array, id) => array.slice(id * 3, id * 3 + 3);
    const originalTriangles = Array.from({length: triangleCount}, (_, id) => sourceI.slice(id * 3, id * 3 + 3));
    const faceBuckets = new Map();
    originalTriangles.forEach((ids, id) => {
      const key = cyclicKey(ids);
      if (!faceBuckets.has(key)) faceBuckets.set(key, []);
      faceBuckets.get(key).push(id);
    });
    const require = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
    const {NodeIO} = await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
    // Do not trust a source hash label on JSON whose extracted arrays changed.
    const frozenDoc = await new NodeIO().readBinary(frozenBytes);
    const frozenPrimitive = frozenDoc.getRoot().listMeshes()[0].listPrimitives()[0];
    for (const [semantic, attribute] of Object.entries(input.attributes)) {
      const frozenAttribute = frozenPrimitive.getAttribute(semantic);
      if (!frozenAttribute || frozenAttribute.getElementSize() !== attribute.elementSize)
        throw new Error(`Frozen input ${semantic} dimensions changed`);
      const actual = frozenAttribute.getArray();
      if (actual.length !== attribute.values.length || actual.some((n, i) => n !== attribute.values[i]))
        throw new Error(`Frozen input ${semantic} differs from the hash-pinned GLB`);
    }
    const actualIndices = frozenPrimitive.getIndices().getArray();
    if (actualIndices.length !== sourceI.length || actualIndices.some((n, i) => n !== sourceI[i]))
      throw new Error('Frozen input triangle indices differ from the hash-pinned GLB');
    report.frozenJsonArraysMatchSourceGlb = true;
    const exportBytes = await readFile(report.exportPath);
    report.exportSha256 = sha256(exportBytes);
    const doc = await new NodeIO().readBinary(exportBytes), exportedFaces = [];
    let maxPositionError = 0, maxNormalComponentError = 0, maxNormalAngleDegrees = 0;
    let auditedCorners = 0, invalidIds = 0, invalidNormals = 0, reversedFaces = 0, unmatchedFaces = 0;
    const geometryExamples = [], mappingExamples = [];
    const scratchP = new Vector3(), scratchN = new Vector3();
    const scenes = doc.getRoot().listScenes();
    if (scenes.length !== 1) fail('scene-count', `Expected one export scene, found ${scenes.length}`);
    const reachable = new Set();
    (doc.getRoot().getDefaultScene() ?? scenes[0])?.traverse(node => reachable.add(node));
    for (const node of reachable) {
      const mesh = node.getMesh(); if (!mesh) continue;
      const world = new Matrix4().fromArray(node.getWorldMatrix());
      const normalMatrix = new Matrix3().getNormalMatrix(world);
      if (world.determinant() <= 0) fail('node-transform', `Nonpositive determinant on node ${node.getName()}`);
      for (const primitive of mesh.listPrimitives()) {
        if (primitive.getMode() !== 4) { fail('primitive-mode', 'Only triangle primitives are auditable'); continue; }
        const p = primitive.getAttribute('POSITION'), n = primitive.getAttribute('NORMAL');
        const uv = primitive.getAttribute(options.uvSemantic), source = primitive.getAttribute(options.sourceSemantic);
        if (!p || !n || !uv || !source) {
          fail('export-attributes', {node: node.getName(), attributes: primitive.listSemantics(), required: ['POSITION', 'NORMAL', options.uvSemantic, options.sourceSemantic]});
          continue;
        }
        if (source.getElementSize() !== 1 || uv.getElementSize() !== 2) throw new Error('Source IDs must be SCALAR and UVs VEC2');
        if ([n, uv, source].some(a => a.getCount() !== p.getCount())) throw new Error('Export attribute counts disagree');
        const ids = primitive.getIndices()?.getArray() ?? Uint32Array.from({length: p.getCount()}, (_, i) => i);
        if (ids.length % 3) throw new Error('Export triangle index count is not divisible by three');
        for (let at = 0; at < ids.length; at += 3) {
          const face = {sourceIds: [], uv: []};
          let valid = true;
          for (let c = 0; c < 3; c++) {
            const exportId = ids[at + c], rawId = source.getElement(exportId, [])[0], sourceId = Math.round(rawId);
            if (!Number.isFinite(rawId) || Math.abs(rawId - sourceId) > 1e-6 || sourceId < 0 || sourceId >= vertexCount) {
              invalidIds++; valid = false; continue;
            }
            face.sourceIds.push(sourceId);
            const texcoord = uv.getElement(exportId, []);
            // Blender's exporter has already converted its bottom-left UV origin to glTF.
            face.uv.push([texcoord[0], 1 - texcoord[1]]);
            const oldP = vector(sourceP, sourceId), oldN = new Vector3(...vector(sourceN, sourceId));
            scratchP.fromArray(p.getElement(exportId, [])).applyMatrix4(world);
            scratchN.fromArray(n.getElement(exportId, [])).applyMatrix3(normalMatrix);
            const positionError = scratchP.distanceTo(new Vector3(...oldP));
            if (!Number.isFinite(positionError) || !Number.isFinite(scratchN.lengthSq()) || scratchN.lengthSq() < 1e-20 || oldN.lengthSq() < 1e-20) {
              invalidNormals++; valid = false; continue;
            }
            scratchN.normalize(); oldN.normalize();
            const normalError = Math.max(Math.abs(scratchN.x - oldN.x), Math.abs(scratchN.y - oldN.y), Math.abs(scratchN.z - oldN.z));
            const angle = Math.acos(Math.max(-1, Math.min(1, scratchN.dot(oldN)))) * 180 / Math.PI;
            maxPositionError = Math.max(maxPositionError, positionError);
            maxNormalComponentError = Math.max(maxNormalComponentError, normalError);
            maxNormalAngleDegrees = Math.max(maxNormalAngleDegrees, angle);
            auditedCorners++;
            if ((positionError > options.positionTolerance || normalError > options.normalTolerance) && geometryExamples.length < 20)
              geometryExamples.push({sourceVertexId: sourceId, positionErrorMetres: positionError, normalComponentError: normalError});
          }
          if (!valid) continue;
          const bucket = faceBuckets.get(cyclicKey(face.sourceIds));
          if (!bucket?.length) {
            const reverse = cyclicKey([face.sourceIds[0], face.sourceIds[2], face.sourceIds[1]]);
            if (faceBuckets.get(reverse)?.length) reversedFaces++; else unmatchedFaces++;
            if (mappingExamples.length < 20) mappingExamples.push(face.sourceIds);
            continue;
          }
          face.sourceTriangleId = bucket.shift();
          exportedFaces.push(face);
        }
      }
    }
    const missingSourceTriangles = [...faceBuckets.values()].flat();
    report.geometry = {sourceVertices: vertexCount, sourceTriangles: triangleCount, matchedTriangles: exportedFaces.length,
      auditedCorners, maxPositionErrorMetres: maxPositionError, maxNormalComponentError, maxNormalAngleDegrees,
      invalidSourceIds: invalidIds, invalidNormals, reversedFaces, unmatchedFaces,
      missingSourceTriangles: missingSourceTriangles.length, missingSourceTriangleExamples: missingSourceTriangles.slice(0, 20),
      geometryExamples, mappingExamples,
      normalsWithinStrictComponentTolerance: maxNormalComponentError <= options.normalTolerance,
      normalAcceptanceMode: options.normalAngleTolerance === null ? 'strict-component-tolerance' : 'explicit-angular-tolerance-for-temporary-export',
      finalAuthoredNormalPreservation: 'This audit measures temporary export drift; exact authored final normals are independently copied and checked by transfer-uv1.mjs',
      normalComparison: 'Normalized exported normals transformed by inverse transpose versus normalized frozen source normals'};
    if (invalidIds || invalidNormals || reversedFaces || unmatchedFaces || missingSourceTriangles.length || exportedFaces.length !== triangleCount)
      fail('source-correspondence', 'Every source triangle must occur once with valid source IDs and original cyclic winding');
    if (maxPositionError > options.positionTolerance) fail('position-tolerance', maxPositionError);
    if (options.normalAngleTolerance === null) {
      if (maxNormalComponentError > options.normalTolerance) fail('normal-tolerance', maxNormalComponentError);
    } else if (maxNormalAngleDegrees > options.normalAngleTolerance) {
      fail('normal-angular-tolerance', {measuredDegrees: maxNormalAngleDegrees, permittedDegrees: options.normalAngleTolerance});
    } else if (maxNormalComponentError > options.normalTolerance) {
      warnings.push(`Temporary export normals drift by up to ${maxNormalAngleDegrees} degrees (${maxNormalComponentError} per component); accepted only under explicit angular tolerance, not claimed equal to authored normals`);
    }
    if (exportedFaces.length !== triangleCount) throw new Error('Atlas audit requires complete source triangle correspondence');

    exportedFaces.sort((a, b) => a.sourceTriangleId - b.sourceTriangleId);
    corners = exportedFaces.map(face => ({sourceTriangleId: face.sourceTriangleId,
      corners: face.sourceIds.map((sourceVertexId, i) => ({sourceVertexId, uv: face.uv[i]}))}));
    const triangles = exportedFaces.map(face => {
      const uv = face.uv.map(([u, v]) => [u * options.width, v * options.height]);
      const positions = face.sourceIds.map(id => vector(sourceP, id));
      const sourceArea = length3(cross3(sub3(positions[1], positions[0]), sub3(positions[2], positions[0]))) / 2;
      const signedUvArea = cross2(uv[0], uv[1], uv[2]) / 2;
      const center = positions[0].map((_, k) => (positions[0][k] + positions[1][k] + positions[2][k]) / 3);
      const averageN = face.sourceIds.reduce((sum, id) => sum.map((n, k) => n + sourceN[id * 3 + k]), [0, 0, 0]);
      const nl = length3(averageN), unitN = averageN.map(x => x / (nl || 1));
      const priority = sourceMetric.sourcesGLB.some(light => {
        const d = sub3(light, center), dl = length3(d);
        return center[1] < light[1] + .05 && dl < 32 && dl > 1e-6 && dot3(unitN, d) / dl > .05;
      });
      return {...face, id: face.sourceTriangleId, pixels: uv, positions, sourceArea, signedUvArea,
        uvArea: Math.abs(signedUvArea), priority, bounds: bounds2(uv)};
    });
    const invalidUV = triangles.filter(t => t.uv.some(p => p.some(n => !Number.isFinite(n) || n < 0 || n > 1)));
    if (invalidUV.length) { fail('uv-domain', {triangles: invalidUV.length, examples: invalidUV.slice(0, 20).map(t => t.id)}); throw new Error('Cannot measure an atlas with nonfinite or out-of-domain UVs'); }
    const degenerateSource = triangles.filter(t => t.sourceArea <= 1e-12), degenerateUV = triangles.filter(t => t.uvArea <= 1e-8);
    if (degenerateSource.length) fail('degenerate-source', {count: degenerateSource.length, examples: degenerateSource.slice(0, 20).map(t => t.id)});
    if (degenerateUV.length) fail('degenerate-uv', {count: degenerateUV.length, examples: degenerateUV.slice(0, 20).map(t => t.id)});

    const {charts, boundaryEdges, ambiguousEdges, sourceIdEdges, weldedPositionEdges} = buildCharts(triangles);
    report.topology = {charts: charts.length, boundaryEdges: boundaryEdges.length, ambiguousEdges,
      sharedEdgesBySourceId: sourceIdEdges, sharedEdgesByExactSourcePosition: weldedPositionEdges,
      policy: 'Join triangles only across the same source-space edge with matching endpoint UVs; exact coincident source positions bridge normal/color split IDs. UV seam comparison uses 1e-8 normalized quantization.'};
    if (ambiguousEdges) warnings.push(`${ambiguousEdges} source/UV edge groups have more than two incident triangles; overlap audit remains mandatory`);
    report.overlap = auditOverlap(triangles);
    if (!report.overlap.complete) fail('overlap-incomplete', report.overlap.reason);
    if (report.overlap.overlapPairs) fail('positive-area-uv-overlap', {pairs: report.overlap.overlapPairs, areaPixels: report.overlap.totalIntersectionAreaPixels});
    report.padding = auditPadding(triangles, boundaryEdges);
    if (!report.padding.complete) fail('padding-incomplete', report.padding.reason);
    if (report.padding.minimumChartPaddingPixels < options.padding - 1e-5)
      fail('chart-padding', {requiredPixels: options.padding, measuredConservativeMinimumPixels: report.padding.minimumChartPaddingPixels});
    report.density = densityReport(triangles, charts);
    report.raster = rasterAudit(triangles);
    if (report.raster.trianglesWithoutTexelCenter) warnings.push(`${report.raster.trianglesWithoutTexelCenter} triangles contain no texel center at this resolution; inspect thin receiver features before a bake`);
    if (report.raster.crossChartTexelCollisions) fail('raster-cross-chart-collision', report.raster.crossChartTexelCollisions);
    report.status = failures.length ? 'FAIL' : 'PASS';
  } catch (error) {
    fail('audit-error', String(error?.stack ?? error));
  }
  report.status = failures.length ? 'FAIL' : report.status;
  // Emit FAIL corners too, for diagnosis. The transfer script rejects them explicitly.
  const result = {sourceSha256: report.sourceSha256 ?? null, uvOrigin: 'BLENDER_BOTTOM_LEFT',
    uvValidation: {status: report.status, overlapPairs: report.overlap?.overlapPairs ?? null,
      minimumChartPaddingPixels: report.padding?.minimumChartPaddingPixels ?? 0,
      atlasWidth: options.width, atlasHeight: options.height,
      receipt: `${options.outputStem}-uv-audit.json`, exportSha256: report.exportSha256 ?? null,
      scope: report.scope}, triangles: corners};
  const cornersBytes = Buffer.from(JSON.stringify(result) + '\n');
  report.uvCornersSha256 = sha256(cornersBytes);
  await writeFile(path.join(here, `${options.outputStem}.uv-corners.json`), cornersBytes);
  await writeFile(path.join(here, `${options.outputStem}-uv-audit.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({status: report.status, family, failures, warnings,
    geometry: report.geometry, topology: report.topology, overlap: report.overlap,
    padding: report.padding, density: report.density && {...report.density, charts: undefined}, raster: report.raster,
    receipt: path.join(here, `${options.outputStem}-uv-audit.json`), corners: path.join(here, `${options.outputStem}.uv-corners.json`)}, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}

function cyclicKey(ids) {
  return [ids, [ids[1], ids[2], ids[0]], [ids[2], ids[0], ids[1]]].map(x => x.join(',')).sort()[0];
}
function cross2(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function sub3(a, b) { return a.map((x, i) => x - b[i]); }
function dot3(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function length3(v) { return Math.hypot(...v); }
function bounds2(points) { return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]; }
function overlapsBox(a, b, gap = 0) { return a[0] <= b[2] + gap && a[2] + gap >= b[0] && a[1] <= b[3] + gap && a[3] + gap >= b[1]; }

function buildCharts(triangles) {
  const parents = triangles.map(t => t.id), groups = new Map();
  const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]));
  let sourceIdEdges = 0, weldedPositionEdges = 0;
  const pointKey = p => p.map(n => Object.is(n, -0) ? 0 : n).join(',');
  const uvKey = p => p.map(n => Math.round(n * 1e8)).join(',');
  for (const t of triangles) for (let c = 0; c < 3; c++) {
    const next = (c + 1) % 3;
    const keys = [pointKey(t.positions[c]), pointKey(t.positions[next])];
    const ordered = keys[0] < keys[1] ? [c, next] : [next, c];
    const key = `${pointKey(t.positions[ordered[0]])}|${pointKey(t.positions[ordered[1]])}|${uvKey(t.uv[ordered[0]])}|${uvKey(t.uv[ordered[1]])}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({triangle: t.id, sourceIds: ordered.map(i => t.sourceIds[i]), a: t.pixels[c], b: t.pixels[next]});
  }
  const boundaryEdges = []; let ambiguousEdges = 0;
  for (const edges of groups.values()) {
    if (edges.length === 2) {
      parents[find(edges[0].triangle)] = find(edges[1].triangle);
      if (edges[0].sourceIds.join(',') === edges[1].sourceIds.join(',')) sourceIdEdges++; else weldedPositionEdges++;
    } else {
      boundaryEdges.push(...edges);
      if (edges.length > 2) ambiguousEdges++;
    }
  }
  const chartMap = new Map();
  for (const t of triangles) {
    const root = find(t.id);
    if (!chartMap.has(root)) chartMap.set(root, {id: chartMap.size, triangles: []});
    const chart = chartMap.get(root); t.chart = chart.id; chart.triangles.push(t);
  }
  for (const edge of boundaryEdges) { edge.chart = triangles[edge.triangle].chart; edge.bounds = bounds2([edge.a, edge.b]); }
  return {charts: [...chartMap.values()], boundaryEdges, ambiguousEdges, sourceIdEdges, weldedPositionEdges};
}

function makeGrid(items, cell) {
  const grid = new Map();
  const visit = (bounds, callback) => {
    for (let y = Math.floor(bounds[1] / cell); y <= Math.floor(bounds[3] / cell); y++)
      for (let x = Math.floor(bounds[0] / cell); x <= Math.floor(bounds[2] / cell); x++) callback(`${x},${y}`);
  };
  items.forEach((item, i) => visit(item.bounds, key => { if (!grid.has(key)) grid.set(key, []); grid.get(key).push(i); }));
  return {grid, visit};
}

function clippedTriangleArea(first, second) {
  let polygon = first.map(p => [...p]);
  const orientation = Math.sign(cross2(second[0], second[1], second[2]));
  if (!orientation) return 0;
  for (let k = 0; k < 3 && polygon.length; k++) {
    const a = second[k], b = second[(k + 1) % 3], output = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const dp = orientation * cross2(a, b, p), dq = orientation * cross2(a, b, q);
      if (dp >= 0) output.push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        output.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    polygon = output;
  }
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length]; area += a[0] * b[1] - a[1] * b[0];
  }
  return Math.abs(area) / 2;
}

function auditOverlap(triangles) {
  const {grid, visit} = makeGrid(triangles, 32);
  const result = {complete: true, candidatePairs: 0, overlapPairs: 0, sameChartPairs: 0, crossChartPairs: 0,
    totalIntersectionAreaPixels: 0, maximumIntersectionAreaPixels: 0, examples: [],
    method: 'Spatial grid candidates followed by Sutherland-Hodgman triangle intersection; boundary-only contact has zero area',
    positiveAreaThresholdPixelsSquared: options.overlapAreaEpsilon};
  for (let i = 0; i < triangles.length; i++) {
    const a = triangles[i], candidates = new Set();
    visit(a.bounds, key => { for (const j of grid.get(key) ?? []) if (j > i) candidates.add(j); });
    for (const j of candidates) {
      const b = triangles[j]; if (!overlapsBox(a.bounds, b.bounds)) continue;
      if (++result.candidatePairs > options.maxCandidatePairs) {
        result.complete = false; result.reason = 'Candidate pair limit exceeded; partial overlap result cannot PASS'; return result;
      }
      const area = clippedTriangleArea(a.pixels, b.pixels);
      if (area <= options.overlapAreaEpsilon) continue;
      result.overlapPairs++; result.totalIntersectionAreaPixels += area;
      result.maximumIntersectionAreaPixels = Math.max(result.maximumIntersectionAreaPixels, area);
      if (a.chart === b.chart) result.sameChartPairs++; else result.crossChartPairs++;
      const na = cross3(sub3(a.positions[1], a.positions[0]), sub3(a.positions[2], a.positions[0]));
      const nb = cross3(sub3(b.positions[1], b.positions[0]), sub3(b.positions[2], b.positions[0]));
      const center = t => t.positions[0].map((_, k) => t.positions.reduce((s, p) => s + p[k] / 3, 0));
      result.examples.push({sourceTriangles: [a.id, b.id], charts: [a.chart, b.chart], areaPixelsSquared: area,
        sourceCentroidDistanceMetres: length3(sub3(center(a), center(b))),
        sourceGeometricNormalDot: dot3(na, nb) / (length3(na) * length3(nb) || 1)});
      result.examples.sort((x, y) => y.areaPixelsSquared - x.areaPixelsSquared);
      if (result.examples.length > 30) result.examples.length = 30;
    }
  }
  return result;
}

function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy;
  const t = d2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function segmentDistance(a, b, c, d) {
  const abC = cross2(a, b, c), abD = cross2(a, b, d), cdA = cross2(c, d, a), cdB = cross2(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return 0;
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

function auditPadding(triangles, edges) {
  const target = options.padding * 2, search = Math.max(16, target), {grid, visit} = makeGrid(edges, 32);
  let border = Infinity, borderTriangle = null, interChart = search, closestEdges = null, candidatesChecked = 0;
  let violatingPairs = 0; const examples = [];
  for (const t of triangles) for (const [x, y] of t.pixels) {
    const distance = Math.min(x, y, options.width - x, options.height - y);
    if (distance < border) { border = distance; borderTriangle = t.id; }
  }
  let complete = true;
  outer: for (let i = 0; i < edges.length; i++) {
    const a = edges[i], candidates = new Set();
    visit([a.bounds[0] - search, a.bounds[1] - search, a.bounds[2] + search, a.bounds[3] + search], key => {
      for (const j of grid.get(key) ?? []) if (j > i && edges[j].chart !== a.chart) candidates.add(j);
    });
    for (const j of candidates) {
      const b = edges[j]; if (!overlapsBox(a.bounds, b.bounds, search)) continue;
      if (++candidatesChecked > options.maxCandidatePairs) { complete = false; break outer; }
      const distance = segmentDistance(a.a, a.b, b.a, b.b);
      if (distance < interChart) { interChart = distance; closestEdges = {triangles: [a.triangle, b.triangle], charts: [a.chart, b.chart]}; }
      if (distance < target - 1e-5) {
        violatingPairs++;
        if (examples.length < 30) examples.push({triangles: [a.triangle, b.triangle], charts: [a.chart, b.chart], distancePixels: distance});
      }
    }
  }
  return {complete, ...(complete ? {} : {reason: 'Candidate pair limit exceeded; partial padding result cannot PASS'}),
    minimumChartPaddingPixels: Math.min(border, interChart / 2),
    minimumAtlasBorderPixels: border, borderSourceTriangle: borderTriangle,
    minimumInterChartDistancePixels: interChart, interChartDistanceIsLowerBound: closestEdges === null,
    interChartSearchRadiusPixels: search, closestEdges, candidatePairs: candidatesChecked,
    violatingBoundaryPairs: violatingPairs, examples,
    method: 'Exact segment-to-segment distances between distinct chart boundaries, plus exact vertex-to-atlas-border distances. Half the inter-chart gap is available per chart; no nearby pair yields a conservative lower bound.'};
}

function densityReport(triangles, charts) {
  const summary = group => {
    const sourceArea = group.reduce((a, t) => a + t.sourceArea, 0), uvArea = group.reduce((a, t) => a + t.uvArea, 0);
    const densities = group.filter(t => t.sourceArea > 1e-12).map(t => ({value: Math.sqrt(t.uvArea / t.sourceArea), weight: t.sourceArea})).sort((a, b) => a.value - b.value);
    const weightedQuantile = p => {
      let accumulated = 0;
      for (const d of densities) { accumulated += d.weight; if (accumulated >= sourceArea * p) return d.value; }
      return null;
    };
    return {triangles: group.length, sourceAreaSquareMetres: sourceArea, uvAreaPixelsSquared: uvArea,
      atlasAreaFraction: uvArea / (options.width * options.height), areaEquivalentTexelsPerMetre: sourceArea ? Math.sqrt(uvArea / sourceArea) : null,
      minimumTriangleTexelsPerMetre: densities[0]?.value ?? null, areaWeightedP10TexelsPerMetre: weightedQuantile(.1),
      areaWeightedMedianTexelsPerMetre: weightedQuantile(.5), areaWeightedP90TexelsPerMetre: weightedQuantile(.9),
      areaBelow8TexelsPerMetreFraction: sourceArea ? densities.filter(d => d.value < 8).reduce((a, d) => a + d.weight, 0) / sourceArea : null};
  };
  return {all: summary(triangles), priority: summary(triangles.filter(t => t.priority)),
    priorityDefinition: 'Same conservative near-lamp, below-lamp, source-normal-facing centroid bucket as source-metrics.mjs; not actual visibility or irradiance',
    charts: charts.map(c => ({id: c.id, ...summary(c.triangles), sourceTriangleExamples: c.triangles.slice(0, 5).map(t => t.id)})),
    limitation: 'Area density does not measure directional stretch, irradiance detail, or bake quality; eight texels per metre is an art target, not a UV transfer PASS condition'};
}

function rasterAudit(triangles) {
  const pixels = new Int32Array(options.width * options.height); pixels.fill(-1);
  let occupied = 0, crossChartTexelCollisions = 0, trianglesWithoutTexelCenter = 0;
  for (const t of triangles) {
    let hits = 0;
    const y0 = Math.max(0, Math.ceil(t.bounds[1] - .5)), y1 = Math.min(options.height - 1, Math.floor(t.bounds[3] - .5));
    for (let y = y0; y <= y1; y++) {
      const cy = y + .5, xs = [];
      for (let k = 0; k < 3; k++) {
        const a = t.pixels[k], b = t.pixels[(k + 1) % 3];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      if (xs.length < 2) continue;
      const x0 = Math.max(0, Math.ceil(Math.min(...xs) - .5)), x1 = Math.min(options.width - 1, Math.floor(Math.max(...xs) - .5));
      for (let x = x0; x <= x1; x++) {
        hits++; const index = y * options.width + x;
        if (pixels[index] === -1) { occupied++; pixels[index] = t.chart; }
        else if (pixels[index] !== t.chart) crossChartTexelCollisions++;
      }
    }
    if (!hits) trianglesWithoutTexelCenter++;
  }
  return {width: options.width, height: options.height, occupiedTexelCenters: occupied,
    occupancyFraction: occupied / pixels.length, crossChartTexelCollisions, trianglesWithoutTexelCenter,
    method: 'Triangle scanlines at texel centers; half-open Y edges. This is coverage information, not a substitute for exact overlap/padding tests.'};
}

function selfTest() {
  const triangle = [[0, 0], [4, 0], [0, 4]];
  assert.equal(clippedTriangleArea(triangle, triangle), 8, 'Identical triangles overlap');
  assert.equal(clippedTriangleArea(triangle, [[4, 0], [4, 4], [0, 4]]), 0, 'A shared diagonal is not positive-area overlap');
  assert.equal(clippedTriangleArea(triangle, [[1, 0], [5, 0], [1, 4]]), 4.5, 'Partial overlap has exact measured area');
  assert.equal(clippedTriangleArea(triangle, [[0, 4], [4, 0], [0, 0]]), 8, 'Clip orientation may be clockwise');
  assert.equal(segmentDistance([0, 0], [10, 0], [3, 5], [7, 5]), 5, 'Interior segment distance beats endpoint distance');
  assert.equal(segmentDistance([0, 0], [10, 0], [12, 0], [14, 0]), 2, 'Collinear gap is measured');
  assert.equal(segmentDistance([0, 0], [10, 0], [5, -2], [5, 2]), 0, 'Crossing segments have no padding');
  assert.equal(cyclicKey([2, 7, 5]), cyclicKey([7, 5, 2]), 'Cyclic source corner rotation is accepted');
  assert.notEqual(cyclicKey([2, 7, 5]), cyclicKey([2, 5, 7]), 'Reversed winding stays distinct');
  const build = (id, sourceIds, positions, uv) => ({id, sourceIds, positions, uv,
    pixels: uv.map(p => p.map(n => n * 64)), bounds: bounds2(uv.map(p => p.map(n => n * 64)))});
  const a = build(0, [0, 1, 2], [[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[.125, .125], [.25, .125], [.125, .25]]);
  const b = build(1, [3, 4, 5], [[1, 0, 0], [1, 1, 0], [0, 1, 0]], [[.25, .125], [.25, .25], [.125, .25]]);
  const welded = buildCharts([a, b]);
  assert.equal(welded.charts.length, 1, 'Coincident source position edges bridge authored ID splits');
  assert.equal(welded.weldedPositionEdges, 1);
  assert.equal(welded.boundaryEdges.length, 4);
  assert.equal(auditOverlap([a, b]).overlapPairs, 0);
  const oldWidth = options.width, oldHeight = options.height;
  options.width = 64; options.height = 64;
  const c = build(2, [6, 7, 8], [[3, 0, 0], [4, 0, 0], [3, 1, 0]], [[.5, .125], [.625, .125], [.5, .25]]);
  const d = build(3, [9, 10, 11], [[4, 0, 0], [4, 1, 0], [3, 1, 0]], [[.625, .125], [.625, .25], [.5, .25]]);
  const separate = buildCharts([a, b, c, d]);
  assert.equal(separate.charts.length, 2);
  const padded = auditPadding([a, b, c, d], separate.boundaryEdges);
  assert.equal(padded.minimumChartPaddingPixels, 8, 'Eight border pixels plus sixteen inter-chart pixels pass');
  const coverage = rasterAudit([a, b, c, d]);
  assert.equal(coverage.occupiedTexelCenters, 128, 'Two eight-pixel-square charts cover 128 texel centers');
  assert.equal(coverage.crossChartTexelCollisions, 0);
  // A tiny positive gap is not accepted as eight-pixel padding.
  for (const t of [c, d]) {
    t.uv = t.uv.map(([u, v]) => [u - .125, v]);
    t.pixels = t.uv.map(p => p.map(n => n * 64)); t.bounds = bounds2(t.pixels);
  }
  const closer = buildCharts([a, b, c, d]);
  assert.equal(auditPadding([a, b, c, d], closer.boundaryEdges).minimumChartPaddingPixels, 4);
  options.width = oldWidth; options.height = oldHeight;
  console.log('PASS: exact triangle overlap, shared boundaries, segment padding, cyclic identity, position-welded charts, atlas border and texel-center occupancy');
}
