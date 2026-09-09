import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=req('@gltf-transform/core');
const {weld,simplify}=req('@gltf-transform/functions');
const {MeshoptSimplifier}=req('meshoptimizer');
const base=path.dirname(new URL(import.meta.url).pathname);
const io=new NodeIO();
const output=path.join(base,'packaged-b');await fs.mkdir(output,{recursive:true});
const reports=[];
for(const lod of ['hero','rival']){
const native=await io.read(path.join(base,lod==='hero'?'teemto-damage-b-native.glb':'teemto-damage-rival-b-native.glb'));
const required=new Set(lod==='hero'?['teemto-damage-cockpit-stubs-v16','teemto-damage-severed-tethers-v16','teemto-damage-right-front-v16','teemto-damage-right-rear-v16']:['teemto-damage-right-front-v16','teemto-damage-right-rear-v16']);
for(const node of native.getRoot().listNodes()){
 const canonical=node.getExtras().runtimeName;if(!required.delete(canonical))throw Error('Unexpected or repeated geometry node');
 node.setName(canonical);node.getMesh().setName(canonical+'-geometry');
}
if(required.size||native.getRoot().listTextures().length||native.getRoot().listMaterials().length)throw Error('Incomplete or textured payload');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function signature(doc){return doc.getRoot().listNodes().map(node=>{
 const p=node.getMesh().listPrimitives()[0];const indices=p.getIndices();const digest=crypto.createHash('sha256');
 for(let i=0;i<indices.getCount();i++)for(const semantic of ['POSITION','NORMAL','TEXCOORD_0']){
  const a=p.getAttribute(semantic),arr=new Float32Array(a.getElementSize());a.getElement(indices.getScalar(i),arr);digest.update(Buffer.from(arr.buffer));
 }
 return {name:node.getName(),translation:node.getTranslation(),triangles:indices.getCount()/3,cornerDataSHA256:digest.digest('hex'),vertices:p.getAttribute('POSITION').getCount()};
}).sort((a,b)=>a.name.localeCompare(b.name));}
const before=signature(native);await native.transform(weld({overwrite:true}));const after=signature(native);
for(let i=0;i<before.length;i++)if(before[i].cornerDataSHA256!==after[i].cornerDataSHA256||before[i].triangles!==after[i].triangles)throw Error('Weld changed exact ordered source corners');
const dest=path.join(output,'teemto-damage-'+lod+'-v16.glb');await io.write(dest,native);const bytes=await fs.readFile(dest);
const changed=after.reduce((sum,row)=>sum+row.triangles,0);const retained=lod==='hero'?27905:20802;
if(changed+retained>(lod==='hero'?60000:30000))throw Error('Replacement exceeds existing LOD triangle budget');
reports.push({lod,path:dest,bytes:bytes.length,sha256:hash(bytes),nativeBefore:before,afterExactWeld:after,replacementTriangles:changed,retainedTriangles:retained,visibleTriangles:changed+retained,textureCount:0,materialCount:0});
}
await fs.writeFile(path.join(base,'package-b-receipt.json'),JSON.stringify({scope:'Each variant authored from its own preserved source. Geometry-only exact attribute weld, no lossy simplification, no new textures/material payload. Every ordered triangle POSITION/NORMAL/UV stream verified unchanged through packaging.',variants:reports},null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
