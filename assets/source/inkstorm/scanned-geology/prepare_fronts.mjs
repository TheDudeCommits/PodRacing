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
for(const name of ['rock_face_02','rock_face_01']){
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
 const positions=primitive.getAttribute('POSITION').getArray(),normals=primitive.getAttribute('NORMAL').getArray();
 const attributes=new Float32Array(colors.length*2);for(let i=0;i<colors.length/3;i++)for(let j=0;j<3;j++){attributes[i*6+j]=normals[i*3+j];attributes[i*6+j+3]=colors[i*3+j];}
 const indices=new Uint32Array(primitive.getIndices().getArray());
 const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,6,[.2,.2,.2,.35,.35,.35],null,15300*3,.009,['Permissive']);
 primitive.getIndices().setArray(reduced);compactPrimitive(primitive);await doc.transform(dedup(),prune());
 const output=await io.writeBinary(doc);await writeFile(path.join(root,name+'-painted-front.glb'),output);
 console.log(JSON.stringify({asset:name,triangles:reduced.length/3,sourceTriangles:indices.length/3,error,bytes:output.length}));
}
