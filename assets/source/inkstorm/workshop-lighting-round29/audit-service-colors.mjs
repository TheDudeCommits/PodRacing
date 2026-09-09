import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io=new NodeIO(),rows=[];
for(const name of ['pit-complex','pit-district','foundry-gantry','pipe-bank','finish-tower','refinery-stack']){
 const path=`public/assets/inkstorm/${name}.glb`, doc=await io.read(path),colors=new Map();
 for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const attr=prim.getAttribute('COLOR_0');if(!attr)continue;
  const data=attr.getArray(),stride=attr.getElementSize();
  for(let i=0;i<data.length;i+=stride){const rgb=Array.from(data.slice(i,i+3));const key=rgb.map(x=>x.toFixed(4)).join(',');
   const old=rgb[1]>=1.65*rgb[0]&&rgb[2]>=1.65*rgb[0];
   const corrected=rgb[1]>=.55&&rgb[2]>=.50&&rgb[1]>=3*rgb[0]&&rgb[2]>=3*rgb[0];
   if(old||corrected){const row=colors.get(key)??{rgb,vertices:0,oldEmissive:old,correctedEmissive:corrected};row.vertices++;colors.set(key,row);}
  }
 }
 rows.push({name,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),colors:[...colors.values()],oldEmissiveVertices:[...colors.values()].reduce((n,r)=>n+r.vertices*Number(r.oldEmissive),0),correctedEmissiveVertices:[...colors.values()].reduce((n,r)=>n+r.vertices*Number(r.correctedEmissive),0)});
}
await writeFile('assets/source/inkstorm/workshop-lighting-round29/service-color-audit.json',JSON.stringify({scope:'Actual exported COLOR_0 palette classification before broad/brush variation; CPU source audit, not GPU or visual acceptance',rows},null,2));
console.log(JSON.stringify(rows.map(({name,oldEmissiveVertices,correctedEmissiveVertices,colors})=>({name,oldEmissiveVertices,correctedEmissiveVertices,colors})),null,2));
