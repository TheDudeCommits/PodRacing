import { Matrix4, Quaternion, Vector3, type PerspectiveCamera } from 'three';
import { afterAll, expect, it } from 'vitest';
import { CinematicCamera as Baseline } from './baseline';
import { CinematicCamera as Fov } from './fov-only';
import { CinematicCamera as Aim } from './fov-aim-probe';
import type { CameraSubject } from './baseline';
import { fixture, race, step, variants } from '/Users/amir/Projects/PodRacing/tests/fixtures/teemtoActualCamera';
const fsName:string='node:fs'; const {writeFileSync}=await import(/* @vite-ignore */ fsName);
const output:unknown[]=[];
afterAll(()=>writeFileSync('assets/source/inkstorm/combat-round35/v30-postcut-composition-investigation/projection-results-v2.json',JSON.stringify(output,null,2)+'\n'));
const phases=new Set([0,3,24,31,49,62,78,108,110,144,169,174,210,240,270]);
const names=['teemto-engine-left-body','teemto-damage-right-front-v16','teemto-damage-right-rear-v16'];
function extent(camera:PerspectiveCamera,points:readonly Vector3[]){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,nearest=Infinity;const p=new Vector3();camera.updateMatrixWorld(true);for(const point of points){p.copy(point).applyMatrix4(camera.matrixWorldInverse);nearest=Math.min(nearest,-p.z);p.copy(point).project(camera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}return{width:(maxX-minX)/2,height:(maxY-minY)/2,centerY:(1-(minY+maxY)/2)/2,emptyBelow:(minY+1)/2,ndc:[minX,maxX,minY,maxY],nearest};}
function sources(art:ReturnType<typeof fixture>,body:Matrix4,active:boolean){const torn:Vector3[]=[],all:Vector3[]=[];const m=new Matrix4();art.root.updateMatrixWorld(true);const meshes=active?art.all.filter(mesh=>names.includes(mesh.name)):art.original;for(const mesh of meshes){m.copy(body).multiply(mesh.matrixWorld);const positions=mesh.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const p=new Vector3().fromBufferAttribute(positions,i).applyMatrix4(m);all.push(p);if(mesh.name!==names[0])torn.push(p);}}return{torn,all};}
it.each(variants)('%s compares baseline, held lens and constrained aim on identical source geometry',variant=>{
 const art=fixture(variant),sim=race();let frame=910;for(let n=1;n<=910;n++)step(sim,n);
 const rigs=[1.6,390/844,844/390].map(aspect=>{const b=new Baseline(),f=new Fov(),a=new Aim();for(const rig of[b,f,a])rig.camera.aspect=aspect;return{aspect,b,f,a};});
 let previousPhase='wrecked',snaps=0;const minimumGround=[Infinity,Infinity,Infinity],minimumNear=[Infinity,Infinity,Infinity];let largestQueries=0;
 try{for(let sample=0;sample<=270;sample++){
  const wall=sample/60,age=wall<=.82?wall*.18:.1476+wall-.82,target=910+Math.floor(age*120);while(frame<target)step(sim,++frame);
  const entry=sim.state.entries[0]!,state=entry.vehicle,phase=entry.galactic!.wreck.phase,extra=age-(frame-910)/120;
  const remaining=phase==='wrecked'?entry.galactic!.wreck.timer:2.15+extra;
  const pose=art.cache.update(state,remaining,sim.terrain,extra);art.breakup.update(pose,remaining,sim.terrain,extra);
  const cut=wall<=.82,lease=!cut&&(phase==='wrecked'||phase==='recovering');
  const subject:CameraSubject={position:new Vector3(state.position.x+state.velocity.x*extra,state.position.y+state.velocity.y*extra,state.position.z+state.velocity.z*extra),forward:new Vector3(Math.sin(state.orientation.yaw),0,Math.cos(state.orientation.yaw)),velocity:new Vector3(state.velocity.x,state.velocity.y,state.velocity.z),speed:state.telemetry.speed,
   combatFocus:pose.center,combatForward:pose.forward,combatRadius:pose.radius,combatBounds:pose.bounds,combatImpactPosition:pose.rupture?.position,combatImpactFraming:pose.impactFraming,combatTerrain:sim.terrain,wreckChase:lease,wreckRecovery:phase==='recovering'};
  const recovered=phase==='running'&&previousPhase!=='running';if(recovered)snaps++;
  const capture=phases.has(sample)||phase!==previousPhase;
  const body=capture?new Matrix4().compose(pose.position,new Quaternion().setFromEuler(pose.rotation),new Vector3(1,1,1)):null;
  const points=body?sources(art,body,phase==='wrecked'&&!!pose.impactFraming):null;
  for(const {aspect,b,f,a} of rigs){const reports:unknown[]=[];
   for(const [index,rig]of[b,f,a].entries()){
    rig.setMode(cut?'side':'chase');rig.setCombatFraming(cut);
    let queries=0;subject.combatTerrain={heightAt(x,z){queries++;return sim.terrain.heightAt(x,z);}};
    if(sample===0||recovered)rig.snap(subject);else rig.update(1/60,frame/120+extra,subject);
    largestQueries=Math.max(largestQueries,queries);
    const ground=rig.camera.position.y-sim.terrain.heightAt(rig.camera.position.x,rig.camera.position.z);
    const full=extent(rig.camera,pose.bounds);
    if(cut||lease){minimumGround[index]=Math.min(minimumGround[index]!,ground);minimumNear[index]=Math.min(minimumNear[index]!,full.nearest);
     if(!(ground>=1.2-1e-6))expect(ground,`${variant}/${sample}/${aspect}/${index} ground`).toBeGreaterThanOrEqual(1.2-1e-6);
     if(!(full.nearest>rig.camera.near+.49))expect(full.nearest,`${variant}/${sample}/${aspect}/${index} full source lens`).toBeGreaterThan(rig.camera.near+.49);
    }
    if(points)reports.push({fov:rig.camera.fov,allThreeOrIntact:extent(rig.camera,points.all),torn:phase==='wrecked'?extent(rig.camera,points.torn):null,composition:pose.impactFraming?extent(rig.camera,pose.impactFraming.bounds):null,eye:rig.camera.position.toArray(),rotation:rig.camera.quaternion.toArray(),ground,queries});
   }
   // FOV hypothesis changes the lens only, including spring history.
   expect(f.camera.position.toArray()).toEqual(b.camera.position.toArray());expect(f.camera.quaternion.toArray()).toEqual(b.camera.quaternion.toArray());
   if(recovered){expect(a.camera.position.toArray()).toEqual(b.camera.position.toArray());expect(a.camera.quaternion.toArray()).toEqual(b.camera.quaternion.toArray());expect(a.camera.fov).toEqual(b.camera.fov);expect(f.camera.fov).toEqual(b.camera.fov);}
   if(points)output.push({variant,wall,sample,simulationFrame:frame,eventAge:age,phase,cut,wreckChase:lease,recoverySnap:recovered,aspect,speed:state.telemetry.speed,framingAge:pose.impactFraming?.ageSeconds,halfSpan:pose.impactFraming?.horizontalHalfSpan,pointCount:points.all.length,reports});
  }
  previousPhase=phase;
 }
 expect(snaps).toBe(1);output.push({variant,summary:{minimumGround,minimumNear,largestQueries,recoverySnaps:snaps,scope:'CPU actual source projection, same 120 Hz state and bounded extrapolation with modeled .18 clock for 820ms. Not a native frame replay or visual acceptance.'}});
 }finally{for(const{b,f,a}of rigs){b.dispose();f.dispose();a.dispose();}art.breakup.reset();}
});
it('keeps ordinary, manual, reduced-motion, replay and unauthored fallback camera behavior identical',()=>{
 const subject:CameraSubject={position:new Vector3(2,10,7),forward:new Vector3(0,0,1),velocity:new Vector3(1,0,130),speed:130};
 for(const mode of ['chase','cockpit','side','hero'] as const)for(const reducedMotion of[false,true])for(const highlight of[false,true]){
  const b=new Baseline(),f=new Fov(),a=new Aim();for(const r of[b,f,a]){r.setMode(mode);r.setComfortSettings({reducedMotion});r.setHighlightFraming(highlight);r.snap(subject);}
  for(let frame=0;frame<8;frame++){for(const r of[b,f,a])r.update(1/60,frame/60,subject);for(const r of[f,a]){expect(r.camera.position.toArray()).toEqual(b.camera.position.toArray());expect(r.camera.quaternion.toArray()).toEqual(b.camera.quaternion.toArray());expect(r.camera.fov).toBe(b.camera.fov);}}
  for(const r of[b,f,a])r.dispose();
 }
});
