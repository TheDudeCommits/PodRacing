/** CPU-only acceptance-analyzer regressions; never imports or launches the harness. */
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('./inkstorm-outgoing-takedown.ts',import.meta.url),'utf8');
const start=source.indexOf('function pace('),end=source.indexOf('\ntry{',start);
assert(start>=0&&end>start,'Read the actual analyzer without executing browser setup.');
const code=stripTypeScriptTypes(source.slice(start,end));
function analyze(observation,garageCamera='hero'){
 const context=vm.createContext({receipt:{before:{camera:garageCamera}}});
 vm.runInContext(code,context);
 return context.analyze(observation);
}
function fixture(){
 const events=[
  {type:'wreck',racerId:'ai-test',takedownBy:'player',frame:1180,observedWallMs:1500},
  {type:'takedown',attackerId:'player',victimId:'ai-test',frame:1180},
  {type:'heat-lance-fired',racerId:'player'},
  {type:'pulse-shell',racerId:'player',active:true},
 ];
 // Independent synthetic clock: real time, 0.18x for820ms, then real time.
 // These values test evidence classification, not native gameplay or timing.
 const samples=Array.from({length:106},(_,i)=>{
  const wallMs=i*40,seconds=wallMs<1500?wallMs/1000:wallMs<2320?1.5+(wallMs-1500)/1000*.18:1.5+.82*.18+(wallMs-2320)/1000;
  return{wallMs,frame:1000+Math.round(seconds*120),raceTime:seconds,phase:'racing',paused:false,camera:'chase',matte:false,playerWreck:'running',
   wrecks:wallMs>=1500?[{id:'ai-test',takedownBy:'player'}]:[],cueKind:wallMs>=1500&&wallMs<2750?'takedown':null,cueTitle:'TAKEDOWN',cueAge:(wallMs-1500)/1250};
 });
 return{events,samples,inputs:[{fire:true,mine:true,shield:true}],truncated:false};
}
function expectFailure(change,issue){const observation=fixture();change(observation);const result=analyze(observation);assert.equal(result.outcome,'FAIL');assert(result.issues.some(text=>text.includes(issue)),JSON.stringify(result.issues));}

test('garage hero followed by stable racing chase is accepted',()=>{
 const result=analyze(fixture(),'hero');assert.equal(result.outcome,'PASS');assert.equal(result.cameraBaseline.camera,'chase');assert(result.cameraBaseline.lastWallMs<result.estimatedCueStartMs);
});
test('uses the last stable pre-event view after an earlier racing camera change',()=>{
 const observation=fixture();for(const s of observation.samples)if(s.wallMs>=1100)s.camera='cockpit';
 const result=analyze(observation);assert.equal(result.outcome,'PASS');assert.equal(result.cameraBaseline.camera,'cockpit');assert(result.cameraBaseline.firstWallMs>=1100);
});
test('genuine outgoing camera change is rejected',()=>expectFailure(o=>{for(const s of o.samples)if(s.wallMs>=1500&&s.wallMs<2320)s.camera='side';},'did not retain the pre-event racing camera'));
test('a camera shared with the garage cannot replace a different racing baseline',()=>expectFailure(o=>{for(const s of o.samples)if(s.wallMs>=1500)s.camera='hero';},'did not retain the pre-event racing camera'));
test('unstable pre-event cameras cannot be certified from the outgoing view',()=>expectFailure(o=>{for(const s of o.samples)if(s.wallMs<1500)s.camera=s.wallMs%80?'cockpit':'chase';},'No stable immediately pre-event'));
test('victim letterbox remains a failure',()=>expectFailure(o=>{for(const s of o.samples)if(s.wallMs>=1500&&s.wallMs<2320)s.matte=true;},'did not retain the pre-event racing camera'));
test('matching event attribution alone is insufficient without actual victim state',()=>expectFailure(o=>{for(const s of o.samples)s.wrecks=[];},'No matching player-attributed'));
test('missing authoritative player wreck remains failure',()=>expectFailure(o=>{o.events=o.events.filter(e=>e.type!=='wreck');},'No matching player-attributed'));
test('a generic hit cue cannot prove TAKEDOWN rendering',()=>expectFailure(o=>{for(const s of o.samples)s.cueKind='hit';},'visible TAKEDOWN cue'));
test('an unpaced clock cannot prove the outgoing slowdown',()=>expectFailure(o=>{for(const s of o.samples)s.frame=1000+Math.round(s.wallMs*.12);},'bounded slow scheduling'));
test('truncated observations remain failure',()=>expectFailure(o=>{o.truncated=true;},'observer was truncated'));
