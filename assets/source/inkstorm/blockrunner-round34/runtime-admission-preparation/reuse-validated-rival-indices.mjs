#!/usr/bin/env node
/** Reuse the calibrated V3 rival topology ONLY if the final hero's complete
 * POSITION/NORMAL/UV/index arrays match that calibrated hero exactly. New atlas
 * bytes/material response stay from the supplied final hero. No runtime writes. */
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json'),{NodeIO}=req('@gltf-transform/core'),{ALL_EXTENSIONS}=req('@gltf-transform/extensions');
const HERE=path.dirname(fileURLToPath(import.meta.url)),BASE=path.resolve(HERE,'..'),REF=path.join(HERE,'packaged-atlas-v3-v1');
const args=Object.fromEntries(process.argv.slice(2).reduce((v,x,i,a)=>i%2===0?[...v,[x.slice(2),a[i+1]]]:v,[]));for(const k of ['input','hero-receipt','output'])if(!args[k])throw Error('Required --'+k);
const input=path.resolve(args.input),output=path.resolve(args.output),receiptPath=output.replace(/\.glb$/,'.lod-receipt.json');
if(!output.startsWith(BASE+path.sep)||input===output||output===receiptPath)throw Error('New private GLB path required');
for(const p of [output,receiptPath]){try{await fs.access(p);throw Error('Refuse overwrite '+p);}catch(e){if(e.code!=='ENOENT')throw e;}}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const raw=await fs.readFile(input),receipt=JSON.parse(await fs.readFile(args['hero-receipt'],'utf8'));
if(receipt.profile!=='hero'||receipt.sha256!==hash(raw)||receipt.triangles!==44028)throw Error('Exact supplied hero package receipt required');
const referenceRaw=await fs.readFile(path.join(REF,'blockrunner-hero-v1.glb')),lodRaw=await fs.readFile(path.join(REF,'blockrunner-rival-lod-deviations-v5.glb'));
if(hash(referenceRaw)!=='6451e78bc4933fd294bc0c080dbedcf679b2d558b118b62cca8ce4812f942b02'||hash(lodRaw)!=='307a1f8eae8fc403bebaace1a93b08041636f357def07c1f39eeab6275f1b1fe')throw Error('Calibrated V3 reference bytes differ');
const doc=await io.readBinary(raw),reference=await io.readBinary(referenceRaw),lod=await io.readBinary(lodRaw);
const arrayHash=a=>hash(Buffer.from(a.getArray().buffer,a.getArray().byteOffset,a.getArray().byteLength));
function fingerprint(d){return d.getRoot().listNodes().map(n=>({name:n.getName(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale(),primitives:n.getMesh()?.listPrimitives().map(p=>({indices:arrayHash(p.getIndices()),attributes:p.listSemantics().sort().map(s=>[s,arrayHash(p.getAttribute(s))])}))})).sort((a,b)=>a.name.localeCompare(b.name));}
if(JSON.stringify(fingerprint(doc))!==JSON.stringify(fingerprint(reference)))throw Error('Final hero geometry, attributes, topology or basis changed. Recalibrate; do not reuse indices.');
const body=d=>d.getRoot().listNodes().find(n=>n.getName()==='blockrunner-body').getMesh().listPrimitives()[0];
const target=body(doc),calibrated=body(lod).getIndices().getArray();if(calibrated.length!==25554*3)throw Error('Reference rival count changed');
const buffer=target.getIndices().getBuffer(),oldIndices=target.getIndices();
target.setIndices(doc.createAccessor('Blockrunner calibrated rival body indices').setType('SCALAR').setArray(Uint32Array.from(calibrated)).setBuffer(buffer));
oldIndices.dispose();
const out=await io.writeBinary(doc),roundtrip=await io.readBinary(out);
const pilot=d=>fingerprint(d).filter(x=>x.name.startsWith('blockrunner-pilot-'));
if(JSON.stringify(pilot(roundtrip))!==JSON.stringify(pilot(reference)))throw Error('Pilot changed');
if(arrayHash(body(roundtrip).getIndices())!==hash(Buffer.from(Uint32Array.from(calibrated).buffer)))throw Error('Rival mapping changed');
const surfaces=JSON.parse(await fs.readFile(path.join(REF,'rival-v5-independent-surface-samples.json'),'utf8'));
if(surfaces.heroSha256!==hash(referenceRaw)||surfaces.rivalSha256!==hash(lodRaw))throw Error('Reference surface sampling lineage mismatch');
if(hash(await fs.readFile(input))!==hash(raw))throw Error('Final hero changed during operation');
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,out,{flag:'wx'});
const report={status:'private rival candidate; actual final appearance comparison pending',input,inputSha256:hash(raw),output,outputSha256:hash(out),bytes:out.byteLength,bodyTriangles:25554,pilotTriangles:4128,totalTriangles:29682,pilotAccessorBytesExact:true,bodyPositionNormalUvAccessorBytesExact:true,protectedSurfaceTrianglesExact:true,protectedSourceTriangles:8952,calibratedHeroGeometryAndAttributeArraysExact:true,referenceHeroSha256:hash(referenceRaw),referenceLodSha256:hash(lodRaw),referenceSurfaceSampleReceiptSha256:hash(await fs.readFile(path.join(REF,'rival-v5-independent-surface-samples.json'))),sampledMaximumHeroToRivalMeters:surfaces.heroToRival.maximumDistanceMeters,sampledMaximumRivalToHeroMeters:surfaces.rivalToHero.maximumDistanceMeters,twoCentimeterTrialCriterion:'FAIL; 35 measured samples exceed2cm. No continuous Hausdorff bound claimed.',runtimeReady:false};
await fs.writeFile(receiptPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
