import { Box3, Matrix4, Quaternion, Vector3, type PerspectiveCamera } from 'three';
import { afterAll, expect, it } from 'vitest';
import type { WreckVisualPose } from '../test-runtime/src/render/combat/WreckVisualPose';
import { CinematicCamera } from '../test-runtime/src/camera/CinematicCamera';
import { CinematicCamera as BeforeCamera } from '../before-runtime/src/camera/CinematicCamera';
import { fixture, race, step, variants } from '/Users/amir/Projects/PodRacing/tests/fixtures/teemtoActualCamera';
const fileModule:string='node:fs'; const {writeFileSync}=await import(/* @vite-ignore */ fileModule);
const rows:unknown[]=[];
afterAll(()=>writeFileSync('assets/source/inkstorm/combat-round35/v29-two-beat-camera-preparation/projected-cadence-v2.json',JSON.stringify(rows,null,2)+'\n'));
const phases=new Set([6,30,49,52,64,79,88,97,118]);
const names=['teemto-engine-left-body','teemto-damage-right-front-v16','teemto-damage-right-rear-v16'];
function extent(camera:PerspectiveCamera,points:readonly Vector3[]) {
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,nearest=Infinity;
 const p=new Vector3();camera.updateMatrixWorld(true);
 for(const point of points){p.copy(point).applyMatrix4(camera.matrixWorldInverse);nearest=Math.min(nearest,-p.z);p.copy(point).project(camera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 return{width:(maxX-minX)/2,height:(maxY-minY)/2,ndc:[minX,maxX,minY,maxY],nearest,emptyBelow:(minY+1)/2};
}
function constraints(camera:PerspectiveCamera,focus:Vector3,points:readonly Vector3[],full:readonly Vector3[]){
 const back=new Vector3(0,0,1).applyQuaternion(camera.quaternion),right=new Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new Vector3(0,1,0).applyQuaternion(camera.quaternion),d=new Vector3();
 const t=Math.tan(Math.PI/6),h=t*camera.aspect;let hi=-Infinity,lo=Infinity,top=-Infinity,bottom=Infinity,near=2;
 let hiIndex=-1,loIndex=-1,topIndex=-1,bottomIndex=-1,nearIndex=-1;
 points.forEach((p,i)=>{d.copy(p).sub(focus);const x=d.dot(right),y=d.dot(up),z=d.dot(back);if(x+.74*h*z>hi){hi=x+.74*h*z;hiIndex=i;}if(x-.74*h*z<lo){lo=x-.74*h*z;loIndex=i;}if(y+.70*t*z>top){top=y+.70*t*z;topIndex=i;}if(y-.58*t*z<bottom){bottom=y-.58*t*z;bottomIndex=i;}});
 full.forEach((p,i)=>{const distance=d.copy(p).sub(focus).dot(back)+camera.near+.5;if(distance>near){near=distance;nearIndex=i;}});
 return{horizontal:(hi-lo)/(1.48*h),vertical:(top-bottom)/(1.28*t),fullNear:near,actual:camera.position.clone().sub(focus).dot(back),supportingCompositionIndices:[hiIndex,loIndex,topIndex,bottomIndex],fullNearIndex:nearIndex};
}
function sourcePoints(art:ReturnType<typeof fixture>,body:Matrix4){
 const right:Vector3[]=[],left:Vector3[]=[];const m=new Matrix4();art.root.updateMatrixWorld(true);
 for(const name of names){const mesh=art.all.find(m=>m.name===name)!;m.copy(body).multiply(mesh.matrixWorld);const position=mesh.geometry.getAttribute('position');
  for(let i=0;i<position.count;i++)(name===names[0]?left:right).push(new Vector3().fromBufferAttribute(position,i).applyMatrix4(m));}
 return{right,left};
}
it.each(variants)('%s compares exact V28 and V29 camera histories on the same authored source poses',variant=>{
 const art=fixture(variant),sim=race();const rigs=[1.6,390/844,844/390].map(aspect=>{const a=new CinematicCamera(),b=new BeforeCamera();a.camera.aspect=b.camera.aspect=aspect;return{a,b,aspect};});
 const baselineBounds=Array.from({length:26},()=>new Vector3()), baselineCenter=new Vector3(),box=new Box3();let minimumGround=Infinity,minimumNear=Infinity;
 let simulationFrame=910;for(let frame=1;frame<=910;frame++)step(sim,frame);
 try{for(let sample=0;sample<=120;sample++){
  const wall=sample/60,age=wall<=.82?wall*.18:.82*.18+wall-.82;
  const targetFrame=910+Math.floor(age*120);while(simulationFrame<targetFrame)step(sim,++simulationFrame);
  const frame=simulationFrame,entry=sim.state.entries[0]!,remaining=entry.galactic!.wreck.timer,extrapolation=age-(frame-910)/120;
  const pose:WreckVisualPose=art.cache.update(entry.vehicle,remaining,sim.terrain,extrapolation);art.breakup.update(pose,remaining,sim.terrain,extrapolation);
  const subject={position:new Vector3(entry.vehicle.position.x,entry.vehicle.position.y,entry.vehicle.position.z),forward:new Vector3(Math.sin(entry.vehicle.orientation.yaw),0,Math.cos(entry.vehicle.orientation.yaw)),velocity:new Vector3(),speed:0,
    combatFocus:pose.center,combatForward:pose.forward,combatBounds:pose.bounds,combatImpactPosition:pose.rupture?.position,combatImpactFraming:pose.impactFraming,combatTerrain:sim.terrain,wreckChase:wall>.82};
  const old={...subject,combatImpactFraming:undefined as {center:Vector3;bounds:Vector3[]}|undefined};
  if(pose.impactFraming){for(let i=0;i<24;i++)baselineBounds[i]!.copy(pose.bounds[8+i]!);baselineBounds[24]!.copy(pose.rupture!.position);baselineBounds[25]!.copy(pose.groundContact?.position??pose.rupture!.position);box.setFromPoints(baselineBounds).getCenter(baselineCenter);old.combatImpactFraming={center:baselineCenter,bounds:baselineBounds};}
  for(const {a,b,aspect}of rigs){a.setMode(subject.wreckChase?'chase':'side');b.setMode(subject.wreckChase?'chase':'side');a.setCombatFraming(!subject.wreckChase);b.setCombatFraming(!subject.wreckChase);
   // Fixed 60 Hz camera, explicit .18x presentation clock for the 820 ms cut;
   // source snapshots still advance at 120 Hz with bounded render extrapolation.
   // This models the policy cadence; it is not a claim of exact recorded PTS.
   const dt=1/60;if(sample===0){a.snap(subject);b.snap(old);}else{a.update(dt,frame/120,subject);b.update(dt,frame/120,old);}
   const ground=a.camera.position.y-sim.terrain.heightAt(a.camera.position.x,a.camera.position.z);minimumGround=Math.min(minimumGround,ground);
   const near=extent(a.camera,pose.bounds).nearest;minimumNear=Math.min(minimumNear,near);
   expect(ground,`${variant}/${frame}/${aspect}: actual eye-ground`).toBeGreaterThanOrEqual(1.2-1e-6);
   expect(near,`${variant}/${frame}/${aspect}: ALL full source boxes beyond lens`).toBeGreaterThan(a.camera.near+.49);
   if(phases.has(sample)){
    const body=new Matrix4().compose(pose.position,new Quaternion().setFromEuler(pose.rotation),new Vector3(1,1,1));const points=sourcePoints(art,body);
    rows.push({variant,sample,wall,frame,age:pose.impactFraming!.ageSeconds,aspect,pointCounts:{right:points.right.length,left:points.left.length},candidate:{torn:extent(a.camera,points.right),allThree:extent(a.camera,[...points.right,...points.left]),eye:a.camera.position.toArray(),back:new Vector3(0,0,1).applyQuaternion(a.camera.quaternion).toArray(),constraints:constraints(a.camera,pose.impactFraming!.center,pose.impactFraming!.bounds,pose.bounds),ground},v28:{torn:extent(b.camera,points.right),allThree:extent(b.camera,[...points.right,...points.left]),eye:b.camera.position.toArray(),constraints:constraints(b.camera,baselineCenter,baselineBounds,pose.bounds)},scope:'Exact same actual GLTF POSITION surfaces; source projection with 60 Hz camera / .18-clock held cut / 120 Hz simulation plus extrapolation, not native pixels or screenshot replication.'});
   }
  }
 }rows.push({variant,minimumGround,minimumNear,fullBoundsCount:variant==='hero'?40:32});}
 finally{rigs.forEach(({a,b})=>{a.dispose();b.dispose();});art.breakup.reset();}
});
