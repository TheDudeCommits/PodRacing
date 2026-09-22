import { createServer } from 'vite';
import { mkdir,writeFile } from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
 const {RaceSimulation}=await server.ssrLoadModule('/src/game/race/RaceSimulation.ts');
 const {createAIControllerState,stepAIController}=await server.ssrLoadModule('/src/game/ai/index.ts');
 const {sampleTerrainHeight}=await server.ssrLoadModule('/src/render/terrain/terrainMath.ts');
 const {RACING_BIOME_SEEDS}=await server.ssrLoadModule('/src/game/race/racingBiomes.ts');
 const identities=['teemto','sebulba','polwo','blockrunner','verdigris','skybolt','needle','pog'];
 const results=[];
 for(const [biome,seed] of Object.entries({desert:0x494e4b53,...RACING_BIOME_SEEDS})){
  const race=new RaceSimulation({terrain:{heightAt:sampleTerrainHeight},seed,countdownSeconds:3,totalLaps:1,competitionProfile:'clean-race',resultsGraceSeconds:20});
  const entries=race.state.entries;
  for(const [i,e] of entries.entries()) {race.selectRacerVehicle(e.id,'podracer');if (!race.selectRacerPodIdentity(e.id,identities[i])) throw new Error(`Selection rejected: ${e.id}`);}
  const player=entries[0],controller=createAIControllerState('clean',99,'medium');
  const snapshots=()=>entries.map(e=>({id:e.id,x:e.vehicle.position.x,y:e.vehicle.position.y,z:e.vehicle.position.z,velocityX:e.vehicle.velocity.x,velocityY:e.vehicle.velocity.y,velocityZ:e.vehicle.velocity.z,yaw:e.vehicle.orientation.yaw,speed:e.vehicle.telemetry.speed,boostEnergy:e.vehicle.boost.energy,heat:e.vehicle.heat,grounded:e.vehicle.grounded,courseProgress:e.progress.courseProgress,unwrappedProgress:e.progress.unwrappedProgress,completedLaps:e.progress.completedLaps,finished:e.status==='finished'}));
  const counts={},samples=[];let ticks=0;const begin=performance.now();
  while(ticks<120*240 && race.state.phase!=='finished'){
   const sn=snapshots();
   const input=stepAIController(controller,{course:race.course,self:sn[0],opponents:sn.slice(1),playerRaceScore:player.progress.unwrappedProgress,requiredCheckpoint:race.requiredCheckpointFor(player),vehicleConfig:race.vehicleConfigFor(player),delta:1/120,raceTime:race.state.raceTime,allowCatchup:false}).input;
   const time=performance.now(),r=race.step(input);samples.push(performance.now()-time);
   for(const [id,events]of Object.entries(r.vehicleEvents))for(const e of events)if(['reset','collision','landing'].includes(e.type))counts[`${id}/${e.type}`]=(counts[`${id}/${e.type}`]??0)+1;
   ticks++;
  }
  const sorted=samples.toSorted((a,b)=>a-b);
  const receipt={biome,seed,wallSeconds:(performance.now()-begin)/1000,simulationSeconds:ticks/120,phase:race.state.phase,stepMs:{p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)]},counts,entries:entries.map(e=>({id:e.id,identity:e.podIdentity,status:e.status,progress:e.progress,damage:e.vehicle.damage}))};
  results.push(receipt);console.log(JSON.stringify({biome,seconds:receipt.simulationSeconds,phase:receipt.phase,stepMs:receipt.stepMs,entries:receipt.entries.map(e=>({id:e.id,pod:e.identity,finish:e.progress.finishTime,lap:e.progress.completedLaps,progress:e.progress.courseProgress}))}));
  await mkdir('output/round48',{recursive:true});await writeFile('output/round48/full-race.json',JSON.stringify(results,null,2));
 }
} finally {await server.close();}
