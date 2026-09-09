import { Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY } from '../../src/render/galactic/GalacticEffectsView';
import { fixture, race, step, variants } from '../fixtures/teemtoActualCamera';
const rows: unknown[] = [];
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V29_CONTACT_METRICS_PATH;
  if (path) { const module: string = 'node:fs'; const {writeFileSync} = await import(/* @vite-ignore */ module); writeFileSync(path, JSON.stringify(rows, null, 2)+'\n'); }
});
interface Slot {active:boolean;startTime:number;duration:number;groundY:number;contactGround:boolean;metal:boolean;spark:boolean;wreckOwner:number;wreckSequence:number;x:number;z:number;}
describe('Actual first-contact sand consequence', () => {
  it.each(variants)('%s keeps the measured birth band/roots, low expanding sheets, and solid fragments above their sampled birth plane', name => {
    const art=fixture(name),sim=race(),fx=new GalacticEffectsView();for(let frame=1;frame<=910;frame++)step(sim,frame);
    const pose=art.cache.update(sim.state.entries[0]!.vehicle,2.15-.075,sim.terrain);art.breakup.update(pose,2.15-.075,sim.terrain);
    const contact=pose.groundContact!,f=contact.footprint!,before=JSON.stringify(f),roots=f.edges!.map(e=>e.clone().add(new Vector3(0,.08,0)));
    const children=fx.children.slice(),geometry=fx.crashDebris.geometry,source=geometry.getAttribute('position');
    const positions=Array.from({length:source.count},(_,i)=>new Vector3().fromBufferAttribute(source,i));
    const getAttribute=geometry.getAttribute.bind(geometry),m=new Matrix4(),p=new Vector3(),q=new Quaternion(),s=new Vector3();
    const slots=(fx as unknown as {debrisSlots:Slot[]}).debrisSlots;
    const metric:unknown[]=[];let minimum=Infinity,maximumRise=0,maximumWidth=0;
    try {
      expect(f.halfLength).toBeGreaterThan(1);expect(f.halfLength).toBeLessThan(2);
      fx.emitWreckGroundContact(4,contact.position,contact.direction,f);
      const born=slots.filter(s=>s.active);expect(born).toHaveLength(10);
      expect(born.filter(s=>s.metal)).toHaveLength(3);expect(born.filter(s=>!s.metal)).toHaveLength(7);
      expect(born.every(s=>s.contactGround&&!s.spark&&s.wreckOwner===-1&&s.wreckSequence===-1)).toBe(true);
      let lastWidth=[0,0];
      for(const age of[0,.05,.09,.16,.25,.32,.47,.7,1.0]){
        const spy=vi.spyOn(geometry,'getAttribute').mockImplementation(key=>{if(key==='position')throw new Error('Runtime geometry scan');return getAttribute(key);});
        try{fx.update(4+age);}finally{spy.mockRestore();}
        expect(fx.children).toEqual(children);expect(children).toHaveLength(8);
        const active=born.filter(s=>age>=s.startTime-4&&age<=s.duration+s.startTime-4);
        expect(fx.crashDebris.count).toBe(active.length);
        for(let i=0;i<active.length;i++){
          fx.crashDebris.getMatrixAt(i,m);m.decompose(p,q,s);
          for(const local of positions){const gap=local.clone().applyMatrix4(m).y-active[i]!.groundY;minimum=Math.min(minimum,gap);expect(gap).toBeGreaterThan(.03995);}
          expect(s.z/s.x).toBeCloseTo(1,6); // Actual bent primitive supplies shape; no needle stretch.
          expect(Math.hypot(p.x-active[i]!.x,p.z-active[i]!.z)).toBeLessThan(3.8);
          expect(fx.crashDebris.geometry.getAttribute('aFragmentMetal').getX(i)).toBe(active[i]!.metal?1:2);
        }
        const sheets=[];
        for(let i=0;i<fx.explosionPlates.count;i++){
          const kind=fx.explosionPlates.geometry.getAttribute('aEffectSurface').getX(i),index=kind-10;
          expect([10,11]).toContain(kind);fx.explosionPlates.getMatrixAt(i,m);m.decompose(p,q,s);
          const root=new Vector3(0,-1,0).applyMatrix4(m),top=new Vector3(0,1,0).applyMatrix4(m),rise=top.y-root.y,width=2*s.x;
          expect(root.distanceTo(roots[index]!)).toBeLessThan(.002);expect(rise).toBeGreaterThanOrEqual(.11999);expect(rise).toBeLessThanOrEqual(1.30001);
          expect(width).toBeGreaterThanOrEqual(lastWidth[index]!-1e-5);lastWidth[index]=width;
          const axial=new Vector3(1,0,0).applyQuaternion(q);expect(Math.abs(axial.dot(f.axis))).toBeCloseTo(1,6);
          for(const x of[-1,1])for(const y of[-1,1])expect(new Vector3(x,y,0).applyMatrix4(m).y).toBeGreaterThan(roots[index]!.y-.00001);
          if(age>=.7){expect(rise).toBeLessThan(.121);expect(width).toBeGreaterThan(7.5);}
          maximumRise=Math.max(maximumRise,rise);maximumWidth=Math.max(maximumWidth,width);
          sheets.push({kind,width,rise,root:root.toArray()});
        }
        metric.push({age,fragments:fx.crashDebris.count,sheets});
        const repeat=[...fx.explosionPlates.instanceMatrix.array,...fx.crashDebris.instanceMatrix.array];fx.update(4+age);
        expect([...fx.explosionPlates.instanceMatrix.array,...fx.crashDebris.instanceMatrix.array]).toEqual(repeat);
      }
      expect(JSON.stringify(f)).toBe(before);
      const material=fx.explosionPlates.material;expect(Array.isArray(material)).toBe(false);if(Array.isArray(material))throw new Error('material array');
      expect(material.depthTest).toBe(true);expect(material.depthWrite).toBe(false);
      expect(GALACTIC_EFFECT_CAPACITY.crashDebris).toBe(64);expect(GALACTIC_EFFECT_CAPACITY.explosionPlates).toBe(16);
      fx.update(5.20);expect(fx.crashDebris.count).toBe(0);expect(fx.explosionPlates.count).toBe(0);
      rows.push({name,actualBirthFootprint:JSON.parse(before),minimumPrimitiveGapToSampledPlane:minimum,maximumRise,maximumWidth,metric,
        scope:'Actual hero/rival first-contact footprint; complete existing fragment primitive checked against sampled birth plane only. No unsampled terrain clearance or native pixels claimed.'});
    }finally{fx.dispose();art.breakup.reset();}
  });
  it('handles a valid near-unit footprint with departure parallel to its axis without shear or non-finite basis',()=>{
    const fx=new GalacticEffectsView(),m=new Matrix4(),p=new Vector3(),q=new Quaternion(),s=new Vector3();
    try{
      fx.emitWreckGroundContact(1,new Vector3(),new Vector3(0,0,1),{center:new Vector3(),axis:new Vector3(0,0,.9995),halfLength:1.5,halfWidth:.5});fx.update(1.1);
      for(let i=0;i<2;i++){fx.explosionPlates.getMatrixAt(i,m);expect(m.elements.every(Number.isFinite)).toBe(true);m.decompose(p,q,s);expect(q.length()).toBeCloseTo(1,6);
        const a=new Vector3().setFromMatrixColumn(m,0).normalize(),b=new Vector3().setFromMatrixColumn(m,1).normalize();expect(a.dot(b)).toBeCloseTo(0,6);}
    }finally{fx.dispose();}
  });
  it.each(['point','rupture'] as const)('overwrites contact-only state when reused by %s effects',kind=>{
    const a=new GalacticEffectsView(),b=new GalacticEffectsView(),p=new Vector3(0,0,0),direction=new Vector3(1,0,0);
    try{
      a.emitWreckGroundContact(1,p,direction,{center:p,axis:new Vector3(0,0,1),halfLength:1.5,halfWidth:.5});
      b.emitWreckGroundContact(1,p,direction);
      for(let i=0;i<9;i++)for(const fx of[a,b]){
        if(kind==='point')fx.emitWreckGroundContact(4+i*.01,p,direction);
        else fx.emitCrash({type:'crash',time:4+i*.01,position:p,groundY:0,severity:2,style:'redline'});
      }
      a.update(4.12);b.update(4.12);
      expect((a as unknown as {debrisSlots:Slot[]}).debrisSlots.every(s=>!s.contactGround)).toBe(true);
      expect(a.crashDebris.count).toBe(64);
      // Generic crash plates retain staggered births: allocated capacity is not
      // the number visible at this timestamp. Reuse must match a clean history.
      expect(a.explosionPlates.count).toBe(b.explosionPlates.count);
      expect(a.explosionPlates.count).toBeGreaterThan(0);
      expect(a.explosionPlates.count).toBeLessThanOrEqual(GALACTIC_EFFECT_CAPACITY.explosionPlates);
      expect((a as unknown as {explosionSlots: unknown[]}).explosionSlots).toHaveLength(16);
      expect([...a.crashDebris.instanceMatrix.array]).toEqual([...b.crashDebris.instanceMatrix.array]);
      expect([...a.explosionPlates.instanceMatrix.array]).toEqual([...b.explosionPlates.instanceMatrix.array]);
      expect([...a.crashDebris.geometry.getAttribute('aFragmentMetal').array]).toEqual([...b.crashDebris.geometry.getAttribute('aFragmentMetal').array]);
      expect([...a.explosionPlates.geometry.getAttribute('aEffectSurface').array]).toEqual([...b.explosionPlates.geometry.getAttribute('aEffectSurface').array]);
    }finally{a.dispose();b.dispose();}
  });

});
