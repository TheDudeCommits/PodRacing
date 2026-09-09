import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Vector3} from 'three';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {createCourseGulfField,getLaunchBasinAnchor} from '../../../../src/game/race/CourseGulfField';
import {createCourseGulfField as controlField} from './original/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {CinematicCamera} from '../../../../src/camera/CinematicCamera';
const dir='assets/source/inkstorm/launch-surface-join-round31';
const plan=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const a=controlField(plan)!,b=createCourseGulfField(plan)!;
const groundA=(x:number,z:number)=>sampleTerrainHeight(x,z,a),groundB=(x:number,z:number)=>sampleTerrainHeight(x,z,b);
const anchor=getLaunchBasinAnchor(plan)!;
let courseGround=sampleTerrainHeight;
const course=createProceduralPodraceCourse({heightAt:(x,z)=>courseGround(x,z)},0x494e4b53);
courseGround=groundB;course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
const src=JSON.parse(readFileSync('output/gauntlet/round-31-launch-candidate/receipts.json','utf8'));
const views=[...src.receipts,...src.supplemental].filter((r:any)=>(r.section??r.view).id.includes('launch')).map((r:any)=>{
 const view=r.section??r.view,g=r.game,position=new Vector3(...g.position);position.y+=groundB(position.x,position.z)-groundA(position.x,position.z);const forward=new Vector3(Math.sin(g.yaw),0,Math.cos(g.yaw));
 const ahead=course.sampleAtDistance(view.progress*course.totalLength+55+Math.min(70,g.speed*.3));
 const rig=new CinematicCamera();rig.setMode('chase');rig.setCaptureMode(true);rig.camera.aspect=1440/900;rig.snap({position,forward,velocity:forward.clone().multiplyScalar(g.speed),speed:g.speed,routeLookAhead:new Vector3(ahead.x,ahead.y+3,ahead.z)});rig.camera.updateMatrixWorld(true);
 const targets=[];
 for(const f of [300,450,600,800,1000,1200]){const x=anchor.x+anchor.tangentX*f,z=anchor.z+anchor.tangentZ*f,target=new Vector3(x,groundB(x,z)+3,z),eye=rig.camera.position,n=Math.ceil(eye.distanceTo(target)/3);let am=Infinity,bm=Infinity,block:any=null;for(let i=1;i<n;i++){const p=eye.clone().lerp(target,i/n);am=Math.min(am,p.y-groundA(p.x,p.z));if(p.y-groundB(p.x,p.z)<bm){bm=p.y-groundB(p.x,p.z);block={position:p.toArray(),forward:(p.x-anchor.x)*anchor.tangentX+(p.z-anchor.z)*anchor.tangentZ,right:-(p.x-anchor.x)*anchor.rightX-(p.z-anchor.z)*anchor.rightZ};}}targets.push({f,am,bm,block});}
 const cameraError=rig.camera.position.distanceTo(new Vector3(...g.cameraPosition));rig.dispose();return {id:view.id,cameraError,targets};
});
let maxLane=0,n=0;for(let i=0;i<4096;i++){const p=plan.samplePlanAtProgress(i/4096);for(const s of [-1,-.5,0,.5,1])for(const[dx,dz]of [[0,0],[.85,0],[-.85,0],[0,.85],[0,-.85],[1.15,0],[-1.15,0],[0,1.15],[0,-1.15]]){const x=p.x+p.rightX*p.width*s+dx!,z=p.z+p.rightZ*p.width*s+dz!;maxLane=Math.max(maxLane,Math.abs(a.sampleOffset(x,z)-b.sampleOffset(x,z)));n++;}}
const profiles=[];for(let d=1450;d<=1900;d+=50){const p=plan.samplePlanAtProgress(d/plan.totalLength),row=[];for(let lateral=-140;lateral<=140;lateral+=2){const x=p.x+p.rightX*lateral,z=p.z+p.rightZ*lateral;row.push({lateral,a:groundA(x,z),b:groundB(x,z)});}const gradient=(key:'a'|'b')=>Math.max(...row.slice(1).map((p,i)=>Math.abs((p[key]-row[i]![key])/2)));profiles.push({d,width:p.width,maxGradeA:gradient('a'),maxGradeB:gradient('b'),row});}
const reveal=course.sampleAtProgress(.0859375),baseReveal=plan.sampleAtProgress(reveal.progress),eye={x:18651.722835986162,y:-10.972894894238646+reveal.y-baseReveal.y,z:620.9732411526137};const salt=[];for(const ahead of [150,250,350,500,650]){const target=course.sampleAtDistance(reveal.distance+ahead);let minimum=Infinity,block:any;for(let i=1;i<200;i++){const t=i/200,x=eye.x+(target.x-eye.x)*t,z=eye.z+(target.z-eye.z)*t,y=eye.y+(target.y+2-eye.y)*t,m=y-groundB(x,z);if(m<minimum){minimum=m;let nearest:any=null;for(let j=500;j<=1400;j+=2){const p=plan.sampleAtDistance(j),d=Math.hypot(p.x-x,p.z-z);if(!nearest||d<nearest.lateral)nearest={distance:j,lateral:d,width:p.width};}block={x,z,y,ground:groundB(x,z),...nearest};}}salt.push({ahead,minimum,target:{x:target.x,y:target.y,z:target.z,distance:target.distance},block});}
const hash=(v:Float32Array)=>createHash('sha256').update(new Uint8Array(v.buffer)).digest('hex');
const out={views,corridor:{n,maxLane},grids:b.grids.map((g,i)=>({name:g.name,changed:g.values.reduce((n,x,k)=>n+Number(x!==a.grids[i]!.values[k]),0),oldHash:hash(a.grids[i]!.values),newHash:hash(g.values)})),salt,profiles};
writeFileSync(`${dir}/probe-result.json`,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,profiles:profiles.map(({row,...r})=>r)},null,2));
