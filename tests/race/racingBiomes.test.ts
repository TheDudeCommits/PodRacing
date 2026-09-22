import { stageRaceProgress } from '../helpers/stageRaceProgress';
import { describe, expect, it } from 'vitest';
import { RACING_BIOMES, RACING_BIOME_SEEDS, racingBiomeForSeed, racingBiomeHeatRate } from '../../src/game/race/racingBiomes';
import { createProceduralPodraceCourse, PodraceCourse } from '../../src/game/race/course';
import { createRacerProgressState } from '../../src/game/race/progress';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { getMasteryEvent } from '../../src/game/mastery/events';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState, stepPodracer } from '../../src/game/simulation';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { createRacingBiomeScenery } from '../../src/render/inkstorm/RacingBiomeScenery';
import { createRaceDirectorHudViewModel } from '../../src/ui/model';

const IDS = ['frozen', 'volcanic', 'jungle'] as const;
describe('racing destinations', () => {
  it.each(IDS)('%s has a deterministic playable route, with shared geometry across all three rulesets', (id) => {
    const seed = RACING_BIOME_SEEDS[id];
    const a = createProceduralPodraceCourse(FLAT_HEIGHT_SAMPLER, seed);
    const b = createProceduralPodraceCourse(FLAT_HEIGHT_SAMPLER, seed);
    expect(a.signature).toBe(b.signature);
    expect(a.totalLength).toBeGreaterThan(1000);
    expect(a.checkpoints.length).toBeGreaterThan(5);
    for (const kind of ['battle', 'race', 'trial']) {
      const event = getMasteryEvent(`biome-${id}-${kind}`);
      expect(event.seed).toBe(seed);
      expect(event.courseId).toBe(`biome-${id}-v1`);
    }
    const race = new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed, competitionProfile: 'clean-race', countdownSeconds: 0 });
    expect(race.biome).toBe(RACING_BIOMES[id]);
    for (let tick = 0; tick < 240; tick++) race.step({ throttle: 1 });
    for (const entry of race.state.entries) {
      expect(Number.isFinite(entry.vehicle.position.x + entry.vehicle.position.y + entry.vehicle.position.z)).toBe(true);
    }
  });
  it('keeps established desert handling as the default for every other seed', () => {
    expect(racingBiomeForSeed(0x494e4b53)).toBe(RACING_BIOMES.desert);
    expect(racingBiomeForSeed(41)).toBe(RACING_BIOMES.desert);
  });
  it('changes actual slide retention and cooling on the same physical surface', () => {
    function run(id: keyof typeof RACING_BIOMES) {
      const biome=RACING_BIOMES[id];
      const state=createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 70 });
      state.heat=.6; state.velocity.x=25;
      for(let i=0;i<60;i++) stepPodracer(state,{throttle:.5},{terrain:FLAT_HEIGHT_SAMPLER,surfaceTraction:biome.traction,coolingScale:biome.cooling});
      return state;
    }
    const ice=run('frozen'), desert=run('desert'), lava=run('volcanic');
    expect(Math.abs(ice.velocity.x)).toBeGreaterThan(Math.abs(desert.velocity.x));
    expect(ice.heat).toBeLessThan(desert.heat);
    expect(lava.heat).toBeGreaterThan(desert.heat);
  });
  it('leaves airborne lateral authority unchanged by ground grip', () => {
    const run=(traction:number)=>{
      const state=createPodracerState({terrain:FLAT_HEIGHT_SAMPLER,initialSpeed:70});
      state.position.y=100;state.grounded=false;state.velocity.x=20;
      for(let i=0;i<30;i++)stepPodracer(state,{throttle:1},{terrain:FLAT_HEIGHT_SAMPLER,surfaceTraction:traction});
      return state.velocity.x;
    };
    expect(run(.58)).toBe(run(1));
    expect(DEFAULT_PODRACER_CONFIG.fixedDelta).toBe(1/120);
  });
  it('keeps a safe centre lane and limits vent heat to the marked shoulder and section', () => {
    expect(racingBiomeHeatRate('volcanic',.35,24,30)).toBeGreaterThan(0);
    for(const [progress,lateral] of [[.35,0],[.2,24],[.6,24],[.35,40]])expect(racingBiomeHeatRate('volcanic',progress!,lateral!,30)).toBe(0);
    expect(racingBiomeHeatRate('frozen',.35,24,30)).toBe(0);
  });
  it('uses the actual narrow branch shoulder for vent heat rather than the main road width', () => {
    const terrain=FLAT_HEIGHT_SAMPLER;
    const main=new PodraceCourse(terrain,{seed:RACING_BIOME_SEEDS.volcanic,branches:[]});
    const points=Array.from({length:15},(_,i)=>{
      const p=main.sampleAtProgress(.30+i*.01);
      return {x:p.x+p.rightX*48,y:0,z:p.z+p.rightZ*48,width:10,canonicalProgress:p.progress,routeProgress:i/14};
    });
    const course=new PodraceCourse(terrain,{seed:RACING_BIOME_SEEDS.volcanic,branches:[{
      id:'narrow-vent-branch',kind:'technical',label:'Narrow vent branch',entryProgress:.30,exitProgress:.44,risk:.5,reward:.5,points,
    }]});
    const mid=points[7]!;
    const lane=course.projectPoint(mid.x,mid.z,mid.canonicalProgress);
    expect(lane.branchId).toBe('narrow-vent-branch');
    const run=(lateral:number)=>{
      const race=new RaceSimulation({terrain,course,competitionProfile:'time-trial',countdownSeconds:0});
      const entry=race.state.entries[0]!;
      entry.vehicle=createPodracerState({id:entry.id,terrain,position:{x:mid.x+lane.rightX*lateral,z:mid.z+lane.rightZ*lateral},yaw:Math.atan2(lane.tangentX,lane.tangentZ)});
      entry.progress=createRacerProgressState(course,mid.canonicalProgress);
      stageRaceProgress(entry, course, mid.canonicalProgress);
      race.step({throttle:0});
      return entry.vehicle.heat;
    };
    const safe=run(0);
    expect(run(7.5)-safe).toBeCloseTo(.075/120,10);
  });
  it('restores terrain grading when returning to Inkstorm', () => {
    const terrain=new TerrainSystem({levels:1,segmentsPerSide:16});
    try {
      terrain.setRacingBiome(RACING_BIOME_SEEDS.frozen);expect(terrain.materials.uniforms.biomeStrength.value).toBe(1);
      terrain.setRacingBiome(0x494e4b53);expect(terrain.materials.uniforms.biomeStrength.value).toBe(0);
    } finally { terrain.dispose(); }
  });
  it.each(IDS)('%s scenery uses bounded instanced batches and avoids playable lanes',id=>{
    const course=createProceduralPodraceCourse(FLAT_HEIGHT_SAMPLER,RACING_BIOME_SEEDS[id]);
    const meshes=createRacingBiomeScenery(course,()=>0);
    expect(meshes.length).toBe(id==='jungle'?3:2);
    for(const mesh of meshes) {
      expect(mesh.geometry.boundingSphere?.radius ?? 1).toBeGreaterThan(0);
      mesh.geometry.dispose();for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.dispose();
      if('dispose' in mesh)(mesh as unknown as {dispose():void}).dispose();
    }
  });
  it('names weather to match the destination',()=>{
    const state={seed:RACING_BIOME_SEEDS.frozen,events:[{id:'weather',kind:'sandstorm' as const,sectionTag:'wide-sweeper',duration:10,phase:'active' as const,activatedAt:0,completedAt:null,side:1 as const}]};
    expect(createRaceDirectorHudViewModel(state,1)?.title).toBe('Snow squall active');
  });
});
