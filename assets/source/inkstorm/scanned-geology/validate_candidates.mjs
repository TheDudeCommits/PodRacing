/** Optimize staged scan derivatives and build color-aware LODs. Never publishes. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const {ALL_EXTENSIONS}=await import(pathToFileURL(require.resolve('@gltf-transform/extensions')).href);
const {compactPrimitive,dedup,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const {MeshoptSimplifier}=await import(pathToFileURL(require.resolve('meshoptimizer')).href);
const validator=require('gltf-validator');
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected={min:[-40,0,-50],max:[40,120,50]};
async function validate(bytes,name,budget){
 const report=await validator.validateBytes(bytes,{uri:name,maxIssues:1000});
 assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
 const document=await io.readBinary(bytes),r=document.getRoot(),primitives=r.listMeshes().flatMap(m=>m.listPrimitives());
 assert.equal(r.listMeshes().length,1);assert.equal(primitives.length,1);assert.equal(r.listMaterials().length,1);assert.equal(r.listTextures().length,0);
 const p=primitives[0],position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),color=p.getAttribute('COLOR_0');
 for(const a of[position,normal,color]){assert(a);assert(Array.from(a.getArray()).every(Number.isFinite));}
 const normalLengths=Array.from({length:normal.getCount()},(_,i)=>Math.hypot(...normal.getElement(i,[])));
 assert(Math.min(...normalLengths)>.999&&Math.max(...normalLengths)<1.001);
 assert(color.getMin([]).every(v=>v>=0)&&color.getMax([]).every(v=>v<=1));
 const bounds={min:position.getMin([]),max:position.getMax([])};assert.deepEqual(bounds,expected);
 const triangles=p.getIndices().getCount()/3;assert(triangles<=budget);
 return {asset:name,sha256:hash(bytes),bytes:bytes.length,triangles,vertices:position.getCount(),meshes:1,primitives:1,materials:1,textures:0,attributes:p.listSemantics(),bounds,normals:{min:Math.min(...normalLengths),max:Math.max(...normalLengths)},validation:report.issues};
}
const assets=[];
for(const index of[1,2]){
 const raw=await readFile(path.join(root,`candidate-${index}-raw-high.glb`));
 const doc=await io.readBinary(raw),r=doc.getRoot(),p=r.listMeshes()[0].listPrimitives()[0];
 r.listMeshes()[0].setName(`scanned-sandstone-${index}`);r.listNodes().forEach(n=>n.setName(`scanned-sandstone-${index}`));
 const priorMaterial=p.getMaterial();p.setMaterial(doc.createMaterial(`Inkstorm_Painted_Sandstone_${index}`).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.94));priorMaterial.dispose();
 await doc.transform(dedup(),prune());
 const highBytes=await io.writeBinary(doc),highRecord=await validate(highBytes,`candidate-${index}-high.glb`,35000);
 const low=await io.readBinary(highBytes),primitive=low.getRoot().listMeshes()[0].listPrimitives()[0];
 const positions=primitive.getAttribute('POSITION').getArray(),normals=primitive.getAttribute('NORMAL').getArray(),color=primitive.getAttribute('COLOR_0');
 const colors=color.getArray(),components=colors.length/color.getCount(),attributes=new Float32Array(positions.length*2);
 for(let i=0;i<positions.length/3;i++)for(let c=0;c<3;c++){attributes[i*6+c]=normals[i*3+c];attributes[i*6+c+3]=colors[i*components+c];}
 const original=new Uint32Array(primitive.getIndices().getArray());
 const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(original,positions,3,attributes,6,[.2,.2,.2,.4,.4,.4],null,4200*3,.035,['Permissive']);
 primitive.getIndices().setArray(indices);compactPrimitive(primitive);await low.transform(dedup(),prune());
 // Real LOD geometry is gently normalized to the same six bounds. No isolated
 // extrema triangles or disconnected sentinel vertices are introduced.
 const position=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL');
 const min=position.getMin([]),max=position.getMax([]),scales=min.map((v,c)=>(expected.max[c]-expected.min[c])/(max[c]-v));
 const data=position.getArray(),normalData=normal.getArray();
 for(let i=0;i<position.getCount();i++){
  for(let c=0;c<3;c++){data[i*3+c]=(data[i*3+c]-min[c])*scales[c]+expected.min[c];normalData[i*3+c]/=scales[c];}
  const length=Math.hypot(...normalData.subarray(i*3,i*3+3));for(let c=0;c<3;c++)normalData[i*3+c]/=length;
 }
 const lowBytes=await io.writeBinary(low),lowRecord=await validate(lowBytes,`candidate-${index}-lod.glb`,5000);
 await writeFile(path.join(root,highRecord.asset),highBytes);await writeFile(path.join(root,lowRecord.asset),lowBytes);
 assets.push({sourceAsset:index===1?'rock_face_01':'rock_face_02',rawSha256:hash(raw),high:highRecord,lod:{...lowRecord,relativeAttributeAwareError:error,boundsNormalizationScales:scales}});
}
const receipt={date:'2026-09-07',status:'Staged art experiments only; not accepted or published',provenance:'CC0 Poly Haven scans; raw URLs, original provider MD5, SHA and local original-file archives in source-download-receipt.json',sourceScript:'build_closed_masses.py',sourceScriptSha256:hash(await readFile(path.join(root,'build_closed_masses.py'))),paint:'Original diffuse luminance and ARM red ambient occlusion sampled into restricted vertex colors; moss/green source chroma discarded; no raster images edited or shipped',mesh:'Actual source fracture geometry reduced to about 15.3k front triangles, curved around a broad mass, paired with an asymmetric reversed rear, closed by authored faceted flanks/crown; no open boundary or non-manifold edges before glTF export',blenderTopology:[{source:'rock_face_01',removedScanOverlapAndPinchFaces:1,highBoundaryEdges:0,highNonManifoldEdges:0,signedVolume:475202.7718560386},{source:'rock_face_02',removedScanOverlapAndPinchFaces:26,highBoundaryEdges:0,highNonManifoldEdges:0,signedVolume:514424.93178212177}],visualLimitation:'Real irregular fracture detail is stronger on the scanned faces, but the backed crown/flanks still look manufactured. Review before any replacement; neutral asset renders do not establish in-world quality or concept parity.',performance:'High assets are about 4.2 times the old 7990-triangle broad buttress; 4.2k LODs also exceed the old 1798-triangle LOD. No FPS claim; use sparse near landmarks if accepted and benchmark actual runtime.',assets};
await writeFile(path.join(root,'candidate-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(assets.map(a=>({source:a.sourceAsset,high:{triangles:a.high.triangles,bytes:a.high.bytes,sha256:a.high.sha256},lod:{triangles:a.lod.triangles,bytes:a.lod.bytes,sha256:a.lod.sha256,normalization:a.lod.boundsNormalizationScales}})),null,2));
