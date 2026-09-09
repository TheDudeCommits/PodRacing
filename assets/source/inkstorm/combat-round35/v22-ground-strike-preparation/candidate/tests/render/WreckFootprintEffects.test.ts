import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe,expect,it } from 'vitest';
import { GalacticEffectsView } from '../../src/render/galactic/GalacticEffectsView';

describe('Measured casing ejecta footprint',()=>{
 it('distributes existing sparks and two upright plates along the source ground band, without retaining mutable pose data',()=>{
  const view=new GalacticEffectsView(), camera=new PerspectiveCamera(60,1.6,.1,200),m=new Matrix4(),q=new Quaternion(),s=new Vector3(),p=new Vector3();
  camera.position.set(18,12,30);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const witness=new Vector3(0,3,-5),footprint={center:new Vector3(0,3,0),axis:new Vector3(0,0,1),halfLength:5,halfWidth:.7};
  try{
   const children=view.children.slice();view.emitWreckGroundContact(4,witness,new Vector3(1,0,0),footprint);
   footprint.center.set(1000,-1000,1000);footprint.axis.set(1,0,0);footprint.halfLength=1000;
   view.update(4.05,camera);expect(view.children).toEqual(children);expect(children).toHaveLength(8);
   expect(view.explosionPlates.count).toBe(2);expect(view.crashDebris.count).toBe(10);
   const zs:number[]=[];
   for(let i=0;i<10;i++){view.crashDebris.getMatrixAt(i,m);m.decompose(p,q,s);zs.push(p.z);expect(Math.abs(p.x)).toBeLessThan(2);}
   expect(Math.max(...zs)-Math.min(...zs)).toBeGreaterThan(8);
   for(let i=0;i<2;i++){
    view.explosionPlates.getMatrixAt(i,m);m.decompose(p,q,s);expect(s.x*2).toBeGreaterThan(8);
    expect(Math.abs(new Vector3(1,0,0).applyQuaternion(q).z)).toBeCloseTo(1,6);
    for(const x of[-1,1])for(const y of[-1,1])expect(new Vector3(x,y,0).applyMatrix4(m).y).toBeGreaterThan(3.03);
    expect(view.explosionPlates.geometry.getAttribute('aEffectSurface').getX(i)).toBe(5);
   }
   view.clearEffects();view.update(10,camera);expect(view.explosionPlates.count).toBe(0);expect(view.crashDebris.count).toBe(0);
  }finally{view.dispose();}
 });
 it('retains exact legacy point emission for omitted or invalid footprints, including reused slots',()=>{
  const a=new GalacticEffectsView(),b=new GalacticEffectsView(),camera=new PerspectiveCamera(60,1.6,.1,200);camera.position.set(18,12,30);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  try{
   const point=new Vector3(0,3,0),direction=new Vector3(1,0,0);
   a.emitWreckGroundContact(4,point,direction);b.emitWreckGroundContact(4,point,direction,{center:point,axis:direction,halfLength:Infinity,halfWidth:1});
   a.update(4.1,camera);b.update(4.1,camera);
   expect([...a.explosionPlates.instanceMatrix.array]).toEqual([...b.explosionPlates.instanceMatrix.array]);
   expect([...a.crashDebris.instanceMatrix.array]).toEqual([...b.crashDebris.instanceMatrix.array]);
   expect([...a.explosionPlates.geometry.getAttribute('aEffectSurface').array]).toEqual([...b.explosionPlates.geometry.getAttribute('aEffectSurface').array]);
  }finally{a.dispose();b.dispose();}
 });
});
