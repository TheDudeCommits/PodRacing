import { readFileSync } from 'node:fs';
import { RaceSimulation } from '/Users/amir/Projects/PodRacing/src/game/race/RaceSimulation.ts';
import { sampleTerrainHeight } from '/Users/amir/Projects/PodRacing/src/render/terrain/terrainMath.ts';
import { sampleBridgeSurface } from '/Users/amir/Projects/PodRacing/src/game/race/bridgeSurface.ts';
const receipt = JSON.parse(readFileSync('output/playwright/round35-combat-v21/receipt.json','utf8'));
const sim = new RaceSimulation({ terrain: {heightAt: sampleTerrainHeight}, seed: 1229867859, totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
const field = (x:number,z:number) => sampleTerrainHeight(x,z) + (sim.courseGulfField?.sampleOffset(x,z)??0) + (sim.pitPadField?.sampleOffset(x,z)??0);
const out:any={method:'CPU analytic vertex samples, exact LOD0 triangle connectivity; no GPU float emulation or native GPU readback',seed:sim.course.seed,courseSignature:sim.course.signature,patch:{halfWidthMetres:20,stepMetres:1,lod0CellMetres:1.5},captures:[]};
for (const cap of receipt.cases[0].captures.filter((c:any)=>['wreck','restored'].includes(c.name))) {
 const s=cap.snapshot, [px,,pz]=s.game.position, [cx,,cz]=s.game.cameraPosition, step=1.5;
 const result:any={name:cap.name,frame:s.simulationFrame,playerPosition:s.game.position,cameraPosition:s.game.cameraPosition,samples:0,minMeshMinusContinuous:Infinity,maxMeshMinusContinuous:-Infinity,maxBridgeDelta:0,minGulfOffset:Infinity,maxGulfOffset:-Infinity,minPitOffset:Infinity,maxPitOffset:-Infinity,maxCameraChebyshev:0,worstNegative:null,worstPositive:null,shadow:s.renderer.racerShadow};
 for(let dz=-20;dz<=20;dz++)for(let dx=-20;dx<=20;dx++){
  const x=px+dx,z=pz+dz, gx=(x-cx+96)/step,gz=(z-cz+96)/step,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
  const ax=cx-96+ix*step,az=cz-96+iz*step,a=field(ax,az),c=field(ax+step,az+step);
  const height=v<=u ? a*(1-u)+field(ax+step,az)*(u-v)+c*v : a*(1-v)+field(ax,az+step)*(v-u)+c*u;
  const continuous=field(x,z),difference=height-continuous;
  if(difference<result.minMeshMinusContinuous){result.minMeshMinusContinuous=difference;result.worstNegative={x,z,height,continuous};}
  if(difference>result.maxMeshMinusContinuous){result.maxMeshMinusContinuous=difference;result.worstPositive={x,z,height,continuous};}
  result.maxBridgeDelta=Math.max(result.maxBridgeDelta,sim.terrain.heightAt(x,z)-continuous);
  const gulf=sim.courseGulfField?.sampleOffset(x,z)??0,pit=sim.pitPadField?.sampleOffset(x,z)??0;
  result.minGulfOffset=Math.min(result.minGulfOffset,gulf);result.maxGulfOffset=Math.max(result.maxGulfOffset,gulf);
  result.minPitOffset=Math.min(result.minPitOffset,pit);result.maxPitOffset=Math.max(result.maxPitOffset,pit);
  result.maxCameraChebyshev=Math.max(result.maxCameraChebyshev,Math.abs(x-cx),Math.abs(z-cz));result.samples++;
 }
 const t=result.shadow.texelMetres;
 result.shadowWorldDepthBias=Math.max(.025,t*.5);result.shadowNormalBias=Math.max(.06,t*1.5);
 result.baseAtPlayer=sampleTerrainHeight(px,pz);result.renderFieldAtPlayer=field(px,pz);result.physicsAtPlayer=sim.terrain.heightAt(px,pz);result.bridgeAtPlayer=sampleBridgeSurface(sim.course.branches,px,pz);
 result.flatGroundVerticalShadowBiasEquivalent=result.shadowNormalBias+result.shadowWorldDepthBias*(.76/Math.sqrt(.42**2+.76**2+.5**2));
 out.captures.push(result);
}
export default out;
