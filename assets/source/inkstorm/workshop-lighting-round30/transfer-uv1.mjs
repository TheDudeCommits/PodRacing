/** Future CPU packaging: transfer only Blender UV corners onto exact v4 data.
 * Requires validated <family>.uv-corners.json in this folder; no Blender launch.
 * Run only after root authorizes and the documented UV validation passes.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const family=process.argv[2];assert(['pit-complex','pit-district'].includes(family),'Supply exactly pit-complex or pit-district');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const validator=require('gltf-validator'),io=new NodeIO(),sha=b=>createHash('sha256').update(b).digest('hex');
const metrics=JSON.parse(await readFile(path.join(here,'source-metrics.json'))),asset=metrics.assets.find(a=>a.family===family);
const uv=JSON.parse(await readFile(path.join(here,`${family}.uv-corners.json`)));
assert.equal(uv.sourceSha256,asset.sha256);assert.equal(uv.uvOrigin,'BLENDER_BOTTOM_LEFT');assert.equal(uv.uvValidation.status,'PASS');
assert.equal(uv.uvValidation.overlapPairs,0);assert(uv.uvValidation.minimumChartPaddingPixels>=8);
const bytes=await readFile(path.join(root,asset.path));assert.equal(sha(bytes),asset.sha256);
const doc=await io.readBinary(bytes),r=doc.getRoot(),p=r.listMeshes()[0].listPrimitives()[0],originalIndices=p.getIndices().getArray().slice();
const originals=Object.fromEntries(p.listSemantics().map(s=>[s,{accessor:p.getAttribute(s),array:p.getAttribute(s).getArray().slice(),size:p.getAttribute(s).getElementSize()}]));
assert(!originals.TEXCOORD_0&&!originals.TEXCOORD_1);
assert.equal(uv.triangles.length,originalIndices.length/3);
const faces=new Map(uv.triangles.map(t=>[t.sourceTriangleId,t]));assert.equal(faces.size,uv.triangles.length);
const vertexMap=new Map(),newSourceVertices=[],uvValues=[],indices=[];
const floatKey=n=>{const a=new Float32Array([n]);return new Uint32Array(a.buffer)[0];};
for(let face=0;face<originalIndices.length/3;face++) {
  const record=faces.get(face);assert(record);assert.equal(record.corners.length,3);
  for(let k=0;k<3;k++) {
    const sourceVertex=originalIndices[face*3+k],matches=record.corners.filter(c=>c.sourceVertexId===sourceVertex);assert.equal(matches.length,1);
    const [u,vBlender]=matches[0].uv;assert([u,vBlender].every(n=>Number.isFinite(n)&&n>=0&&n<=1));
    const v=1-vBlender;const key=`${sourceVertex}:${floatKey(u)}:${floatKey(v)}`;
    let index=vertexMap.get(key);if(index===undefined){index=newSourceVertices.length;vertexMap.set(key,index);newSourceVertices.push(sourceVertex);uvValues.push(u,v);}
    indices.push(index);
  }
}
for(const [semantic,a] of Object.entries(originals)) {
  const values=new a.array.constructor(newSourceVertices.length*a.size);
  newSourceVertices.forEach((old,index)=>values.set(a.array.subarray(old*a.size,(old+1)*a.size),index*a.size));a.accessor.setArray(values);
}
const IndexArray=newSourceVertices.length<65535?Uint16Array:Uint32Array;p.getIndices().setArray(new IndexArray(indices));
const buffer=p.getAttribute('POSITION').getBuffer();
const uvAccessor=doc.createAccessor(`${family}-workshop-lightmap-uv`).setType('VEC2').setArray(new Float32Array(uvValues)).setBuffer(buffer);
// glTF2 indexed semantic sets must start at0 and be consecutive. No source UV0
// existed; alias it to the same accessor so TEXCOORD_1 is standards compliant.
p.setAttribute('TEXCOORD_0',uvAccessor);p.setAttribute('TEXCOORD_1',uvAccessor);
const out=await io.writeBinary(doc),check=await io.readBinary(out),q=check.getRoot().listMeshes()[0].listPrimitives()[0],newIndices=q.getIndices().getArray();
assert.equal(check.getRoot().listMeshes().length,1);assert.equal(q.getIndices().getCount(),originalIndices.length);assert.equal(check.getRoot().listMaterials().length,1);
// Exact per-corner preservation survives UV-induced seam splitting. This is
// stronger than comparing bounds or geometry with a floating-point epsilon.
for(const [semantic,a] of Object.entries(originals)) {
  const data=q.getAttribute(semantic).getArray();
  for(let corner=0;corner<originalIndices.length;corner++)for(let c=0;c<a.size;c++)
    assert.equal(data[newIndices[corner]*a.size+c],a.array[originalIndices[corner]*a.size+c],`${semantic} corner ${corner}`);
}
const validation=await validator.validateBytes(out,{uri:`${family}-workshop-lightmap.glb`,maxIssues:1000});assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
await mkdir(path.join(here,'candidates'),{recursive:true});const target=path.join(here,'candidates',`${family}-workshop-lightmap.glb`);await writeFile(target,out);
const report={status:'UV_TRANSFER_VALIDATED_NOT_BAKE_OR_RUNTIME_ACCEPTANCE',sourceSha256:asset.sha256,outputSha256:sha(out),triangles:indices.length/3,sourceVertices:asset.vertices,vertices:newSourceVertices.length,vertexGrowth:newSourceVertices.length-asset.vertices,bytes:out.length,originalCornerAttributesExact:true,uv0AliasesUv1:true,uvOriginConversion:'V_glTF=1-V_Blender; runtime texture.flipY=false',validation:validation.issues};
await writeFile(path.join(here,`${family}-uv-transfer.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
