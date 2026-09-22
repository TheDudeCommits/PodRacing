import { describe, expect, it } from 'vitest';
import { createPodracerState, stepPodracer, DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';
import { createGalacticRacerState, applyGalacticImpact } from '../../src/game/galactic/system';
import { stepPodAbilities, type AbilityRacer } from '../../src/game/galactic/podAbilities';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import { RACING_BIOME_SEEDS } from '../../src/game/race/racingBiomes';
import { emptyMasteryProfile, parseMasteryProfile } from '../../src/game/mastery/storage';
import { driftBoostDuration } from '../../src/game/simulation/drift';

const dt=1/120;
function racer(id:string,identity:AbilityRacer['identity']='sebulba',x=0,z=0):AbilityRacer {
 return {id, identity, vehicle:createPodracerState({terrain:FLAT_HEIGHT_SAMPLER,position:{x,z}}),galactic:createGalacticRacerState(),progress:0,finished:false};
}
function fire(shield=false, x=0,z=32,blocked=false,battle=true) {
 const a=racer('a'),b=racer('b','teemto',x,z); b.galactic.shield.active=shield;b.galactic.shield.remaining=3;
 let damage=0, windups=0, active=0, impacts=0;
 for(let i=0;i<240;i++) {
  const result=stepPodAbilities([a,b],{a:normalizePlayerInput({ability:true})},dt,battle,()=>blocked?1:null);
  windups+=result.events.filter(e=>e.type==='pod-ability'&&e.phase==='windup').length;
  active+=result.events.filter(e=>e.type==='pod-ability'&&e.phase==='active').length;
  for(const impact of result.impacts) {expect(i).toBeGreaterThanOrEqual(53);impacts++;damage+=applyGalacticImpact(b.id,b.galactic,b.vehicle,DEFAULT_PODRACER_CONFIG,impact).appliedDamage;}
 }
 return {a,b,damage,windups,active,impacts};
}
describe('round 48 race rules',()=>{
 it.each([0x494e4b53,...Object.values(RACING_BIOME_SEEDS)])('removes all shortcut geometry and director events on %s', seed=>{
  const race=createRaceSimulation({terrain:FLAT_HEIGHT_SAMPLER,seed});
  expect(race.course.branches).toEqual([]);expect(race.course.getRenderData().branches??[]).toEqual([]);
  expect(race.state.director.events.some(e=>e.kind==='shortcut-window')).toBe(false);
 });
 it('makes flame commit after a tell, stop after its burst, and respect range, cover and shields',()=>{
  const clear=fire();expect(clear.windups).toBe(1);expect(clear.active).toBe(1);expect(clear.impacts).toBeGreaterThanOrEqual(10);
  expect(clear.damage).toBeGreaterThan(.2);expect(clear.damage).toBeLessThan(.31);
  expect(fire(true).damage).toBeLessThan(clear.damage*.2);
  expect(fire(false,30,32).damage).toBe(0);expect(fire(false,0,65).damage).toBe(0);expect(fire(false,0,-10).damage).toBe(0);
  expect(fire(false,0,32,true).damage).toBe(0);expect(fire(false,0,32,false,false).damage).toBe(0);
 });
 it('latches steering aim, rejects held-button repeats and preserves ability timing across snapshots',()=>{
  const a=racer('a');const inputs={a:normalizePlayerInput({ability:true,steer:-1})};
  stepPodAbilities([a],inputs,dt,true,()=>null);expect(a.galactic.ability?.direction).toBe(-1);
  inputs.a.steer=1;const restored=structuredClone(a);
  for(let i=0;i<1400;i++) {
   const one=stepPodAbilities([a],inputs,dt,true,()=>null),two=stepPodAbilities([restored],inputs,dt,true,()=>null);
   expect(one).toEqual(two);expect(one.events).not.toContainEqual(expect.objectContaining({phase:'windup'}));
  }
  expect(a).toEqual(restored);expect(a.galactic.ability?.direction).toBe(-1);
  stepPodAbilities([a],{a:normalizePlayerInput({})},dt,true,()=>null);
  expect(stepPodAbilities([a],inputs,dt,true,()=>null).events).toContainEqual(expect.objectContaining({phase:'windup'}));
 });
 it('vents heat and restores boost; shunts produce a lateral dodge without invulnerability',()=>{
  const a=racer('a','verdigris');a.vehicle.heat=.8;a.vehicle.boost.energy=.2;
  const b=racer('b','needle');b.vehicle.grounded=true;
  for(let i=0;i<180;i++)stepPodAbilities([a,b],{a:normalizePlayerInput({ability:true}),b:normalizePlayerInput({ability:true,steer:-1})},dt,true,()=>null);
  expect(a.vehicle.heat).toBeCloseTo(.4,2);expect(a.vehicle.boost.energy).toBeCloseTo(.32,2);
  expect(b.vehicle.velocity.x).toBeLessThan(-24);expect(b.galactic.wreck.invulnerable).toBe(0);
 });
 it('charges all three drift stages through a sustained countersteered arc and banks the release once',()=>{
  const state=createPodracerState({terrain:FLAT_HEIGHT_SAMPLER,initialSpeed:105});const stages:number[]=[];
  for(let tick=0;tick<420;tick++) {
   const result=stepPodracer(state,{throttle:1,drift:true,steer:tick<140?.35:-.22},{terrain:FLAT_HEIGHT_SAMPLER});
   for(const e of result.events)if(e.type==='drift-stage')stages.push(e.stage);
   expect(state.drift.direction).toBe(1);
  }
  expect(stages).toEqual([1,2,3]);
  const release=stepPodracer(state,{throttle:1},{terrain:FLAT_HEIGHT_SAMPLER});
  expect(release.events).toContainEqual(expect.objectContaining({type:'drift-boost',duration:1.75}));
  expect(stepPodracer(state,{throttle:1},{terrain:FLAT_HEIGHT_SAMPLER}).events.some(e=>e.type==='drift-boost')).toBe(false);
  expect(driftBoostDuration(.27)).toBe(0);expect(driftBoostDuration(.3)).toBe(.55);expect(driftBoostDuration(.6)).toBe(1.1);
 });
 it('keeps stored drift charge through a brief hop without earning airborne charge',()=>{
  const state=createPodracerState({terrain:FLAT_HEIGHT_SAMPLER,initialSpeed:80});
  for(let i=0;i<180;i++)stepPodracer(state,{throttle:1,steer:.4,drift:true},{terrain:FLAT_HEIGHT_SAMPLER});
  const charge=state.drift.charge;expect(charge).toBeGreaterThan(.28);
  state.position.y=20;state.grounded=false;state.airborneTime=.05;
  for(let i=0;i<12;i++)stepPodracer(state,{throttle:1,steer:.3,drift:true},{terrain:FLAT_HEIGHT_SAMPLER});
  expect(state.drift.active).toBe(true);expect(state.drift.charge).toBe(charge);
 });
 it('does not transfer old three-round cup points into the new four-destination cup',()=>{
  const profile=emptyMasteryProfile();profile.tutorialComplete=true;
  const previous={...profile,championship:{version:1,rounds:[{eventId:'cup-canyon',results:[{id:'player',name:'You',placement:1,points:15}]}]}};
  const migrated=parseMasteryProfile(JSON.stringify(previous));expect(migrated.championship).toEqual({version:2,rounds:[]});expect(migrated.tutorialComplete).toBe(true);
 });
});
