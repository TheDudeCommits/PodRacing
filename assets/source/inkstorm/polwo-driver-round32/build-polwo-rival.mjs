/** Source-only genuine LOD; immutable hero input, retained original vertex attributes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const input = path.resolve(option('--input') ?? 'MISSING');
const reference = path.resolve(option('--uncapped-reference') ?? 'MISSING');
const outputDir = path.resolve(option('--output-dir') ?? 'MISSING');
assert(outputDir.startsWith(ROOT + path.sep), 'Output must be inside source-only Polwo directory');
const req = createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const imp = name => import(pathToFileURL(req.resolve(name)).href);
const {NodeIO} = await imp('@gltf-transform/core');
const {ALL_EXTENSIONS} = await imp('@gltf-transform/extensions');
const {compactPrimitive, prune, reorder} = await imp('@gltf-transform/functions');
const {MeshoptSimplifier, MeshoptEncoder} = await imp('meshoptimizer');
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await readFile(input), referenceBytes = await readFile(reference);
const sourceHash = digest(sourceBytes), referenceHash = digest(referenceBytes);
const base = await io.readBinary(sourceBytes), old = await io.readBinary(referenceBytes);
const partName = node => node.getName().match(/^polwo-(?:body-[01]|pilot-(?:accent|hardware|rubber|shell|suit|webbing))/)?.[0];
const nodesByName = document => new Map(document.getRoot().listNodes().filter(n => n.getMesh()).map(n => [partName(n), n]));
const originalNodes = nodesByName(base), referenceNodes = nodesByName(old);
assert(originalNodes.size === 8 && referenceNodes.size === 8 && !originalNodes.has(undefined));
const contract = document => document.getRoot().listNodes().map(n => ({name:n.getName(), translation:n.getTranslation(), rotation:n.getRotation(), scale:n.getScale(), children:n.listChildren().map(c=>c.getName())}));
const positionKey = (array,index) => Array.from(array.subarray(index*3,index*3+3)).join(',');
const triangleKey = (pos,ind,i) => [positionKey(pos,ind[i]),positionKey(pos,ind[i+1]),positionKey(pos,ind[i+2])].sort().join('|');
const imageHashes = document => document.getRoot().listTextures().map(t => [t.getName(),digest(t.getImage())]);
const originalImages = imageHashes(base);
const protectedByPart = new Map();
for (const [name,node] of originalNodes) {
  const p=node.getMesh().listPrimitives()[0], before=referenceNodes.get(name).getMesh().listPrimitives()[0];
  const pos=p.getAttribute('POSITION').getArray(), ind=p.getIndices().getArray();
  const oldPos=before.getAttribute('POSITION').getArray(), oldInd=before.getIndices().getArray();
  const oldFaces=new Set();
  for(let i=0;i<oldInd.length;i+=3) oldFaces.add(triangleKey(oldPos,oldInd,i));
  const protectedPositions=new Set(), protectedFaces=new Set(); let addedTriangles=0;
  for(let i=0;i<ind.length;i+=3) if(!oldFaces.has(triangleKey(pos,ind,i))) {
    addedTriangles++;
    protectedFaces.add(triangleKey(pos,ind,i));
    for(let k=0;k<3;k++) protectedPositions.add(positionKey(pos,ind[i+k]));
  }
  // Preserve exact extreme positions (all split normal/UV duplicates at those points).
  for(let c=0;c<3;c++) for(const sign of [-1,1]) {
    let best=0;
    for(let i=1;i<pos.length/3;i++) if(sign*pos[i*3+c]>sign*pos[best*3+c]) best=i;
    protectedPositions.add(positionKey(pos,best));
  }
  protectedByPart.set(name,{protectedPositions,protectedFaces,addedTriangles});
}
await mkdir(outputDir,{recursive:true});
const trialReports=[];
let accepted;
const targets={'polwo-body-0':19200,'polwo-body-1':544,'polwo-pilot-accent':188,'polwo-pilot-hardware':1100,
  'polwo-pilot-rubber':1000,'polwo-pilot-shell':1100,'polwo-pilot-suit':5000,'polwo-pilot-webbing':700};
const trials=[{name:'01-topology-locked',error:.001,flags:['LockBorder'],attributes:false},
              {name:'02-attribute-seams',error:.006,flags:['Permissive'],attributes:true}];
for(const trial of trials) {
  const document=await io.readBinary(sourceBytes), parts=[];
  for(const [name,node] of nodesByName(document)) {
    const prim=node.getMesh().listPrimitives()[0];
    assert.equal(node.getMesh().listPrimitives().length,1);
    const position=prim.getAttribute('POSITION'), normals=prim.getAttribute('NORMAL'), uv=prim.getAttribute('TEXCOORD_0');
    const pos=position.getArray(), indices=new Uint32Array(prim.getIndices().getArray()), before=indices.length/3;
    const locks=new Uint8Array(position.getCount());
    for(let i=0;i<locks.length;i++) if(protectedByPart.get(name).protectedPositions.has(positionKey(pos,i))) locks[i]=1;
    let next=indices,error=0;
    if(before>targets[name]) {
      if(trial.attributes) {
        const a=new Float32Array(position.getCount()*5), n=normals.getArray(), t=uv.getArray();
        for(let i=0;i<position.getCount();i++) {for(let c=0;c<3;c++)a[i*5+c]=n[i*3+c];for(let c=0;c<2;c++)a[i*5+3+c]=t[i*2+c];}
        [next,error]=MeshoptSimplifier.simplifyWithAttributes(indices,pos,3,a,5,[.1,.1,.1,1,1],locks,targets[name]*3,trial.error,trial.flags);
      } else [next,error]=MeshoptSimplifier.simplifyWithAttributes(indices,pos,3,new Float32Array(position.getCount()),1,[0],locks,targets[name]*3,trial.error,trial.flags);
      prim.getIndices().setArray(next);compactPrimitive(prim);
    }
    assert(next.length>0 && next.length%3===0);
    parts.push({name,beforeTriangles:before,afterTriangles:next.length/3,error,lockedVertices:Array.from(locks).filter(Boolean).length,
      protectedNewCapTriangles:protectedByPart.get(name).addedTriangles});
    // Every original vertex in a newly capped triangle remains present at the same position.
    const remainingPos=prim.getAttribute('POSITION').getArray();const remaining=new Set();
    for(let i=0;i<remainingPos.length/3;i++)remaining.add(positionKey(remainingPos,i));
    for(const p of protectedByPart.get(name).protectedPositions)assert(remaining.has(p),'Protected cap/extreme vertex removed');
    const afterIndices=prim.getIndices().getArray(), afterFaces=new Set();
    for(let i=0;i<afterIndices.length;i+=3)afterFaces.add(triangleKey(remainingPos,afterIndices,i));
    for(const face of protectedByPart.get(name).protectedFaces)assert(afterFaces.has(face),'An authored shoulder-cap triangle changed');
  }
  const triangles=parts.reduce((n,p)=>n+p.afterTriangles,0);
  await document.transform(prune({keepLeaves:true,keepAttributes:true,keepSolidTextures:true}));
  assert.deepEqual(contract(document),contract(base));assert.deepEqual(imageHashes(document),originalImages);
  const outputPath=path.join(outputDir,trial.name+'.glb');
  try{await access(outputPath);throw new Error('Refusing overwrite '+outputPath);}catch(e){if(e.code!=='ENOENT')throw e;}
  const bytes=await io.writeBinary(document);await writeFile(outputPath,bytes,{flag:'wx'});
  trialReports.push({...trial,triangles,parts,path:outputPath,sha256:digest(bytes),withinRivalGeometryBudget:triangles<=30000});
  if(triangles<=30000) {accepted=document;break;}
}
const report={input,inputSha256:sourceHash,uncappedReference:reference,uncappedReferenceSha256:referenceHash,
  sourcePreserved:digest(await readFile(input))===sourceHash,trials:trialReports,
  method:'Original vertex subset only; positions, UVs, normals, tangents not interpolated; no component pruning; capped triangles/extreme positions protected',
  normalWeights:[.1,.1,.1],uvWeights:[1,1],visualAcceptance:false};
if(accepted) {
  await accepted.transform(reorder({encoder:MeshoptEncoder,target:'performance'}));
  assert.deepEqual(contract(accepted),contract(base));assert.deepEqual(imageHashes(accepted),originalImages);
  const bytes=await io.writeBinary(accepted);const filename=path.join(outputDir,'03-rival-reordered.glb');
  await writeFile(filename,bytes,{flag:'wx'});report.output=filename;report.outputSha256=digest(bytes);
} else report.failure='Bounded simplification did not meet the 30k limit; further authored LOD work required';
await writeFile(path.join(outputDir,'lod-receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:report.output,triangles:trialReports.at(-1).triangles,sourcePreserved:report.sourcePreserved,failure:report.failure},null,2));
if(!accepted)process.exitCode=1;
