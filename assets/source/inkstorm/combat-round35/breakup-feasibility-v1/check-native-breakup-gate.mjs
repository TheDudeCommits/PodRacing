import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('scripts/inkstorm-combat.mjs','utf8');
const functions = source.slice(source.indexOf('function measuredPace('), source.indexOf('async function runCase('));
const context = vm.createContext({});
vm.runInContext(`const nativeCadence=false; ${functions}; globalThis.runAnalysis=analyze;`,context);
const observed=JSON.parse(fs.readFileSync('output/playwright/round35-combat-v12/solo-chase-observations.json','utf8'));
const test={id:'solo-chase',camera:'chase',reducedMotion:false,pauseCancel:false};
const actual=context.runAnalysis(observed,test);
assert.equal(actual.outcome,'FAIL');
assert(actual.issues.some(issue=>issue.includes('Teemto engine breakup')));
// Synthetic diagnostics exercise only the gate; they are never written into
// native receipts or represented as observations of active geometry.
const synthetic=structuredClone(observed);
for(const sample of synthetic.samples){sample.activeAppearance='teemto';sample.breakupAvailable=true;sample.breakupActive=sample.wreck==='wrecked';}
const valid=context.runAnalysis(synthetic,test);assert.equal(valid.outcome,'PASS');
const middle=synthetic.samples.find(s=>s.matte&&s.frame>actual.wreck.frame&&s.cueAge>.1);
middle.breakupActive=false;
const fallback=context.runAnalysis(synthetic,test);assert.equal(fallback.outcome,'FAIL');
console.log(JSON.stringify({scope:'CPU gate check only. Actual V12 missing diagnostics correctly fails the new activation requirement; synthetic controls exercise acceptance/rejection without changing native evidence.',actualV12UnderNewGate:{outcome:actual.outcome,issues:actual.issues,breakup:actual.breakup},syntheticTrue:valid.outcome,syntheticOneInactive:fallback.outcome},null,2));
