// Generate tangents only on the six mapped pilot primitives. Never weld body data.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const dependencies = '/Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/';
const {NodeIO} = require(dependencies + '@gltf-transform/core');
const {generateTangents} = require(dependencies + 'mikktspace');
const base = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b/';
const io = new NodeIO();
const document = await io.read(base + 'teemto-pilot-v4b-contract.glb');
const receipt = [];
for (const mesh of document.getRoot().listMeshes()) {
  if (!mesh.getName().startsWith('Original Inkstorm pilot v4b')) continue;
  for (const primitive of mesh.listPrimitives()) {
    const oldIndices = primitive.getIndices();
    const indices = oldIndices.getArray();
    const semantics = primitive.listSemantics();
    const old = Object.fromEntries(semantics.map(key => [key, primitive.getAttribute(key)]));
    const expand = key => {
      const array = old[key].getArray();
      const width = old[key].getElementSize();
      return Float32Array.from(indices.flatMap ? indices.flatMap(i => array.slice(i * width, (i + 1) * width))
        : Array.from(indices, i => Array.from(array.slice(i * width, (i + 1) * width))).flat());
    };
    const positions = expand('POSITION');
    const normals = expand('NORMAL');
    const uvs = expand('TEXCOORD_0');
    const tangents = generateTangents(positions, normals, uvs);
    let fallbackCorners = 0;
    for (let i = 0; i < indices.length; i++) {
      const j = i * 4;
      const length = Math.hypot(tangents[j], tangents[j + 1], tangents[j + 2]);
      if (length < 1e-8 || !Number.isFinite(length)) {
        const n = Array.from(normals.slice(i * 3, i * 3 + 3));
        const axis = n.map(Math.abs).indexOf(Math.min(...n.map(Math.abs)));
        const a = [0, 0, 0]; a[axis] = 1;
        const t = [n[1]*a[2]-n[2]*a[1], n[2]*a[0]-n[0]*a[2], n[0]*a[1]-n[1]*a[0]];
        const size = Math.hypot(...t);
        if (size < 1e-8) throw new Error('Cannot define tangent for zero normal');
        tangents.set([...t.map(value => value / size), 1], j);
        fallbackCorners++;
      } else {
        // glTF tangent convention is opposite MikkTSpace's stored handedness.
        tangents[j + 3] *= -1;
      }
    }
    // Key by original index plus tangent, never by position: no authored vertex
    // or triangle is merged, and only genuine tangent discontinuities split it.
    const vertices = new Map();
    const arrays = Object.fromEntries(semantics.map(key => [key, []]));
    const tangentArray = [];
    const newIndices = [];
    for (let i = 0; i < indices.length; i++) {
      const t = Array.from(tangents.slice(i * 4, i * 4 + 4));
      const key = indices[i] + ':' + t.join(',');
      if (!vertices.has(key)) {
        vertices.set(key, vertices.size);
        for (const semantic of semantics) {
          const attribute = old[semantic];
          const width = attribute.getElementSize();
          arrays[semantic].push(...attribute.getArray().slice(indices[i] * width, (indices[i] + 1) * width));
        }
        tangentArray.push(...t);
      }
      newIndices.push(vertices.get(key));
    }
    const buffer = old.POSITION.getBuffer();
    for (const semantic of semantics) {
      const accessor = document.createAccessor().setBuffer(buffer).setType(old[semantic].getType())
        .setNormalized(old[semantic].getNormalized())
        .setArray(new (old[semantic].getArray().constructor)(arrays[semantic]));
      primitive.setAttribute(semantic, accessor);
    }
    primitive.setAttribute('TANGENT', document.createAccessor().setBuffer(buffer).setType('VEC4').setArray(new Float32Array(tangentArray)));
    primitive.setIndices(document.createAccessor().setBuffer(buffer).setType('SCALAR')
      .setArray(vertices.size > 65535 ? new Uint32Array(newIndices) : new Uint16Array(newIndices)));
    for (const attribute of [oldIndices, ...Object.values(old)]) {
      if (attribute.listParents().length === 1) attribute.dispose();
    }
    receipt.push({mesh: mesh.getName(), triangles: indices.length / 3, tangentVertices: vertices.size,
      fallbackCorners, fallbackReason: 'MikkTSpace returned a zero vector where UVs cannot define a tangent'});
  }
}
if (receipt.length !== 6) throw new Error('Expected six pilot primitives');
await io.write(base + 'teemto-pilot-v4b-tangents.glb', document);
fs.writeFileSync(base + 'tangent-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
