import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const validator=require('gltf-validator'),io=new NodeIO();
const base=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const source=await readFile(new URL('canyon-arch-v3.glb',base));
const doc=await io.readBinary(source),p=doc.getRoot().listMeshes()[0].listPrimitives()[0];
const color=p.getAttribute('COLOR_0'),array=color.getArray();
function quantiles(){
 const values=Array.from({length:color.getCount()},(_,i)=>{
  const c=color.getElement(i,[]);return .2126*c[0]+.7152*c[1]+.0722*c[2];
 }).sort((a,b)=>a-b);
 const qs={};for(const q of[0,.01,.05,.1,.25,.5,.75,.9,.95,.99,1]){
  const f=q*(values.length-1),i=Math.floor(f),t=f-i;
  qs[q]=values[i]+((values[Math.min(i+1,values.length-1)]-values[i])*t);
 }return qs;
}
const before=quantiles(),gain=.19/before[.5];
const geometryHash=()=>Object.fromEntries(['POSITION','NORMAL'].map(a=>[a,hash(Buffer.from(p.getAttribute(a).getArray().buffer))])
 .concat([['indices',hash(Buffer.from(p.getIndices().getArray().buffer))]]));
const geometryBefore=geometryHash();
for(let i=0;i<array.length;i++)array[i]*=gain;
const after=quantiles();assert(Math.abs(after[.5]-.19)<1e-7);
assert(array.every(v=>v>=0&&v<=1));assert.deepEqual(geometryHash(),geometryBefore);
const bytes=await io.writeBinary(doc),report=await validator.validateBytes(bytes,{uri:'canyon-arch-v3-normalized.glb',maxIssues:1000});
assert.equal(report.issues.numErrors,0);assert.equal(report.issues.numWarnings,0);
await writeFile(new URL('canyon-arch-v3-normalized.glb',base),bytes);
const receipt={source:'canyon-arch-v3.glb',sourceSha256:hash(source),asset:'canyon-arch-v3-normalized.glb',
 sha256:hash(bytes),bytes:bytes.length,targetMedianLuminance:.19,weights:[.2126,.7152,.0722],
 method:'One positive global linear RGB multiplier; no clipping, no geometry/normal/material changes; quantiles over exported vertices',
 gain,beforeQuantiles:before,afterQuantiles:after,geometryUnchanged:true,geometryAttributeHashes:geometryBefore,
 validation:report.issues};
await writeFile(new URL('normalized-value-receipt.json',base),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
