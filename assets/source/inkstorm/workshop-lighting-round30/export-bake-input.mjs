/** Read-only source extraction. Does not open Blender or create UVs/bakes. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);const io=new NodeIO();
const metrics=JSON.parse(await readFile(path.join(here,'source-metrics.json')));
await mkdir(path.join(here,'inputs'),{recursive:true});
for(const asset of metrics.assets) {
  const bytes=await readFile(path.join(root,asset.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  const doc=await io.readBinary(bytes),p=doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const attributes=Object.fromEntries(p.listSemantics().map(semantic=>{const a=p.getAttribute(semantic);return[semantic,{elementSize:a.getElementSize(),componentType:a.getComponentType(),type:a.getType(),normalized:a.getNormalized(),values:Array.from(a.getArray())}];}));
  const input={status:'FROZEN_V4_INPUT_NOT_BAKED',family:asset.family,sourcePath:asset.path,sourceSha256:asset.sha256,
    coordinateSystem:'GLB meters: +Y up, +Z front. Blender import must use (x,-z,y), including normals.',
    attributes,indices:Array.from(p.getIndices().getArray()),triangleIdentity:'sourceTriangleId = original index-array offset / 3; sourceVertexId = original attribute row'};
  await writeFile(path.join(here,'inputs',`${asset.family}.json`),JSON.stringify(input)+'\n');
  console.log(JSON.stringify({family:asset.family,sourceSha256:asset.sha256,triangles:input.indices.length/3,attributes:Object.fromEntries(Object.entries(attributes).map(([s,a])=>[s,{elementSize:a.elementSize,type:a.type}]))}));
}
