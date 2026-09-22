import { POD_FOOTPRINTS } from '../../src/game/podGeometry';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { getVehicleArtDefinition, SELECTABLE_POD_APPEARANCES } from '../../src/game/vehicleAppearance';
import { POD_IDENTITIES, derivePodIdentityConfig } from '../../src/game/podIdentity';
import { DEFAULT_PODRACER_CONFIG } from '../../src/game/simulation/config';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>readFileSync(new URL(`../../${p}`,import.meta.url));
const sourceManifest=JSON.parse(read('assets/source/inkstorm/vehicle-manifest.json'));

describe('recovered roster admission',()=>{
 it.each(['verdigris','skybolt','needle','pog'])('%s retains provenance, valid render data and budgeted hero/rival models',id=>{
  const receipt=JSON.parse(read(`assets/source/inkstorm/roster-round46/${id}.json`));
  const source=sourceManifest.models.find(m=>m.uid===receipt.uid);
  expect(source.license.reported.slug).toBe('by');
  expect(hash(read(`assets/source/inkstorm/${source.download.sourceGlb}`))).toBe(source.download.sourceSha256);
  expect(SELECTABLE_POD_APPEARANCES).toContain(id);
  expect(POD_IDENTITIES[id].id).toBe(id);
  const config=derivePodIdentityConfig(id,DEFAULT_PODRACER_CONFIG);
  expect(config.fixedDelta).toBe(DEFAULT_PODRACER_CONFIG.fixedDelta);
  expect(config.probes).toBe(POD_FOOTPRINTS[id].probes);
  for(const lod of ['hero','rival']){
   const bytes=read(receipt.variants[lod].path);
   expect(hash(bytes)).toBe(receipt.variants[lod].sha256);
   expect(bytes.length).toBeLessThan(10_000_000);
   const n=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+n)),base=28+n;
   let triangles=0,draws=0;
   for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    draws++;triangles+=gltf.accessors[primitive.indices].count/3;
    expect(gltf.materials[primitive.material].alphaMode??'OPAQUE').toBe('OPAQUE');
    expect(primitive.attributes.NORMAL).toBeTypeOf('number');
    if(primitive.attributes.TANGENT!==undefined){
     const a=gltf.accessors[primitive.attributes.TANGENT],v=gltf.bufferViews[a.bufferView];
     for(let i=0;i<a.count;i++){
      const off=base+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??16);
      const t=Array.from({length:4},(_,k)=>bytes.readFloatLE(off+k*4));
      if(!t.every(Number.isFinite)||Math.hypot(...t.slice(0,3))<1e-6||Math.abs(t[3])!==1)throw new Error(`${id}/${lod}: invalid tangent ${i}`);
     }
    }
   }
   expect(draws).toBeLessThanOrEqual(12);expect(triangles).toBeLessThanOrEqual(lod==='hero'?60000:30000);
   expect(triangles).toBe(receipt.variants[lod].triangles);
   const pilots=gltf.nodes.filter(n=>n.mesh!==undefined&&n.name.startsWith(`${id}-pilot-`));
   expect(pilots).toHaveLength(id==='pog'?0:6);
   for(const image of gltf.images){
    const v=gltf.bufferViews[image.bufferView],off=base+(v.byteOffset??0);
    expect(image.mimeType==='image/png'?bytes.readUInt32BE(off)===0x89504e47:bytes.readUInt16BE(off)===0xffd8).toBe(true);
   }
  }
 });
});
