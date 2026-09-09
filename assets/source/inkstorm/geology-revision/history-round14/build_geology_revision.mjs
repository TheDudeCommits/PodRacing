/** Optimize/validate only the new buttress and its LOD; preserve prior assets.
 * Blender stage: send literal build_geology_revision.py through Blender MCP.
 * Tools: existing /tmp/inkstorm-rock-lod-tools (versions in receipt).
 * Run: node assets/source/inkstorm/build_geology_revision.mjs
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const checkOnly=process.argv.includes('--check');
const toolRoot=path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--'))??'/tmp/inkstorm-rock-lod-tools');
const require=createRequire(path.join(toolRoot,'package.json'));
const toolImport=name=>import(pathToFileURL(require.resolve(name)).href);
const {NodeIO}=await toolImport('@gltf-transform/core');
const {compactPrimitive,dedup,prune}=await toolImport('@gltf-transform/functions');
const {MeshoptSimplifier}=await toolImport('meshoptimizer');
const validator=require('gltf-validator');
await MeshoptSimplifier.ready;
const io=new NodeIO(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=path.join(root,'assets/source/inkstorm'),stage=path.join(source,'geology-revision');
const publish=path.join(root,'public/assets/inkstorm'),history=path.join(stage,'history-round13');
const expected={min:[-40,0,-50],max:[40,120,50]};

function summarize(document){
 const r=document.getRoot(),meshes=r.listMeshes(),primitives=meshes.flatMap(mesh=>mesh.listPrimitives());
 assert.equal(meshes.length,1);assert.equal(primitives.length,1);assert.equal(r.listMaterials().length,1);
 const p=primitives[0],position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),color=p.getAttribute('COLOR_0');
 assert(position&&normal&&color);assert.equal(p.getMode(),4);
 assert.equal(normal.getCount(),position.getCount());assert.equal(color.getCount(),position.getCount());
 for(const a of[position,normal,color])assert(Array.from(a.getArray()).every(Number.isFinite));
 const lengths=Array.from({length:normal.getCount()},(_,i)=>Math.hypot(...normal.getElement(i,[])));
 assert(Math.min(...lengths)>.999&&Math.max(...lengths)<1.001);
 assert(color.getMin([]).every(n=>n>=0)&&color.getMax([]).every(n=>n<=1));
 const bounds={min:position.getMin([]),max:position.getMax([])};assert.deepEqual(bounds,expected);
 return {meshCount:1,primitiveCount:1,materialCount:1,vertices:position.getCount(),triangles:p.getIndices().getCount()/3,
  attributes:p.listSemantics(),bounds,normals:{minimumLength:Math.min(...lengths),maximumLength:Math.max(...lengths),finite:true},
  colors:{min:color.getMin([]),max:color.getMax([]),finite:true,withinUnitRange:true}};
}

async function validate(bytes,name,budget){
 const report=await validator.validateBytes(bytes,{uri:name,maxIssues:1000});
 assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
 const summary=summarize(await io.readBinary(bytes));assert(summary.triangles<=budget);
 return {asset:name,bytes:bytes.length,sha256:hash(bytes),...summary,
  validation:{library:'Khronos glTF Validator 2.0.0-dev.3.10',errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos,hints:report.issues.numHints,messages:report.issues.messages}};
}

const raw=await readFile(path.join(stage,'raw-canyon-buttress.glb'));
const high=await io.readBinary(raw);
high.getRoot().listMeshes()[0].setName('canyon-buttress-mesh');
high.getRoot().listNodes().forEach(node=>node.setName('canyon-buttress'));
high.getRoot().listMaterials()[0].setName('Inkstorm_Geology_R14');
await high.transform(dedup(),prune());
const highBytes=await io.writeBinary(high),highRecord=await validate(highBytes,'canyon-buttress.glb',8000);
const low=await io.readBinary(highBytes),primitive=low.getRoot().listMeshes()[0].listPrimitives()[0];
const positions=primitive.getAttribute('POSITION').getArray(),normals=primitive.getAttribute('NORMAL').getArray(),colors=primitive.getAttribute('COLOR_0').getArray();
assert.equal(primitive.getAttribute('COLOR_0').getType(),'VEC3');
const attributes=new Float32Array(positions.length*2);
for(let i=0;i<positions.length/3;i++)for(let c=0;c<3;c++){attributes[i*6+c]=normals[i*3+c];attributes[i*6+c+3]=colors[i*3+c];}
const positionKey=i=>Array.from(positions.subarray(i*3,i*3+3)).join(',');
const boundKeys=new Set();
for(let c=0;c<3;c++)for(const value of[expected.min[c],expected.max[c]])for(let i=0;i<positions.length/3;i++)if(positions[i*3+c]===value){boundKeys.add(positionKey(i));break;}
const locks=new Uint8Array(positions.length/3);
for(let i=0;i<locks.length;i++)if(boundKeys.has(positionKey(i)))locks[i]=1;
const originalIndices=new Uint32Array(primitive.getIndices().getArray());
const [indices,error]=MeshoptSimplifier.simplifyWithAttributes(originalIndices,positions,3,attributes,6,[.1,.1,.1,.6,.6,.6],locks,1798*3,.025,['Permissive']);
// Permissive reduction may discard an isolated talus component even when its
// extremal vertex is locked. Retain its real incident source triangles, rather
// than fabricating a bounds vertex or rescaling the simplified sculpture.
const retained=Array.from(indices),triangleKeys=new Set();
for(let i=0;i<retained.length;i+=3)triangleKeys.add(retained.slice(i,i+3).join(','));
for(let c=0;c<3;c++)for(const value of[expected.min[c],expected.max[c]]){
 if(retained.some(index=>positions[index*3+c]===value))continue;
 for(let i=0;i<originalIndices.length;i+=3){
  const triangle=Array.from(originalIndices.subarray(i,i+3)),key=triangle.join(',');
  if(triangle.some(index=>positions[index*3+c]===value)&&!triangleKeys.has(key)){retained.push(...triangle);triangleKeys.add(key);}
 }
}
const boundTrianglesRetained=(retained.length-indices.length)/3;
primitive.getIndices().setArray(new Uint32Array(retained));compactPrimitive(primitive);await low.transform(dedup(),prune());
const lowBytes=await io.writeBinary(low),lowRecord=await validate(lowBytes,'canyon-buttress-lod.glb',3000);
assert(lowRecord.triangles<highRecord.triangles);
if(checkOnly){
 assert.equal(hash(await readFile(path.join(publish,'canyon-buttress.glb'))),highRecord.sha256);
 assert.equal(hash(await readFile(path.join(publish,'canyon-buttress-lod.glb'))),lowRecord.sha256);
 console.log('PASS: regenerated high/LOD bytes match published GLBs exactly; all geometry/validator gates pass.');
 process.exit(0);
}

// Archive before publishing. Reproduction preserves the first round13 copies;
// subsequent runs never overwrite those original binary artifacts.
await mkdir(history,{recursive:true});
const archived=[];
for(const name of['canyon-buttress.glb','canyon-buttress-lod.glb']){
 const priorPath=path.join(history,name);
 try{await access(priorPath);}catch{await writeFile(priorPath,await readFile(path.join(publish,name)));}
 const prior=await readFile(priorPath);archived.push({asset:name,bytes:prior.length,sha256:hash(prior),path:path.relative(root,priorPath)});
}
await writeFile(path.join(publish,'canyon-buttress.glb'),highBytes);
await writeFile(path.join(publish,'canyon-buttress-lod.glb'),lowBytes);
const receipt={source:'Original Blender geometry authored through Blender MCP; not a downloaded model',sourceScript:'build_geology_revision.py',sourceSha256:hash(await readFile(path.join(source,'build_geology_revision.py'))),postprocessScript:'build_geology_revision.mjs',rawBlenderExportSha256:hash(raw),
 styleIntent:'Broad irregular vertical fracture planes, unequal split crown, two local undercuts, clustered talus and deliberate vertex-painted faces; no continuous shelf rings',
 preserved:{archived,priorSourceScriptsUnchanged:['build_fractured_rocks.py','build_rock_lods.mjs'],unrelatedPublicAssets:'Only canyon-buttress.glb and canyon-buttress-lod.glb are published by this script',originalActiveBlenderScene:'Korostyshiv Fractured Quarry Revision',originalSceneRestored:true,priorBlenderObjectsPreserved:true,noPurges:true},
 method:{optimization:'glTF Transform 4.5.0 dedup + prune',lod:'meshoptimizer 1.2.0 simplifyWithAttributes + compactPrimitive',normalWeights:[.1,.1,.1],colorWeights:[.6,.6,.6],targetTriangles:1798,errorLimit:.025,relativeAttributeAwareError:error,bounds:'All six bounding extrema locked; discarded extremal talus incident source triangles retained',boundTrianglesRetained,positionsNormalsColors:'Selected original vertex values, no attribute interpolation'},
 regeneration:['Send the literal build_geology_revision.py source through Blender MCP in its safe mode; stage directory must exist.','node assets/source/inkstorm/build_geology_revision.mjs /tmp/inkstorm-rock-lod-tools'],
 visualEvidence:['geology-revision/previous-asset-preview.png','geology-revision/revision-asset-preview.png'],visualScope:'Neutral Blender sculpture comparison, not in-world screenshot or concept-parity acceptance',assets:[highRecord,lowRecord]};
await writeFile(path.join(source,'geology-revision-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
