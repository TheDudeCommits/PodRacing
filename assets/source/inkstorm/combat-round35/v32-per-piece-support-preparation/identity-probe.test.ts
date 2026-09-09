import { Matrix4, Vector3, type Object3D } from 'three';
import { afterAll, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fixture, matrices, race, step, variants } from '../../../../../tests/fixtures/teemtoActualCamera';
import { TeemtoAuthoredDamage as Baseline } from './baseline/src/render/combat/TeemtoAuthoredDamage';
import { GalacticEffectsView } from './candidate/src/render/galactic/GalacticEffectsView';
const rows: unknown[] = [];
afterAll(() => writeFileSync('assets/source/inkstorm/combat-round35/v32-per-piece-support-preparation/identity-probe.json', JSON.stringify(rows, null, 2)+'\n'));
it.each(variants)('%s exact baseline geometry identity and first-contact FX admission', name => {
 const art=fixture(name), old=fixture(name), sim=race();
 for(let frame=1;frame<=910;frame++)step(sim,frame);
 const access=old.breakup as unknown as { damage: Baseline; parts: {node:Object3D}[] };
 old.breakup.reset();access.damage=Baseline.create(old.root,old.original,access.parts[0]!.node,old.damage)!;
 const entry=sim.state.entries[0]!, before=JSON.stringify(sim.state), result: unknown[]=[];
 for(const age of [0,.075001,.083333333333,.130001,.141666666667,.180001,.191666666667,.23,.4,.65,.77,.9,1.4,1.81,2.15]) {
  const remaining=2.15-age,p=art.cache.update(entry.vehicle,remaining,sim.terrain),b=old.cache.update(entry.vehicle,remaining,sim.terrain);
  const t={heightAt:vi.fn((x:number,z:number)=>sim.terrain.heightAt(x,z))};
  art.breakup.update(p,remaining,t);const queries=t.heightAt.mock.calls.length;t.heightAt.mockClear();old.breakup.update(b,remaining,t);const oldQueries=t.heightAt.mock.calls.length;
  expect(matrices(art),`${name}/${age} meshes`).toEqual(matrices(old));expect(p.bounds.map(v=>v.toArray())).toEqual(b.bounds.map(v=>v.toArray()));
  expect(p.impactFraming?.bounds.map(v=>v.toArray())).toEqual(b.impactFraming?.bounds.map(v=>v.toArray()));
  expect(p.center.toArray()).toEqual(b.center.toArray());expect(p.radius).toBe(b.radius);expect(p.forward.toArray()).toEqual(b.forward.toArray());
  expect(p.rupture?.position.toArray()).toEqual(b.rupture?.position.toArray());
  expect(p.groundContact?.position.toArray()).toEqual(b.groundContact?.position.toArray());
  expect(JSON.stringify(p.groundContact?.footprint)).toEqual(JSON.stringify(b.groundContact?.footprint));
  if(p.groundContact)expect(p.groundContact.direction.distanceTo(b.groundContact!.direction)).toBeLessThan(1e-8);
  expect(queries-oldQueries).toBeLessThanOrEqual(2);const contacts=[];
  for(const c of p.groundContacts??[]) {
   const f=c.footprint!,fx=new GalacticEffectsView();fx.emitWreckGroundContact(0,c.position,c.direction,f,{terrain:sim.terrain,owner:0,sequence:1,partId:c.partId});fx.update(.1);expect(fx.contactDust.count,`${name}/${age}/${c.partId} cards`).toBe(4);expect(fx.explosionPlates.count).toBe(0);
   contacts.push({partId:c.partId,clearance:c.clearance,halfLength:f.halfLength,halfWidth:f.halfWidth,position:c.position.toArray(),witness:c.witness.toArray(),direction:c.direction.toArray(),edges:f.edges?.map(e=>{const d=e.clone().sub(f.center);return {along:d.dot(f.axis),across:d.x*f.axis.z-d.z*f.axis.x,y:e.y-f.center.y};}),cards:fx.contactDust.count,plates:fx.explosionPlates.count});fx.dispose();
  }
  result.push({age,queries,oldQueries,contacts});
 }
 expect(JSON.stringify(sim.state)).toBe(before);art.breakup.reset();old.breakup.reset();rows.push({name,result});
});
