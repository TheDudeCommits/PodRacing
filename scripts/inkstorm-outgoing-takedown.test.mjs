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
function functions(garageCamera='hero'){
 const context=vm.createContext({receipt:{before:{camera:garageCamera}}});
 vm.runInContext(code,context);
 return context;
}
function analyze(observation,garageCamera='hero',selected={racerId:'ai-test',frame:1180}){
 return functions(garageCamera).analyze(observation,selected);
}
function kill(racerId,frame,wallMs,{playerWreck='running',deadline=null,role='solo',profile='chaos'}={}){
 const context={wallMs:wallMs-16,frame:frame-2,phase:'racing',paused:false,role,competitionProfile:profile,
  playerWreck,camera:'chase',matte:false,combatPresentation:{cooldownUntilWallMs:deadline,cinematic:null}};
 return{type:'wreck',racerId,takedownBy:'player',frame,observedWallMs:wallMs,
  eligibilityContext:{before:context,observed:{...context,wallMs,frame}}};
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

test('retains every kill and selects the first running candidate outside actual controller cooldown',()=>{
 const api=functions(),ledger=[];
 const recovering=kill('ai-recovery',1360,3000,{playerWreck:'recovering',deadline:6000});
 const cooling=kill('ai-cooldown',1600,5000,{deadline:6000});
 assert.equal(api.retainOutgoingCandidates(ledger,[recovering,cooling],[]),null);
 assert.deepEqual(Array.from(ledger[0].policyReasons),['cinematic-cooldown']);
 assert.deepEqual(Array.from(ledger[0].scenarioReasons),['player-not-running']);
 assert.deepEqual(Array.from(ledger[1].scenarioReasons),[]);
 const first=kill('ai-eligible',1760,6100,{deadline:6000}),later=kill('ai-later',1880,7100,{deadline:6000});
 const selected=api.retainOutgoingCandidates(ledger,[recovering,cooling,first,later],[]);
 assert.equal(selected.racerId,'ai-eligible');assert.equal(ledger.length,4);
 assert.equal(api.retainOutgoingCandidates(ledger,[later,first],[]),selected);
 // A denied kill must not extend6000ms to11000ms; use the actual raw deadline.
 assert.equal(selected.cooldownUntilWallMs,6000);assert.equal(selected.eligible,true);
});

test('recovery is a scenario exclusion even when runtime cooldown is already clear',()=>{
 const candidate=functions().outgoingCandidate(kill('ai-test',1180,7000,{playerWreck:'recovering',deadline:6000}),[]);
 assert.equal(candidate.eligible,false);assert.deepEqual(Array.from(candidate.policyReasons),[]);
 assert.deepEqual(Array.from(candidate.scenarioReasons),['player-not-running']);
});

test('reads PRE-event cooldown rather than rejecting an accepted target whose post-event deadline advanced',()=>{
 const event=kill('ai-test',1180,7000,{deadline:6000});
 event.eligibilityContext.observed.combatPresentation={cooldownUntilWallMs:13000,
  cinematic:{startedAtWallMs:7000,focusRacerId:'ai-test',victim:false}};
 const candidate=functions().outgoingCandidate(event,[]);
 assert.equal(candidate.eligible,true);assert.equal(candidate.cooldownUntilWallMs,6000);
});

test('uses the controller deadline boundary and records a straddled observation interval',()=>{
 const api=functions();
 assert.equal(api.outgoingCandidate(kill('ai-test',1180,5999,{deadline:6000}),[]).eligible,false);
 const boundary=api.outgoingCandidate(kill('ai-test',1180,6000,{deadline:6000}),[]);
 assert.equal(boundary.eligible,true);assert.equal(boundary.cooldownBoundaryStraddled,true);
});

test('missing diagnostics and a nonpreceding snapshot cannot certify eligibility',()=>{
 const api=functions(),missing=kill('ai-test',1180,7000),late=kill('ai-test',1180,7000);
 delete missing.eligibilityContext.before.combatPresentation;
 late.eligibilityContext.before.frame=1180;
 assert(api.outgoingCandidate(missing,[]).policyReasons.includes('missing-controller-cooldown'));
 assert(api.outgoingCandidate(late,[]).policyReasons.includes('missing-pre-event-context'));
 assert.equal(api.outgoingCandidate(missing,[]).eligible,false);
 assert.equal(api.outgoingCandidate(late,[]).eligible,false);
});

test('role, profile, racing and pause gates use raw pre-event and observed state',()=>{
 for(const mutate of [
  e=>{e.eligibilityContext.before.role='guest';},
  e=>{e.eligibilityContext.observed.competitionProfile='time-trial';},
  e=>{e.eligibilityContext.before.phase='finished';},
  e=>{e.eligibilityContext.observed.paused=true;},
 ]){const event=kill('ai-test',1180,7000);mutate(event);assert.equal(functions().outgoingCandidate(event,[]).eligible,false);}
});

test('analyzer binds the selected later event instead of the earlier excluded recovery kill',()=>{
 const observation=fixture();
 for(const sample of observation.samples){sample.wallMs+=8000;sample.frame+=960;sample.raceTime+=8;}
 for(const event of observation.events){if(Number.isFinite(event.frame))event.frame+=960;if(Number.isFinite(event.observedWallMs))event.observedWallMs+=8000;}
 Object.assign(observation.events[0],kill('ai-test',2140,9500,{deadline:6000}));
 observation.events.unshift(kill('ai-recovery',1360,3000,{playerWreck:'recovering',deadline:6000}),
  {type:'takedown',attackerId:'player',victimId:'ai-recovery',frame:1360});
 const api=functions(),ledger=[],selected=api.retainOutgoingCandidates(ledger,observation.events,observation.samples);
 assert.equal(selected.racerId,'ai-test');assert.equal(selected.frame,2140);
 const result=api.analyze(observation,selected);
 assert.equal(result.outcome,'PASS',JSON.stringify(result.issues));assert.equal(result.wreck.frame,2140);assert.equal(result.takedown.frame,2140);
});

test('first eligible candidate stays selected when its slowdown fails, even with a later kill',()=>{
 const observation=fixture(),first=kill('ai-test',1180,1500),later=kill('ai-later',2200,9000);
 Object.assign(observation.events[0],first);observation.events.push(later);
 for(const sample of observation.samples)sample.frame=1000+Math.round(sample.wallMs*.12);
 const api=functions(),ledger=[],selected=api.retainOutgoingCandidates(ledger,observation.events,observation.samples);
 assert.equal(selected.racerId,'ai-test');assert.equal(ledger.length,2);
 const result=api.analyze(observation,selected);
 assert.equal(result.outcome,'FAIL');assert(result.issues.some(issue=>issue.includes('bounded slow scheduling')));
 assert.equal(api.retainOutgoingCandidates(ledger,[later],[]),selected);
});

test('a broken pre-event camera baseline fails quality rather than excluding an eligible running kill',()=>{
 const observation=fixture();Object.assign(observation.events[0],kill('ai-test',1180,1500));
 for(const sample of observation.samples)if(sample.wallMs<1500)sample.camera=sample.wallMs%80?'cockpit':'chase';
 const api=functions(),selected=api.retainOutgoingCandidates([],observation.events,observation.samples);
 assert.equal(selected.eligible,true);const result=api.analyze(observation,selected);
 assert.equal(result.outcome,'FAIL');assert(result.issues.some(issue=>issue.includes('No stable immediately pre-event')));
});

test('a later kill cue cannot substitute for the selected eligible event',()=>{
 const observation=fixture();Object.assign(observation.events[0],kill('ai-test',1180,1500));
 observation.events.push(kill('ai-later',1190,1900));
 for(const sample of observation.samples){sample.cueKind=sample.wallMs>=1900&&sample.wallMs<3150?'takedown':null;sample.cueAge=(sample.wallMs-1900)/1250;}
 const result=analyze(observation);
 assert.equal(result.outcome,'FAIL');assert.equal(result.cue,undefined);
 assert(result.issues.some(issue=>issue.includes('visible TAKEDOWN cue')));
});

test('no selected candidate remains uncovered even if an ineligible kill has a matching cue',()=>{
 const result=analyze(fixture(),'hero',null);
 assert.equal(result.outcome,'FAIL');assert(result.issues.some(issue=>issue.includes('No eligible running outgoing candidate')));
});

test('the preserved native V17 recovery kill still fails the unchanged clock and camera quality gates',()=>{
 const receipt=JSON.parse(readFileSync(new URL('../assets/source/inkstorm/combat-round35/outgoing-selection-v18/before/output/playwright/round35-outgoing-takedown-v17/receipt.json',import.meta.url),'utf8'));
 const result=analyze(receipt.observation,'hero',{racerId:'ai-kodo',frame:1713});
 assert.equal(result.outcome,'FAIL');assert.deepEqual(Array.from(result.issues),receipt.analysis.issues);
 assert.equal(result.actualVictim.playerWreck,'recovering');assert.equal(result.wreck.cause,'heat-lance');
});
