import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { prepareHero, disposeSources, race, step } from '../settled-pose-diagnosis/fixture';
const art = await prepareHero(), sim = race();
const raw = JSON.parse(readFileSync('output/playwright/round35-combat-v30/solo-chase-observations.json', 'utf8'));
const first = raw.samples.find((r: any) => r.wreck === 'wrecked');
let result: any;
try {
  for (let frame=1; frame<=924; frame++) {
    step(sim,frame); const e=sim.state.entries[0]!; if(e.galactic?.wreck.phase!=='wrecked') continue;
    const pose=art.cache.update(e.vehicle,e.galactic.wreck.timer,sim.terrain);art.breakup.update(pose,e.galactic.wreck.timer,sim.terrain);
    if(!pose.groundContact)continue;
    const c=pose.groundContact,f=c.footprint!,match=raw.samples.reduce((a:any,b:any)=>Math.abs(a.frame-frame)<=Math.abs(b.frame-frame)?a:b);
    const camera=raw.samples.reduce((a:any,b:any)=>Math.abs(a.wallMs-first.wallMs-1040)<=Math.abs(b.wallMs-first.wallMs-1040)?a:b);
    result={birth:{frame,witness:c.position.toArray(),direction:c.direction.toArray(),footprint:{center:f.center.toArray(),axis:f.axis.toArray(),halfLength:f.halfLength,halfWidth:f.halfWidth,edges:f.edges?.map(e=>e.toArray())},positionDifference:new Vector3(e.vehicle.position.x,e.vehicle.position.y,e.vehicle.position.z).distanceTo(new Vector3(...match.position)),nativeFrame:match.frame},rows:[{phase:'debris-return',native:{frame:camera.frame,wallMs:camera.wallMs,cameraPosition:camera.cameraPosition}}],scope:'Actual V30 input reconstruction. Camera position from recorded sample closest first-native-wreck+1040ms; approximate video/native clock map, no recorded quaternion. Component target is chosen, not native pixel matching.'};break;
  }
} finally {art.breakup.reset();disposeSources();}
if(!result)throw Error('No actual rear contact');
export default result;
