// CPU-only projection and sparse body-occlusion diagnostic; imports no runtime source.
import fs from 'node:fs';
import path from 'node:path';
import { Box3, BufferAttribute, BufferGeometry, DoubleSide, FrontSide, Euler, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from 'three';
const repo=path.resolve(import.meta.dirname,'../../../..');
const root=import.meta.dirname;
const asset=path.join(repo,'public/assets/inkstorm/vehicles/teemto-hero-v4c.glb');
const b=fs.readFileSync(asset); const jsonSize=b.readUInt32LE(12); const j=JSON.parse(b.subarray(20,20+jsonSize)); const binaryOffset=28+jsonSize;
function accessor(id){ const a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType],bytes=type.BYTES_PER_ELEMENT,stride=v.byteStride??bytes*n,out=new type(a.count*n),start=binaryOffset+(v.byteOffset??0)+(a.byteOffset??0);for(let i=0;i<a.count;i++)for(let q=0;q<n;q++){const o=start+i*stride+q*bytes;out[i*n+q]=a.componentType===5126?b.readFloatLE(o):a.componentType===5125?b.readUInt32LE(o):a.componentType===5123?b.readUInt16LE(o):b.readUInt8(o);}return {out,n};}
const meshes=[];
function walk(id,parent=new Matrix4()){ const n=j.nodes[id];const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));const m=parent.clone().multiply(local);if(n.mesh!==undefined) for(const p of j.meshes[n.mesh].primitives){const {out,n:size}=accessor(p.attributes.POSITION),g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(out,size));if(p.indices!==undefined)g.setIndex(new BufferAttribute(accessor(p.indices).out,1));g.applyMatrix4(m);g.computeBoundingBox();g.computeBoundingSphere();const mesh=new Mesh(g,new MeshBasicMaterial({side:j.materials[p.material]?.doubleSided?DoubleSide:FrontSide}));mesh.name=n.name;mesh.userData.sourceMaterial=j.materials[p.material]?.name;mesh.updateMatrixWorld();meshes.push(mesh);}for(const c of n.children??[])walk(c,m);}
for(const n of j.scenes[j.scene??0].nodes)walk(n);
const pilot=meshes.filter(m=>m.name.startsWith('teemto-pilot-')),body=meshes.filter(m=>!pilot.includes(m));

const ray=new Raycaster(),report=[];
const targets=[];
for(const mesh of pilot){const a=mesh.geometry.getAttribute('position');const stride=Math.max(1,Math.floor(a.count/32));for(let i=0;i<a.count;i+=stride)targets.push(new Vector3().fromBufferAttribute(a,i));}
for(const [name,eye] of [['current',[.35,7.3459566784,-16.8935306855]],['higher-12',[.35,12,-16.8935306855]],['higher-16',[.35,16,-16.8935306855]],['side-offset-3',[3,7.3459566784,-16.8935306855]]]){
 const origin=new Vector3().fromArray(eye),hits={},visible=[];
 for(const p of targets){const dir=p.clone().sub(origin),dist=dir.length();ray.set(origin,dir.normalize());ray.far=dist-.005;const first=ray.intersectObjects(body,false)[0];if(first){const key=first.object.name+' / '+first.object.userData.sourceMaterial;hits[key]=(hits[key]??0)+1;}else visible.push(p.toArray());}
 report.push({name,eye,sampleCount:targets.length,bodyOccluded:targets.length-visible.length,unblocked:visible.length,firstBlockingMeshes:hits});
}
const output={scope:'Sparse source-geometry body ray test using exact GLB material sidedness. No camera/runtime/art change, no world or pixels or FPS evidence. Higher/side eyes are diagnostic only, not proposed playable camera profiles.',asset,bodyMaterialSides:body.map(m=>({mesh:m.name,material:m.userData.sourceMaterial,side:m.material.side})),poses:report};
fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
