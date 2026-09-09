import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe,expect,it } from 'vitest';
import { GalacticEffectsView } from '../../src/render/galactic/GalacticEffectsView';

describe('Measured casing ejecta footprint',()=>{
 it('distributes ten solid fragments and two low outward sheets along the source ground band, without retaining mutable pose data',()=>{
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
    expect(view.explosionPlates.geometry.getAttribute('aEffectSurface').getX(i)).toBe(10+i);
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


describe('Casing exterior sand fan roots',()=>{
 const setup=()=>{const view=new GalacticEffectsView(),camera=new PerspectiveCamera(60,1.6,.1,200);camera.position.set(18,12,30);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);return{view,camera};};
 it('uses two measured heights and opposite outward departures while preserving slots, depth and mutable-input isolation',()=>{
  const {view,camera}=setup(),m=new Matrix4(),p=new Vector3(),q=new Quaternion(),s=new Vector3();
  const center=new Vector3(0,3,0),axis=new Vector3(0,0,1),edges:[Vector3,Vector3]=[new Vector3(-2,2.6,1),new Vector3(2.3,3.4,2)];
  const footprint={center,axis,halfLength:5,halfWidth:.7,edges};
  try{
   const children=view.children.slice(),material=view.explosionPlates.material;
   expect(Array.isArray(material)).toBe(false);if(Array.isArray(material))throw new Error('Unexpected material array');
   const opacity=material.opacity,program=material.customProgramCacheKey();expect(material.depthTest).toBe(true);
   view.emitWreckGroundContact(4,new Vector3(0,3,-5),new Vector3(1,0,0),footprint);
   edges[0].set(1000,-1000,1000);edges[1].set(-1000,1000,-1000);center.set(500,500,500);axis.set(1,0,0);
   const positions:number[][]=[];
   for(const time of[4.05,4.15]){
    view.update(time,camera);expect(view.children).toEqual(children);expect(children).toHaveLength(8);
    expect(view.explosionPlates.count).toBe(2);expect(view.crashDebris.count).toBe(10);
    const xs:number[]=[];
    for(let i=0;i<2;i++){
     view.explosionPlates.getMatrixAt(i,m);m.decompose(p,q,s);xs.push(p.x);
     
     expect((p.x-(i===0?-2:2.3))*(i===0?-1:1)).toBeGreaterThan(0);
     expect(Math.abs(p.x-(i===0?-2:2.3))).toBeLessThan(2.5);expect(p.z).toBeCloseTo(i===0?1:2,5);
     const bottom=new Vector3(0,-1,0).applyMatrix4(m);
     expect(bottom.x).toBeCloseTo(i===0?-2:2.3,5);expect(bottom.z).toBeCloseTo(i===0?1:2,5);
     expect(bottom.y).toBeCloseTo((i===0?2.6:3.4)+.08,5);
     const top=new Vector3(0,1,0).applyMatrix4(m);expect(top.y-bottom.y).toBeLessThanOrEqual(1.300001);
     expect(Math.abs(new Vector3(1,0,0).applyQuaternion(q).z)).toBeCloseTo(1,6);
     expect(view.explosionPlates.geometry.getAttribute('aEffectSurface').getX(i)).toBe(10+i);
    }
    positions.push(xs);
   }
   expect(positions[1]![0]).toBeLessThan(positions[0]![0]!);expect(positions[1]![1]).toBeGreaterThan(positions[0]![1]!);
   expect(material.opacity).toBe(opacity);expect(material.customProgramCacheKey()).toBe(program);expect(material.depthTest).toBe(true);
   view.clearEffects();view.update(10,camera);expect(view.explosionPlates.count).toBe(0);expect(view.crashDebris.count).toBe(0);
  }finally{view.dispose();}
 });
 it('rejects malformed or inward edges and overwrites valid edge data when the fixed pool wraps',()=>{
  const a=setup(),b=setup(),point=new Vector3(0,3,0),direction=new Vector3(1,0,0);
  const footprint={center:point,axis:new Vector3(0,0,1),halfLength:5,halfWidth:.7};
  const invalid:[Vector3,Vector3][]=[
   [new Vector3(Infinity,3,0),new Vector3(2,3,0)],
   [new Vector3(2,3,0),new Vector3(-2,3,0)],
   [new Vector3(-.1,3,0),new Vector3(.1,3,0)],
   [new Vector3(-2,3,20),new Vector3(2,3,0)],
   [new Vector3(-2,30,0),new Vector3(2,3,0)],
  ];
  try{
   a.view.emitWreckGroundContact(1,point,direction,{...footprint,edges:[new Vector3(-2,3,0),new Vector3(2,3,0)]});
   b.view.emitWreckGroundContact(1,point,direction,footprint);
   // Eighteen plate writes and ninety debris writes replace every prior slot.
   for(let i=0;i<9;i++){
    a.view.emitWreckGroundContact(4+i*.02,point,direction,{...footprint,edges:invalid[i%invalid.length]!});
    b.view.emitWreckGroundContact(4+i*.02,point,direction,footprint);
   }
   a.view.update(4.25,a.camera);b.view.update(4.25,b.camera);
   expect(a.view.explosionPlates.count).toBe(16);expect(a.view.crashDebris.count).toBe(64);
   expect([...a.view.explosionPlates.instanceMatrix.array]).toEqual([...b.view.explosionPlates.instanceMatrix.array]);
   expect([...a.view.crashDebris.instanceMatrix.array]).toEqual([...b.view.crashDebris.instanceMatrix.array]);
   expect([...a.view.explosionPlates.geometry.getAttribute('aEffectSurface').array]).toEqual([...b.view.explosionPlates.geometry.getAttribute('aEffectSurface').array]);
  }finally{a.view.dispose();b.view.dispose();}
 });
});
