import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const {compactPrimitive,dedup,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const {MeshoptSimplifier}=await import(pathToFileURL(require.resolve('meshoptimizer')).href);
await MeshoptSimplifier.ready;const io=new NodeIO();
for(const name of ['boulder_01']){
 const doc=await io.read(path.join(root,'originals',name,name+'_1k.gltf'));
 const primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0];
 const uv=primitive.getAttribute('TEXCOORD_0');
 if(process.argv.includes('--extract')){
   await writeFile(path.join(root,name+'-vertex-input.json'),JSON.stringify({uv:Array.from({length:uv.getCount()},(_,i)=>uv.getElement(i,[]))}));continue;
 }
 const buffer=await readFile(path.join(root,name+'-vertex-colors.bin'));
 const colors=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
 primitive.setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(colors).setBuffer(doc.getRoot().listBuffers()[0]));
 primitive.setAttribute('TEXCOORD_0',null);
 const material=primitive.getMaterial();material.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.94).setDoubleSided(false);
 await doc.transform(dedup(),prune());
 const output=await io.writeBinary(doc);await writeFile(path.join(root,name+'-painted-front.glb'),output);
 console.log(JSON.stringify({asset:name,triangles:primitive.getIndices().getCount()/3,bytes:output.length}));
}
