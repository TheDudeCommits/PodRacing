import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../../../src/game/race/course';
import { createCourseGulfField, getLaunchBasinAnchor } from '../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';
import { CinematicCamera } from '../../../../src/camera/CinematicCamera';

const directory='assets/source/inkstorm/launch-escarpment-v27';
const mode=process.argv[2];assert(['round26','candidate','candidate2'].includes(mode));
let field: ReturnType<typeof createCourseGulfField>=null;
const course=createProceduralPodraceCourse({heightAt:(x,z)=>sampleTerrainHeight(x,z,field)},0x494e4b53);
field=createCourseGulfField(course)!;course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const captured=JSON.parse(readFileSync('output/gauntlet/round26-launch-v1/receipts.json','utf8'));
const receipts=[...captured.receipts,...captured.supplemental].filter(r=>
 ['05-launch','launch-crest','launch-descent'].includes((r.section??r.view).id));
const cameras=receipts.map(receipt=>{
 const g=receipt.game,view=receipt.section??receipt.view,position=new Vector3(...g.cameraFocusPosition);
 const forward=new Vector3(Math.sin(g.yaw),0,Math.cos(g.yaw));
 const ahead=course.sampleAtDistance(view.progress*course.totalLength+55+Math.min(70,g.speed*.3));
 const rig=new CinematicCamera();rig.setCaptureMode(true);rig.camera.aspect=1.6;
 rig.snap({position,forward,velocity:forward.clone().multiplyScalar(g.speed),speed:g.speed,
  routeLookAhead:new Vector3(ahead.x,ahead.y+3,ahead.z)});
 rig.camera.updateMatrixWorld(true);
 const error=rig.camera.position.distanceTo(new Vector3(...g.cameraPosition));
 assert(error<1e-7,`${view.id}: saved camera position mismatch ${error}`);
 return {id:view.id,progress:view.progress,position:rig.camera.position.toArray(),quaternion:rig.camera.quaternion.toArray(),
  fov:rig.camera.fov,aspect:rig.camera.aspect,near:rig.camera.near,far:rig.camera.far,reconstructedPositionError:error};
});
const grids=field.grids.map(g=>{
 const {values,...description}=g,bytes=new Uint8Array(values.buffer);
 writeFileSync(`${directory}/${mode}-${g.name}.f32`,bytes);
 return {...description,filename:`${mode}-${g.name}.f32`,sha256:sha(bytes)};
});
const anchor=getLaunchBasinAnchor(course)!;
const probes=[];
for(let f=600;f<=1120;f+=40)for(let r=-660;r<=-220;r+=40){
 const x=anchor.x+anchor.tangentX*f-anchor.rightX*r,z=anchor.z+anchor.tangentZ*f-anchor.rightZ*r;
 probes.push({f,r,height:sampleTerrainHeight(x,z,field)});
}
for(let f=340;f<=1120;f+=40)for(let r=220;r<=660;r+=40){
 const x=anchor.x+anchor.tangentX*f-anchor.rightX*r,z=anchor.z+anchor.tangentZ*f-anchor.rightZ*r;
 probes.push({f,r,height:sampleTerrainHeight(x,z,field)});
}
const receipt={mode,sourceSha256:sha(readFileSync('src/game/race/LaunchBasinPlan.ts')),signature:course.signature,
 grids,launchProfile:field.launchProfile,anchor,cameras,probes};
writeFileSync(`${directory}/${mode}-field.json`,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({...receipt,probes:probes.length},null,2));
