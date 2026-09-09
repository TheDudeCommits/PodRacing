import {readFileSync,writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {createCourseGulfField,getLaunchBasinAnchor} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {CinematicCamera} from '../../../../src/camera/CinematicCamera';
const dir='assets/source/inkstorm/launch-reveal-round31';
const mode=process.env.LAUNCH_CANDIDATE==='1'?'candidate':'baseline';
const baseline=mode==='candidate'?JSON.parse(readFileSync(`${dir}/baseline-trace.json`,'utf8')):null;
let field:ReturnType<typeof createCourseGulfField>=null;
const ground=(x:number,z:number)=>sampleTerrainHeight(x,z,field??undefined);
const course=createProceduralPodraceCourse({heightAt:ground},0x494e4b53);
field=createCourseGulfField(course)!;
course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
const anchor=getLaunchBasinAnchor(course)!;
const world=(f:number,r:number)=>({x:anchor.x+anchor.tangentX*f-anchor.rightX*r,z:anchor.z+anchor.tangentZ*f-anchor.rightZ*r});
const local=(x:number,z:number)=>({forward:(x-anchor.x)*anchor.tangentX+(z-anchor.z)*anchor.tangentZ,right:-(x-anchor.x)*anchor.rightX-(z-anchor.z)*anchor.rightZ});
const source=JSON.parse(readFileSync('output/gauntlet/round-30-fork-foundry-v3-complete/receipts.json','utf8'));
const captures=[...source.receipts,...source.supplemental].filter(r=>(r.section??r.view).id.includes('launch'));
const output=[];
for(const receipt of captures){
 const view=receipt.section??receipt.view,g=receipt.game;
 const position=new Vector3(...g.position);
 if(baseline){const old=baseline.views.find((v:any)=>v.id===view.id);position.y+=ground(position.x,position.z)-old.subjectGroundY;}
 const forward=new Vector3(Math.sin(g.yaw),0,Math.cos(g.yaw));
 const ahead=course.sampleAtDistance(view.progress*course.totalLength+55+Math.min(70,g.speed*.3));
 const rig=new CinematicCamera();rig.setMode('chase');rig.setCaptureMode(true);
 rig.camera.aspect=1440/900;
 rig.snap({position,forward,velocity:forward.clone().multiplyScalar(g.speed),speed:g.speed,routeLookAhead:new Vector3(ahead.x,ahead.y+3,ahead.z)});
 rig.camera.updateMatrixWorld(true);
 const error=rig.camera.position.distanceTo(new Vector3(...g.cameraPosition));
 const probe=(x:number,z:number,y:number)=>{
  const target=new Vector3(x,y,z),ndc=target.clone().project(rig.camera),eye=rig.camera.position;
  const distance=eye.distanceTo(target),steps=Math.ceil(distance/3);let margin=Infinity,block:any=null;
  for(let i=1;i<steps;i++){const t=i/steps,p=eye.clone().lerp(target,t),m=p.y-ground(p.x,p.z);if(m<margin){margin=m;block={...local(p.x,p.z),distance:distance*t,margin:m};}}
  return {world:target.toArray(),local:local(x,z),screen:[(ndc.x+1)/2,(1-ndc.y)/2],withinFrame:Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z<=1,margin,block};
 };
 const road=[];
 for(let d=150;d<=1100;d+=50){const p=course.sampleAtDistance(view.progress*course.totalLength+d);road.push({ahead:d,...probe(p.x,p.z,p.y+2)});}
 const bowl=[];
 for(const f of [300,450,600,800,1000,1200])for(const r of [-120,0,120]){const p=world(f,r);bowl.push({f,r,...probe(p.x,p.z,ground(p.x,p.z)+3)});}
 output.push({id:view.id,progress:view.progress,distance:view.progress*course.totalLength,cameraPositionError:error,camera:{position:rig.camera.position.toArray(),quaternion:rig.camera.quaternion.toArray(),fov:rig.camera.fov,aspect:rig.camera.aspect,near:rig.camera.near,far:rig.camera.far},subjectLocal:local(position.x,position.z),subjectGroundY:ground(position.x,position.z),subjectPosition:position.toArray(),road,bowl});rig.dispose();
}
const grids=field.grids.map(g=>{const {values,...rest}=g;writeFileSync(`${dir}/${mode}-${g.name}.f32`,new Uint8Array(values.buffer));return {...rest,file:`${mode}-${g.name}.f32`};});
const profile=[];for(let d=1050;d<=2200;d+=25){const p=course.sampleAtDistance(d),n=course.sampleAtDistance(d+8);profile.push({distance:d,y:p.y,grade:(n.y-p.y)/8,...local(p.x,p.z)});}
writeFileSync(`${dir}/${mode}-trace.json`,JSON.stringify({signature:course.signature,profile:field.launchProfile,anchor,grids,courseProfile:profile,views:output},null,2)+'\n');
console.log(JSON.stringify({profile:field.launchProfile,views:output.map(v=>({id:v.id,error:v.cameraPositionError,position:v.camera.position,road:v.road.map(p=>({ahead:p.ahead,screen:p.screen,margin:p.margin,block:p.block})),bowl:v.bowl.filter(p=>p.r===0).map(p=>({f:p.f,screen:p.screen,margin:p.margin,block:p.block}))}))},null,2));
