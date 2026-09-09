/** Publish the root-reviewed variant 1 into the unchanged canyon-buttress family. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const source=fileURLToPath(new URL('./',import.meta.url));
const root=path.resolve(source,'../../../..'),publicDir=path.join(root,'public/assets/inkstorm');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json'),validator=require('gltf-validator');
const checkOnly=process.argv.includes('--check');
const pairs=[
 {asset:'canyon-buttress.glb',candidate:'boulder-1-high.glb',sha256:'ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6',previousSha256:'a65200e93cf582925bd4ee496e9a91569152156e59c56a23a157bd8a66b708e2'},
 {asset:'canyon-buttress-lod.glb',candidate:'boulder-1-lod.glb',sha256:'9262af74e76f008803f96c21a17bfbe62eca2098648f58640a716d20de75f21a',previousSha256:'a358427e62edcfaf1a1e3308b3662ecd9715078c6066717099f9902a3c671e7c'},
];
const candidateReceipt=JSON.parse(await readFile(path.join(source,'boulder-candidate-receipt.json'),'utf8'));
const before=new Map();
for(const file of(await readdir(publicDir)).sort())before.set(file,hash(await readFile(path.join(publicDir,file))));
for(const pair of pairs){
 const bytes=await readFile(path.join(source,pair.candidate));assert.equal(hash(bytes),pair.sha256);
 const record=candidateReceipt.assets.find(a=>a.asset===pair.candidate);assert.equal(record.sha256,pair.sha256);
 assert.deepEqual(record.bounds,{min:[-40,0,-50],max:[40,120,50]});
 assert.equal(record.topology.boundaryEdges,0);assert.equal(record.topology.nonManifoldEdges,0);assert.equal(record.topology.connectedComponents,1);
 const validation=await validator.validateBytes(bytes,{uri:pair.asset,maxIssues:1000});assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
 if(checkOnly){assert.equal(before.get(pair.asset),pair.sha256);continue;}
 assert([pair.previousSha256,pair.sha256].includes(before.get(pair.asset)),'Unexpected outgoing bytes: '+pair.asset);
 const archive=path.join(source,'history-pre-scan-buttress');await mkdir(archive,{recursive:true});
 // Always retain the known pre-swap bytes, even on an idempotent rerun.
 const prior=await readFile(path.join(root,'assets/source/inkstorm/geology-revision/history-round13',pair.asset));
 assert.equal(hash(prior),pair.previousSha256);
 await writeFile(path.join(archive,pair.asset),prior);
 await writeFile(path.join(publicDir,pair.asset),bytes);
}
const files=[];
for(const asset of(await readdir(publicDir)).sort()){
 const bytes=await readFile(path.join(publicDir,asset)),sha256=hash(bytes);
 if(!pairs.some(p=>p.asset===asset))assert.equal(sha256,before.get(asset),'Unrelated asset changed during publication: '+asset);
 const record={asset,bytes:bytes.length,sha256};
 if(asset.endsWith('.glb')){
  const validation=await validator.validateBytes(bytes,{uri:asset,maxIssues:1000});assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
  record.validation={errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,infos:validation.issues.numInfos,hints:validation.issues.numHints};
 }
 files.push(record);
}
const receipt={date:'2026-09-07',scope:'Variant 1 published only to canyon-buttress high/LOD. Variant 2 and rejected cliff-patch experiments remain staged. No family, placement, renderer, collision, gameplay or browser/build changes.',review:'Root inspected neutral high-detail source/procedural/candidate renders and accepted variant 1 for a local public-family integration. In-world visual acceptance and performance remain pending.',source:'Poly Haven boulder_01 by Rico Cilliers, CC0; original URLs/MD5/SHA and local original-file archive in boulder-source-download-receipt.json',candidateReceipt:'boulder-candidate-receipt.json',sourceArchive:'history-pre-scan-buttress',preservation:'Outgoing round-13 broad high/LOD bytes archived exactly; all other public files checked unchanged during this publication. Original raw scan files and all earlier failed experiments retained.',pairs,publicAssetFiles:files,performance:'28000 / 4200 triangles replaces 7990 / 1798. Existing 240m LOD contract unchanged. Fresh integrated frame-rate measurement required; no new FPS claim.',planting:'Variant 1 retains a pointed basal corner; the in-world review should assess whether the existing -1.5m planting needs deeper terrain embed. No placements changed here.'};
if(!checkOnly){
 for(const filename of['publish_mixed_geology.mjs','mixed-geology-receipt.json']){
  try{await copyFile(path.join(root,'assets/source/inkstorm',filename),path.join(source,'history-pre-scan-buttress',filename),constants.COPYFILE_EXCL);}
  catch(error){if(error.code!=='EEXIST')throw error;}
 }
 await writeFile(path.join(source,'public-geology-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify({status:'PASS',checkOnly,publicFiles:files.length,publicGLBs:files.filter(x=>x.validation).length,published:pairs.map(pair=>files.find(f=>f.asset===pair.asset))},null,2));
