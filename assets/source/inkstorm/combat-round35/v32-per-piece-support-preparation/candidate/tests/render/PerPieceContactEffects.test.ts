import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY, GALACTIC_EFFECT_DRAW_CALL_BUDGET } from '../../src/render/galactic/GalacticEffectsView';
const footprint = () => ({ center: new Vector3(), axis: new Vector3(0, 0, 1), halfLength: .12, halfWidth: .5,
 edges: [new Vector3(-2, 0, 5.6), new Vector3(2, 0, 0)] as const });
const rupture={position:new Vector3(),direction:new Vector3(1,0,0)};
describe('Per-piece contact pool and lifecycle',()=>{
 it('bounds eight three-part wrecks at 48 parents/96 cards with shared owner release and held-clock zero queries',()=>{
  const fx=new GalacticEffectsView(),terrain={heightAt:vi.fn((x:number,z:number)=>.1*x-.05*z)},f=footprint();
  const emit=(owner:number,sequence:number,time:number)=>{for(const partId of [0,1,2] as const)fx.emitWreckGroundContact(time,new Vector3(),new Vector3(1,0,0),f,{terrain,owner,sequence,partId});};
  const slots=(fx as unknown as {contactDustSlots:{active:boolean;owner:number;sequence:number;terrain:unknown}[]}).contactDustSlots;
  try{
   expect(GALACTIC_EFFECT_DRAW_CALL_BUDGET).toBe(9);expect(fx.children).toHaveLength(9);
   expect(GALACTIC_EFFECT_CAPACITY.contactDust).toBe(48);expect(GALACTIC_EFFECT_CAPACITY.contactDustCards).toBe(96);
   for(let owner=0;owner<8;owner++)emit(owner,1,0);
   const camera=new PerspectiveCamera(70,1.6,.1,120);camera.position.set(20,8,25);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
   const original=JSON.stringify(f);fx.update(.2,camera);expect(fx.contactDust.count).toBe(96);expect(terrain.heightAt).toHaveBeenCalledTimes(432);expect(fx.crashDebris.count).toBeLessThanOrEqual(64);
   const geometry=fx.contactDust.geometry.getAttribute('position'),matrix=new Matrix4();
   for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    camera.position.set(Math.sin(yaw)*25,8,Math.cos(yaw)*25);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
    terrain.heightAt.mockClear();fx.update(.2,camera);expect(terrain.heightAt).not.toHaveBeenCalled();
    for(let i=0;i<96;i++){fx.contactDust.getMatrixAt(i,matrix);expect(matrix.elements.every(Number.isFinite)).toBe(true);
     for(let j=0;j<geometry.count;j++){const p=new Vector3().fromBufferAttribute(geometry,j).applyMatrix4(matrix);expect(p.y-(.1*p.x-.05*p.z)).toBeGreaterThan(.0199);}}
   }
   expect(JSON.stringify(f)).toBe(original);
   // Wrap all three new parts over their owner's six old slots, then clear
   // that owner. Other racers must retain all their own simulation-clock aftermath entries; no stale callback survives overwrite.
   emit(0,2,.2);fx.syncWreckRupture(0,2,rupture);fx.update(.3);expect(fx.contactDust.count).toBe(96);
   fx.syncWreckRupture(0,2);fx.update(.3);expect(fx.contactDust.count).toBe(84);expect(slots.filter(s=>s.owner===0).every(s=>!s.active&&!s.terrain)).toBe(true);
   fx.syncWreckRupture(3,2,rupture);fx.update(.3);expect(fx.contactDust.count).toBe(72);
   fx.clearEffects();expect(slots.every(s=>!s.active&&!s.terrain)).toBe(true);expect(fx.contactDust.count).toBe(0);
   emit(4,3,1);terrain.heightAt.mockClear();fx.update(2.65-1e-10);expect(fx.contactDust.count).toBe(0);expect(terrain.heightAt).not.toHaveBeenCalled();
  }finally{fx.dispose();}
 });
 it('fails closed for malformed per-part data while preserving legacy point/fan behavior',()=>{
  const fx=new GalacticEffectsView(),terrain={heightAt:vi.fn(()=>0)},f=footprint(),context={terrain,owner:0,sequence:1,partId:1 as const};
  try{
   for(const value of [ {...context,partId:3}, {...context,owner:8}, {...context,sequence:NaN} ])fx.emitWreckGroundContact(0,new Vector3(),new Vector3(1,0,0),f,value as typeof context);
   fx.emitWreckGroundContact(0,new Vector3(),new Vector3(1,0,0),{...f,halfLength:0},context);
   fx.update(.1);expect(fx.contactDust.count).toBe(0);expect(fx.crashDebris.count).toBe(0);expect(fx.explosionPlates.count).toBe(0);expect(terrain.heightAt).not.toHaveBeenCalled();
   fx.emitWreckGroundContact(0,new Vector3(),new Vector3(1,0,0),f,context);fx.update(.1);expect(fx.contactDust.count).toBe(4);expect(fx.crashDebris.count).toBe(3);expect(fx.explosionPlates.count).toBe(0);
   fx.clearEffects();fx.emitWreckGroundContact(0,new Vector3(),new Vector3(1,0,0));fx.update(.1);expect(fx.contactDust.count).toBe(0);expect(fx.explosionPlates.count).toBe(2);expect(fx.crashDebris.count).toBe(10);
  }finally{fx.dispose();}
 });
});
