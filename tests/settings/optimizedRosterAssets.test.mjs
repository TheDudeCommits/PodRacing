import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { SELECTABLE_POD_APPEARANCES,getVehicleArtDefinition } from '../../src/game/vehicleAppearance';
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url));
const receipts=JSON.parse(read('assets/source/inkstorm/runtime-round48.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
function glb(bytes){const n=bytes.readUInt32LE(12);return {json:JSON.parse(bytes.subarray(20,20+n)),binary:bytes.subarray(28+n)};}
describe('lossless runtime pod packages',()=>{
 it('uses admitted, smaller packages for all eight pods with byte-identical geometry, normals, UVs and pilots',()=>{
  let before=0,after=0;
  for(const id of SELECTABLE_POD_APPEARANCES)for(const lod of ['hero','rival']){
   if(id==='procedural')continue;
   const def=getVehicleArtDefinition(id,lod),r=receipts.find(r=>r.runtime===`public${def.url}`);expect(r,`${id}/${lod}`).toBeDefined();
   const original=read(r.source),runtime=read(r.runtime);expect(hash(original)).toBe(r.sourceSha256);expect(hash(runtime)).toBe(r.sha256);
   expect(runtime.length).toBeLessThanOrEqual(original.length);before+=original.length;after+=runtime.length;
   const a=glb(original),b=glb(runtime);expect(b.json.accessors).toEqual(a.json.accessors);expect(b.json.nodes).toEqual(a.json.nodes);expect(b.json.meshes).toEqual(a.json.meshes);
   const imageViews=new Set(a.json.images.map(i=>i.bufferView));
   for(let i=0;i<a.json.bufferViews.length;i++)if(!imageViews.has(i)){
    const av=a.json.bufferViews[i],bv=b.json.bufferViews[i];
    expect(hash(a.binary.subarray(av.byteOffset??0,(av.byteOffset??0)+av.byteLength))).toBe(hash(b.binary.subarray(bv.byteOffset??0,(bv.byteOffset??0)+bv.byteLength)));
   }
   if(r.images.length){expect(b.json.extensionsRequired).toContain('EXT_texture_webp');for(const image of r.images)expect(b.json.images[image.image].mimeType).toBe('image/webp');}
  }
  expect(before-after).toBeGreaterThan(6_000_000);
 });
});
