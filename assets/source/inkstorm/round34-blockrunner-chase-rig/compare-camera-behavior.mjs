// CPU-only actual camera class comparison; no renderer, browser or live edits.
import { Vector3 } from 'three';
import { writeFileSync } from 'node:fs';
import { CinematicCamera as Before } from './baseline/src/camera/CinematicCamera.ts';
import { CinematicCamera as Candidate } from './candidate/src/camera/CinematicCamera.ts';

const snapshot = (camera) => ({ position: camera.camera.position.toArray(),
  quaternion: camera.camera.quaternion.toArray(), fov: camera.camera.fov });
const state = () => ({position:new Vector3(12,6,-8),forward:new Vector3(.3,0,.7).normalize(),
  velocity:new Vector3(40,0,120),speed:135,
  routeLookAhead:new Vector3(60,-20,100),junctionLookAhead:new Vector3(-100,3,190),junctionWeight:.6});
const records=[];
for (const mode of ['chase','hero','side','course','cockpit']) {
  for (const clearance of [0,5.2,4.8]) {
    const before=new Before(),candidate=new Candidate(),subject=state(); subject.chaseClearance=clearance;
    before.setMode(mode);candidate.setMode(mode);
    before.snap(subject);candidate.snap(subject);
    if(JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(candidate)))throw Error('Default snap changed');
    for(let i=0;i<60;i++){
      subject.position.addScaledVector(subject.velocity,1/60);
      before.update(1/60,i/60,subject);candidate.update(1/60,i/60,subject);
      if(JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(candidate)))throw Error('Default update changed');
    }
    records.push({mode,clearance,snapAnd60UpdatesBitExact:true});
    before.dispose();candidate.dispose();
  }
}
const before=new Before(),candidate=new Candidate(),subject=state();
subject.chaseClearance=4.8;subject.chaseRig={boom:11.3,height:7.9,aimHeight:1.4};
const nonChase=[];
for(const mode of ['hero','side','course','cockpit']){
  before.setMode(mode);candidate.setMode(mode);before.snap(subject);candidate.snap(subject);
  if(JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(candidate)))throw Error('Non-chase explicit rig changed');
  nonChase.push({mode,explicitRigIgnored:true});
}
candidate.setMode('chase');before.setMode('chase');
subject.chaseRig={boom:NaN,height:7.9,aimHeight:1.4};
before.snap(subject);candidate.snap(subject);
if(JSON.stringify(snapshot(before))!==JSON.stringify(snapshot(candidate)))throw Error('Invalid rig did not fall back');
candidate.setComfortSettings({reducedMotion:true});
subject.chaseRig={boom:11.3,height:7.9,aimHeight:1.4};
candidate.snap(subject);const initial=snapshot(candidate);
candidate.impulse(2);candidate.landingImpulse(2);candidate.update(1/60,1,subject);
if(candidate.camera.fov!==62 || JSON.stringify(snapshot(candidate))!==JSON.stringify(initial))throw Error('Reduced motion changed');
before.dispose();candidate.dispose();
writeFileSync(new URL('./camera-behavior-comparison-v1.json',import.meta.url),JSON.stringify({
  scope:'CPU-only actual private baseline/candidate camera class calls. No renderer/GPU/browser, no simulation mutation except explicit test subject translation. Not a visual/performance pass.',
  noExplicitRig:records,nonChase,invalidRigFallsBack:true,reducedMotionKeepsPoseAndFov62:true,
},null,2)+'\n');
console.log('15 absent-rig snap/update cases exact; four non-chase modes exact; invalid fallback and reduced-motion checks passed.');
