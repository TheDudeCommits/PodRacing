import { PerspectiveCamera, Vector3 } from 'three';
import { describe,expect,it } from 'vitest';
import { GalacticEffectsView as V22 } from './before-runtime/GalacticEffectsView';
import { GalacticEffectsView as V23 } from './test-runtime/GalacticEffectsView';

describe('Pinned V22 emitter parity',()=>{
 it('preserves exact point and legacy centre-footprint instances, surface attributes and counts',()=>{
  const old=new V22(),candidate=new V23(),camera=new PerspectiveCamera(60,1.6,.1,200);
  camera.position.set(18,12,30);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const point=new Vector3(0,3,0),direction=new Vector3(.6,0,.8),span={center:point,axis:new Vector3(0,0,1),halfLength:5,halfWidth:.7};
  try {
   for(let index=0;index<12;index++){
    const footprint=index%2?span:undefined;
    old.emitWreckGroundContact(4+index*.01,point,direction,footprint);
    candidate.emitWreckGroundContact(4+index*.01,point,direction,footprint);
   }
   for(const time of[4.15,4.3,4.6,5.3]){
    old.update(time,camera);candidate.update(time,camera);
    expect(candidate.explosionPlates.count).toBe(old.explosionPlates.count);expect(candidate.crashDebris.count).toBe(old.crashDebris.count);
    expect([...candidate.explosionPlates.instanceMatrix.array]).toEqual([...old.explosionPlates.instanceMatrix.array]);
    expect([...candidate.crashDebris.instanceMatrix.array]).toEqual([...old.crashDebris.instanceMatrix.array]);
    expect([...candidate.explosionPlates.geometry.getAttribute('aEffectSurface').array]).toEqual([...old.explosionPlates.geometry.getAttribute('aEffectSurface').array]);
   }
  }finally {old.dispose();candidate.dispose();}
 });
});
