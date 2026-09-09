import { Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { fixture, race, step, matrices, variants } from '../fixtures/teemtoActualCamera';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION } from '../../src/render/combat/WreckVisualPose';
import { WreckGroundContactGate, isWreckSupportFootprint, type WreckPresentationSupport } from '../../src/render/combat/WreckGroundContact';
import { teemtoStrikeTime } from '../../src/render/combat/TeemtoStrikeMotion';
import { GalacticEffectsView } from '../../src/render/galactic/GalacticEffectsView';
const names = ['teemto-engine-left-body', 'teemto-damage-right-front-v16', 'teemto-damage-right-rear-v16'];
const unit = new Vector3(1, 1, 1), rows: unknown[] = [];
afterAll(async () => {
 const path=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env.V32_SUPPORT_METRICS_PATH;
 if(path){const module:string='node:fs';const {writeFileSync}=await import(/* @vite-ignore */ module);writeFileSync(path,JSON.stringify(rows,null,2)+'\n');}
});
function stoppedRace(){const sim=race();for(let f=1;f<=910;f++)step(sim,f);return sim;}
describe('Per-piece truthful presentation supports',()=>{
 it.each(variants)('%s publishes each actual source witness and exterior roots without changing geometry or simulation',name=>{
  const art=fixture(name),sim=stoppedRace(),vehicle=sim.state.entries[0]!.vehicle;
  const before=JSON.stringify(sim.state),rest=matrices(art),body=new Matrix4(),world=new Matrix4(),p=new Vector3();
  const engines=names.map(n=>art.all.find(m=>m.name===n)!);
  const caches=engines.map((mesh,i)=>{const c=new WreckVisualPoseCache(i!==0);c.refresh(art.root,[mesh],0);return c;});
  const restInverse=engines.map(m=>m.matrixWorld.clone().invert());const metrics:unknown[]=[];
  const sample=(age:number)=>{const remaining=2.15-age,pose=art.cache.update(vehicle,remaining,sim.terrain);
   const terrain={heightAt:vi.fn((x:number,z:number)=>sim.terrain.heightAt(x,z))};
   const spies=art.all.map(m=>vi.spyOn(m.geometry,'getAttribute').mockImplementation(()=>{throw Error('Uncached source read');}));
   try{art.breakup.update(pose,remaining,terrain);}finally{for(const spy of spies)spy.mockRestore();}
   expect(terrain.heightAt.mock.calls.length).toBeLessThanOrEqual((name==='hero'?459:402)+2);
   art.root.updateMatrixWorld(true);body.compose(pose.position,new Quaternion().setFromEuler(pose.rotation),unit);
   return {pose,queries:terrain.heightAt.mock.calls.length};};
  let array:readonly WreckPresentationSupport[]|undefined;const refs=new Map<number,WreckPresentationSupport>();
  try{
   for(const age of [0,.07499,.07501,.12999,.13001,.17999,.18001,.4,.65,.77,.9,1.8,1.81,2.15]){
    const {pose,queries}=sample(age),expected=age>1.8?[]:[0,1,2].filter(i=>age>teemtoStrikeTime(i));
    expect((pose.groundContacts??[]).map(c=>c.partId)).toEqual(expected);
    if(!expected.length){expect(pose.groundContacts).toBeUndefined();expect(pose.groundContact).toBeUndefined();continue;}
    if(array)expect(pose.groundContacts).toBe(array);else array=pose.groundContacts;
    expect(pose.groundContact).toBe(pose.groundContacts!.find(c=>c.partId===2));
    expect(pose.bounds).toHaveLength(name==='hero'?40:32);
    for(const c of pose.groundContacts!){
     const i=c.partId,f=c.footprint!,mesh=engines[i]!,source=mesh.geometry.getAttribute('position');
     if(refs.has(i))expect(c).toBe(refs.get(i));else refs.set(i,c);
     expect(c.kind).toBe('presentation-support');expect(c.clearance).toBeCloseTo(i===2?.1:.18,9);
     expect(c.witness.y-c.position.y).toBeCloseTo(c.clearance,9);expect(c.witness.x).toBe(c.position.x);expect(c.witness.z).toBe(c.position.z);
     expect(c.position.y).toBeCloseTo(sim.terrain.heightAt(c.position.x,c.position.z),9);
     expect(isWreckSupportFootprint(f)).toBe(true);expect(c.direction.y).toBe(0);expect(c.direction.length()).toBeCloseTo(1,9);
     world.copy(body).multiply(mesh.matrixWorld);let minimum=Infinity,witnessDistance=Infinity,left=Infinity,right=-Infinity;
     const sourceAlong:number[]=[],sourceAcross:number[]=[],cacheAlong:number[]=[],cacheAcross:number[]=[],edgeDistance=[Infinity,Infinity];
     for(let j=0;j<source.count;j++){
      p.fromBufferAttribute(source,j).applyMatrix4(world);const gap=p.y-sim.terrain.heightAt(p.x,p.z);minimum=Math.min(minimum,gap);
      witnessDistance=Math.min(witnessDistance,p.distanceTo(c.witness));const x=p.x-f.center.x,z=p.z-f.center.z,across=x*f.axis.z-z*f.axis.x;
      left=Math.min(left,across);right=Math.max(right,across);sourceAcross.push(across);if(gap<=.45)sourceAlong.push(p.x*f.axis.x+p.z*f.axis.z);
      for(let edge=0;edge<2;edge++)edgeDistance[edge]=Math.min(edgeDistance[edge]!,Math.hypot(p.x-f.edges![edge]!.x,p.z-f.edges![edge]!.z));
     }
     expect(minimum).toBeGreaterThanOrEqual(-1e-6);expect(witnessDistance).toBeLessThan(1e-7);
     const cacheWorld=world.clone().multiply(restInverse[i]!);
     for(const source of caches[i]!.supportPoints){p.copy(source).applyMatrix4(cacheWorld);cacheAcross.push((p.x-f.center.x)*f.axis.z-(p.z-f.center.z)*f.axis.x);if(p.y-sim.terrain.heightAt(p.x,p.z)<=.45)cacheAlong.push(p.x*f.axis.x+p.z*f.axis.z);}
     expect(cacheAlong.length).toBeGreaterThan(1);expect(sourceAlong.length).toBeGreaterThan(1);
     const low=Math.min(...cacheAlong),high=Math.max(...cacheAlong),center=f.center.x*f.axis.x+f.center.z*f.axis.z;
     expect(center-f.halfLength).toBeCloseTo(low,7);expect(center+f.halfLength).toBeCloseTo(high,7);
     const sourceMin=Math.min(...sourceAlong),sourceMax=Math.max(...sourceAlong);
     expect(low).toBeGreaterThanOrEqual(sourceMin-1e-7);expect(high).toBeLessThanOrEqual(sourceMax+1e-7);
     const coverage=Math.max(...sourceAlong.map(v=>Math.min(...cacheAlong.map(c=>Math.abs(c-v)))));
     expect(Math.abs(f.halfLength-(sourceMax-sourceMin)*.5)).toBeLessThanOrEqual(coverage+1e-7);
     // The fixed reduction retains real source vertices, but a new roll can
     // put an uncached vertex slightly farther out. Require exact cached
     // extrema and independently measured full-source coverage, never pretend
     // the root is the global extremum or inflate the near-ground band.
     const lateralCoverage=Math.max(...sourceAcross.map(v=>Math.min(...cacheAcross.map(c=>Math.abs(c-v)))));
     for(let edge=0;edge<2;edge++){const e=f.edges![edge]!;expect(edgeDistance[edge]).toBeLessThan(1e-7);
      expect(e.y).toBeCloseTo(sim.terrain.heightAt(e.x,e.z),8);const lateral=(e.x-f.center.x)*f.axis.z-(e.z-f.center.z)*f.axis.x;expect(lateral).toBeCloseTo(edge===0?Math.min(...cacheAcross):Math.max(...cacheAcross),7);
      expect(Math.abs(lateral-(edge===0?left:right))).toBeLessThanOrEqual(lateralCoverage+1e-7);}
     metrics.push({age,partId:i,clearance:c.clearance,actualMinimum:minimum,reportedLength:f.halfLength*2,sourceLength:sourceMax-sourceMin,coverage,lateralCoverage,queries});
    }
   }
   const settled=sample(.9),owned=settled.pose;expect(owned.groundContacts).toHaveLength(3);art.breakup.reset();expect(owned.groundContacts).toBeUndefined();expect(owned.groundContact).toBeUndefined();
   expect(matrices(art)).toEqual(rest);expect(JSON.stringify(sim.state)).toBe(before);rows.push({name,metrics});
  }finally{art.breakup.reset();}
 });
 it.each(variants)('%s emits staggered supports once per part and spends only six parents/ten grit',name=>{
  const art=fixture(name),sim=stoppedRace(),gate=new WreckGroundContactGate(),fx=new GalacticEffectsView(),emitted:number[]=[];
  gate.begin('racer',910,1);const terrain={heightAt:vi.fn((x:number,z:number)=>sim.terrain.heightAt(x,z))};
  try{
   // Same game-clock sequence as production: birth, rear, front, left. Repeated
   // renders and duplicate begin packets cannot reseed any already spent bit.
   for(const [frame,age] of [[910,0],[919,.07501],[926,.13001],[932,.18001],[933,.18001],[945,.3]]){
    const remaining=2.15-age!,pose=art.cache.update(sim.state.entries[0]!.vehicle,remaining,sim.terrain);art.breakup.update(pose,remaining,sim.terrain);
    gate.begin('racer',910,1);
    for(const c of pose.groundContacts??[])if(gate.take('racer',frame!,1,c)){emitted.push(c.partId);fx.emitWreckGroundContact(age!,c.position,c.direction,c.footprint,{terrain,owner:0,sequence:1,partId:c.partId});}
   }
   expect(emitted).toEqual([2,1,0]);terrain.heightAt.mockClear();fx.update(.23);expect(terrain.heightAt).toHaveBeenCalledTimes(54);
   expect(fx.contactDust.count).toBe(12);expect(fx.crashDebris.count).toBe(10);expect(fx.explosionPlates.count).toBe(0);
   const debris=(fx as unknown as {debrisSlots:{active:boolean;metal:boolean}[]}).debrisSlots;
   expect(debris.filter(s=>s.active&&s.metal)).toHaveLength(3);expect(debris.filter(s=>s.active&&!s.metal)).toHaveLength(7);
   terrain.heightAt.mockClear();fx.update(.23);expect(terrain.heightAt).not.toHaveBeenCalled();
   fx.syncWreckRupture(0,1);fx.update(.23);expect(fx.contactDust.count).toBe(0);
  }finally{fx.dispose();art.breakup.reset();}
 });
 it.each(variants)('%s uses each supported-center derivative, including base translation and angular motion',name=>{
  const art=fixture(name),sim=stoppedRace(),state=sim.state.entries[0]!.vehicle,terrain={heightAt:(x:number,z:number)=>.025*x-.04*z};
  const engines=names.map(n=>art.all.find(m=>m.name===n)!);engines.forEach(m=>m.geometry.computeBoundingBox());
  const center=engines.map(m=>m.geometry.boundingBox!.getCenter(new Vector3())),velocity=new Vector3(2,0,-1),omega=new Vector3(.02,.08,-.015),body=new Matrix4();
  const sample=(age:number,delta=0)=>{
   const remaining=WRECK_PRESENTATION_DURATION-age-delta,pose=art.cache.update(state,remaining,terrain);
   pose.baseMotion!.position.addScaledVector(velocity,delta);pose.baseMotion!.rotation.x+=omega.x*delta;pose.baseMotion!.rotation.y+=omega.y*delta;pose.baseMotion!.rotation.z+=omega.z*delta;
   pose.baseMotion!.velocity.copy(velocity);pose.baseMotion!.angularVelocity.set(omega.x,omega.y,omega.z);
   art.breakup.update(pose,remaining,terrain);art.root.updateMatrixWorld(true);body.compose(pose.position,new Quaternion().setFromEuler(pose.rotation),unit);
   return {directions:pose.groundContacts!.map(c=>[c.partId,c.direction.clone()] as const),centers:engines.map((m,i)=>center[i]!.clone().applyMatrix4(body.clone().multiply(m.matrixWorld)).setY(0))};
  };
  try{for(const age of [.2,.4,.6,.72]){const epsilon=.0001,a=sample(age,-epsilon),b=sample(age,epsilon),current=sample(age);
   for(const [i,direction] of current.directions){const derivative=b.centers[i]!.sub(a.centers[i]!).normalize();
    expect(direction.dot(derivative),`${name}/${age}/${i}`).toBeGreaterThan(.99999);}
  }}finally{art.breakup.reset();}
 });
});
