import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=req('@gltf-transform/core');
const {weld,simplify}=req('@gltf-transform/functions');
const {MeshoptSimplifier}=req('meshoptimizer');
const base=path.dirname(new URL(import.meta.url).pathname);
const io=new NodeIO();const native=await io.read(path.join(base,'teemto-damage-b-native.glb'));
const required=new Set(['teemto-damage-cockpit-stubs-v16','teemto-damage-severed-tethers-v16','teemto-damage-right-front-v16','teemto-damage-right-rear-v16']);
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
const hero=path.join(base,'teemto-damage-hero-v16.glb');await io.write(hero,native);const heroBytes=await fs.readFile(hero);
await MeshoptSimplifier.ready;const rival=await io.read(hero);await rival.transform(simplify({simplifier:MeshoptSimplifier,ratio:.5,error:.001,lockBorder:true}));
const rivalRows=signature(rival);const rivalChanged=rivalRows.reduce((s,x)=>s+x.triangles,0);if(rivalChanged+8776>30000)throw Error('Rival replacement exceeds30k: '+rivalChanged);
const rivalPath=path.join(base,'teemto-damage-rival-v16.glb');await io.write(rivalPath,rival);const rivalBytes=await fs.readFile(rivalPath);
const receipt={scope:'Private geometry-only packaging. Bitwise identical vertex weld preserves ordered hero triangle POSITION/NORMAL/UV streams. Rival is explicitly lossy meshoptimizer simplification, no normals recomputed, no new textures. Runtime validation and visual acceptance pending.',nativeBefore:before,heroAfterWeld:after,hero:{path:hero,bytes:heroBytes.length,sha256:hash(heroBytes),replacementTriangles:30719,visibleWithRetainedTriangles:58624},rival:{path:rivalPath,bytes:rivalBytes.length,sha256:hash(rivalBytes),geometry:rivalRows,replacementTriangles:rivalChanged,retainedTriangles:8776,visibleWithRetainedTriangles:rivalChanged+8776,simplification:{ratio:.5,error:.001,lockBorder:true}},textures:0,materials:0};
await fs.writeFile(path.join(base,'private-package-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
