// CPU-only projection and sparse body-occlusion diagnostic; imports no runtime source.
import fs from 'node:fs';
import path from 'node:path';
import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Euler, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from 'three';
const repo=path.resolve(import.meta.dirname,'../../../..');
const root=import.meta.dirname;
const asset=path.join(repo,'public/assets/inkstorm/vehicles/teemto-hero-v4c.glb');
const b=fs.readFileSync(asset); const jsonSize=b.readUInt32LE(12); const j=JSON.parse(b.subarray(20,20+jsonSize)); const binaryOffset=28+jsonSize;
function accessor(id){ const a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType],bytes=type.BYTES_PER_ELEMENT,stride=v.byteStride??bytes*n,out=new type(a.count*n),start=binaryOffset+(v.byteOffset??0)+(a.byteOffset??0);for(let i=0;i<a.count;i++)for(let q=0;q<n;q++){const o=start+i*stride+q*bytes;out[i*n+q]=a.componentType===5126?b.readFloatLE(o):a.componentType===5125?b.readUInt32LE(o):a.componentType===5123?b.readUInt16LE(o):b.readUInt8(o);}return {out,n};}
const meshes=[];
function walk(id,parent=new Matrix4()){ const n=j.nodes[id];const local=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation??[0,0,0]),new Quaternion().fromArray(n.rotation??[0,0,0,1]),new Vector3().fromArray(n.scale??[1,1,1]));const m=parent.clone().multiply(local);if(n.mesh!==undefined) for(const p of j.meshes[n.mesh].primitives){const {out,n:size}=accessor(p.attributes.POSITION),g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(out,size));if(p.indices!==undefined)g.setIndex(new BufferAttribute(accessor(p.indices).out,1));g.applyMatrix4(m);g.computeBoundingBox();g.computeBoundingSphere();const mesh=new Mesh(g,new MeshBasicMaterial({side:DoubleSide}));mesh.name=n.name;mesh.updateMatrixWorld();meshes.push(mesh);}for(const c of n.children??[])walk(c,m);}
for(const n of j.scenes[j.scene??0].nodes)walk(n);
const pilot=meshes.filter(m=>m.name.startsWith('teemto-pilot-')),body=meshes.filter(m=>!pilot.includes(m));
const variants=[
{name:'baseline-410kph-flat',baseRear:16.5,baseEyeHeight:7.1,baseAimHeight:5.8,baseFov:62},
{name:'A-balanced',baseRear:13.8,baseEyeHeight:5.1,baseAimHeight:3.8,baseFov:62},
{name:'B-close-low',baseRear:12.4,baseEyeHeight:3.9,baseAimHeight:3.5,baseFov:62},
{name:'rejected-long-lens-control',baseRear:12.80647,baseEyeHeight:4.95404,baseAimHeight:1.3,baseFov:54},
];
const smooth=(x,a,z)=>{const t=Math.min(1,Math.max(0,(x-a)/(z-a)));return t*t*(3-2*t);};
function pose(variant,speed=113.76,kick=1,descent=0){const t=smooth(speed,0,230);return {...variant,eye:[.35,variant.baseEyeHeight+.5*t+descent*2.4*t,-variant.baseRear-.8*t],aim:[0,variant.baseAimHeight-descent*(16*.36+6)*t,34+18*t],fov:variant.baseFov+smooth(speed,70,220)*6*kick};}
const width=1440,height=900,ray=new Raycaster();
const round=x=>Number(x.toFixed(4));
const v=new Vector3();
const bounds=ms=>{const box=new Box3();for(const m of ms)box.union(m.geometry.boundingBox);return {min:box.min.toArray(),max:box.max.toArray()};};
function projected(camera,ms,modelMatrix=null){const box=new Box3();let count=0,offscreen=0,near=Infinity;for(const m of ms){const a=m.geometry.getAttribute('position');for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);if(modelMatrix)v.applyMatrix4(modelMatrix);v.applyMatrix4(camera.matrixWorldInverse);near=Math.min(near,-v.z);v.applyMatrix4(camera.projectionMatrix);box.expandByPoint(v);count++;if(Math.abs(v.x)>1||Math.abs(v.y)>1)offscreen++;}}return {xPx:[(box.min.x+1)/2*width,(box.max.x+1)/2*width].map(round),yPx:[(1-box.max.y)/2*height,(1-box.min.y)/2*height].map(round),widthPct:round((box.max.x-box.min.x)*50),heightPct:round((box.max.y-box.min.y)*50),offscreenVertexPct:round(100*offscreen/count),nearestDepth:round(near)};}
const output={scope:'CPU GLB vertices, flat rigid pose, 1440x900/16:10, no world terrain or runtime rendering. Sparse pilot-point body occlusion is diagnostic only, not visible-pixel area or acceptance.',asset,bounds:{all:bounds(meshes),pilot:bounds(pilot),body:bounds(body)},variants:[]};
for(const definition of variants){const variant=pose(definition);const cam=new PerspectiveCamera(variant.fov,width/height,.35,18000);cam.position.fromArray(variant.eye);cam.lookAt(new Vector3().fromArray(variant.aim));cam.updateMatrixWorld();const origin=cam.position.clone();let hit=0,total=0;for(const mesh of pilot){const a=mesh.geometry.getAttribute('position');const stride=Math.max(1,Math.floor(a.count/32));for(let i=0;i<a.count;i+=stride){const p=new Vector3().fromBufferAttribute(a,i),dir=p.clone().sub(origin),dist=dir.length();ray.set(origin,dir.normalize());ray.far=dist-.005;if(ray.intersectObjects(body,false).length)hit++;total++;}}
const engine=projected(cam,body.filter(m=>m.name.includes('engine'))),pilotBox=projected(cam,pilot),all=projected(cam,meshes);const horizon= new Vector3(0,0,10000).project(cam);output.variants.push({...variant,all,engines:engine,pilot:pilotBox,pilotSampleCount:total,pilotSampleBodyOccludedPct:round(100*hit/total),horizonY:round((1-horizon.y)/2*height),pitchDownDegrees:round(Math.atan2(variant.eye[1]-variant.aim[1],variant.aim[2]-variant.eye[2])*180/Math.PI)});}
// Small synthetic corner set only: no course construction or source/test imports.
for(const definition of variants){const result=output.variants.find(v=>v.name===definition.name);result.syntheticCorners=[];
for(const speed of [0,113.76,230])for(const kick of [0,1])for(const descent of [0,1]){const p=pose(definition,speed,kick,descent),cam=new PerspectiveCamera(p.fov,width/height,.35,18000);cam.position.fromArray(p.eye);cam.lookAt(new Vector3().fromArray(p.aim));cam.updateMatrixWorld();result.syntheticCorners.push({speed,kick,descent,pitchDownDegrees:round(Math.atan2(p.eye[1]-p.aim[1],p.aim[2]-p.eye[2])*180/Math.PI),...projected(cam,meshes)});}}
// Bounded posture probes in the unchanged native GLB coordinate basis.
for(const definition of variants){const result=output.variants.find(v=>v.name===definition.name);result.postureProbes=[];const p=pose(definition,113.76,0,0),cam=new PerspectiveCamera(p.fov,width/height,.35,18000);cam.position.fromArray(p.eye);cam.lookAt(new Vector3().fromArray(p.aim));cam.updateMatrixWorld();for(const pitch of [-.13,0,.13])for(const roll of [-.18,0,.18]){const m=new Matrix4().makeRotationFromEuler(new Euler(pitch,0,roll,'YXZ'));result.postureProbes.push({pitch,roll,...projected(cam,meshes,m)});}}
fs.writeFileSync(path.join(root,'projection-study.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
