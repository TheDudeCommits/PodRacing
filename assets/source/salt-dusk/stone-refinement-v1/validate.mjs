import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json'),validator=require('gltf-validator');
const result=[];
for(const name of ['canyon-arch-dusk-v1','wind-blade-dusk-v1']){
 const bytes=await readFile(new URL(name+'.glb',import.meta.url));
 const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 const report=await validator.validateBytes(new Uint8Array(bytes),{uri:name+'.glb',maxIssues:100});
 const item={name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,primitives:g.meshes.reduce((s,m)=>s+m.primitives.length,0),materials:g.materials?.length??0,images:g.images?.length??0,triangles:g.meshes.flatMap(m=>m.primitives).reduce((s,p)=>s+g.accessors[p.indices].count/3,0),validation:report};
 result.push(item);if(report.issues.numErrors||item.primitives!==1||item.images!==0)throw new Error(JSON.stringify(item));
}
await writeFile(new URL('gltf-validation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.map(({validation,...x})=>({...x,errors:validation.issues.numErrors,warnings:validation.issues.numWarnings})),null,2));
