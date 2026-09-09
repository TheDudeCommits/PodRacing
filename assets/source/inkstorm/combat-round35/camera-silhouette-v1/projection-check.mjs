import fs from 'node:fs';
import crypto from 'node:crypto';
import {Box3, Euler, Vector3} from 'three';
import {CinematicCamera} from '../../../../../src/camera/CinematicCamera.ts';
import {CinematicCamera as PreviousCamera} from './before-CinematicCamera.ts';
const folder='assets/source/inkstorm/combat-round35/camera-silhouette-v1';
const path='public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb',bytes=fs.readFileSync(path);
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
if(gltf.nodes.some(n=>n.matrix||n.translation||n.rotation||n.scale))throw Error('Source no longer has baked identity nodes.');
const bounds=new Box3(),meshes=[];
for(const n of gltf.nodes){if(n.mesh===undefined)continue;const b=new Box3();for(const p of gltf.meshes[n.mesh].primitives){const a=gltf.accessors[p.attributes.POSITION];b.union(new Box3(new Vector3(...a.min),new Vector3(...a.max)));}bounds.union(b);meshes.push({name:n.name,min:b.min.toArray(),max:b.max.toArray()});}
const center=bounds.getCenter(new Vector3()),radius=bounds.getSize(new Vector3()).length()*.5,rows=[];
for(const aspect of [1440/900,390/844])for(const time of [7.6,7.7,7.8,7.9]){
 const yaw=-.008368210728439518+time*1.25,rotation=new Euler(.34+Math.sin(time*5.1)*.16,yaw,-.92+Math.sin(time*7.4)*.34,'YXZ');
 const subject={position:new Vector3(),forward:new Vector3(Math.sin(-.008368210728439518),0,Math.cos(-.008368210728439518)),velocity:new Vector3(),speed:0};
 for(const [version,Cls]of[['V7',PreviousCamera],['candidate',CinematicCamera]]){
  const rig=new Cls();rig.setMode('side');rig.setCombatFraming(true);rig.camera.aspect=aspect;
  rig.snap({...subject,combatFocus:center.clone().applyEuler(rotation),combatForward:new Vector3(Math.sin(yaw),0,Math.cos(yaw)),combatRadius:radius});rig.camera.updateMatrixWorld(true);
  const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new Vector3(x,y,z).applyEuler(rotation).project(rig.camera));
  const pilot=new Vector3(0,2.8,-5.2).applyEuler(rotation).project(rig.camera),engine=new Vector3(0,2.65,14).applyEuler(rotation).project(rig.camera);
  const x=[Math.min(...corners.map(p=>p.x)),Math.max(...corners.map(p=>p.x))],y=[Math.min(...corners.map(p=>p.y)),Math.max(...corners.map(p=>p.y))];
  rows.push({version,aspect,presentationTime:time,eyeRelative:rig.camera.position.toArray(),projectedBoundsNDC:{x,y},projectedWidthFraction:(x[1]-x[0])/2,cockpitEngineCenterSeparationNDC:Math.abs(pilot.x-engine.x),cockpitEngineCenterSeparationPixels:Math.abs(pilot.x-engine.x)/2*(aspect>1?1440:390)});rig.dispose();
 }
}
fs.writeFileSync(folder+'/projection-check.json',JSON.stringify({source:{path,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),nodesIdentity:true,meshes},localBounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),center:center.toArray(),radius},scope:'CPU projection of actual admitted GLB accessor bounding corners and authored pilot/engine center samples. Uses recorded wreck yaw and source presentation-time formulas with base pitch/roll/bank assumed zero because the receipt does not contain those components. This is a bounded geometric estimate, not exact screenshot reconstruction, occlusion proof or visual acceptance. Live code measures all mesh transforms, not these source-specific constants.',rows},null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>r.aspect>1&&r.presentationTime===7.7),null,2));
