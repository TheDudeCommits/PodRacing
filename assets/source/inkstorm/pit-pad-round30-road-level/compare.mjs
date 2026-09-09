/** Receipt-only comparison; does not generate courses, terrain or GPU work. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const dir = 'assets/source/inkstorm/pit-pad-round30-road-level';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const old = read('assets/source/inkstorm/pit-pad-round29/district-extension/receipt.json').reports[0];
const v2 = read(`${dir}/rejected-independent-v2/receipt.json`).reports[0];
const currentReceipt = read(`${dir}/receipt.json`), v3 = currentReceipt.reports[0], constraints = read(`${dir}/constraints.json`);
const oldFrontage = read(`${dir}/old29-front-profiles.json`).rows;
const version = (report, pad, bays) => {
  const floor = pad.floorHeight ?? pad.anchorHeight + (pad.family === 'pit-complex' ? 2.45 : 1.5);
  const meshes = [pad.visualMesh, ...pad.meshPhaseChecks].filter(Boolean);
  return { floor, anchor: pad.anchorHeight, maximumCoreTargetDeficit: Math.max(0, pad.targetHeight - pad.minHeight),
    walkingFloorToLowestCoreGround: floor - pad.minHeight,
    contactFloorDifferences: bays.map(b => floor - b.contact.raw),
    largestAbsoluteBayContactDifference: Math.max(...bays.map(b => Math.abs(floor - b.contact.raw))),
    worstStraightBayEndpointGrade: Math.max(...bays.map(b => Math.abs(floor - b.contact.raw) / b.contact.out)),
    physicalCoreClear: pad.aboveSlabBottom === 0, minimumIndexedMeshClearance: -Math.max(...meshes.map(m => m.maxAboveSlabBottom)),
    maxFrontPhysicalSlope: pad.entryProfiles ? Math.max(...pad.entryProfiles.map(p => p.maxPhysicalSlope)) : Math.max(...oldFrontage.find(p => p.id === pad.id).profiles.map(p => p.maxSlope)),
    note: 'Endpoint grade compares identical native-ground contacts across versions; wall span is floor-to-ground potential exposure, not an actual rendered wall measurement.' };
};
const plots = v3.pads.map(pad => {
  const before = old.pads.find(p => p.id === pad.id), second = v2.pads.find(p => p.id === pad.id), bays = constraints.find(p => p.id === pad.id).bays;
  return { id: pad.id, old29: version(old,before,bays), v2: version(v2,second,bays), v3: version(v3,pad,bays),
    rigidDeltaFromOld29: pad.anchorHeight - before.anchorHeight, rigidDeltaFromV2: pad.anchorHeight - second.anchorHeight,
    sharedCourt: pad.sharedCourt ?? null };
});
const pair = plots.filter(p => ['inkstorm-pit-complex-216','inkstorm-pit-district-218'].includes(p.id));
assert.equal(pair[0].v3.floor,pair[1].v3.floor);
for(const seed of [42,1234]) {
  const earlier = read(`${dir}/rejected-independent-v2/receipt.json`).reports.find(r=>r.seed===seed), current = currentReceipt.reports.find(r=>r.seed===seed);
  assert.equal(earlier.grid.sha256,current.grid.sha256);
}
const result = { scope: 'Old29 versus independent V2 versus shared-court V3, same X/Z/yaw/scales and native-road contacts',
  pairFloor: pair[0].v3.floor, pairEndpointGradeBound: pair[0].sharedCourt.endpointGradeBound,
  pair: Object.fromEntries(['old29','v2','v3'].map(key=>[key,{floorDifference:pair[0][key].floor-pair[1][key].floor,
    worstStraightBayEndpointGrade:Math.max(...pair.map(p=>p[key].worstStraightBayEndpointGrade)),
    worstFloorToCoreGroundSpan:Math.max(...pair.map(p=>p[key].walkingFloorToLowestCoreGround))}])), plots };
writeFileSync(`${dir}/comparison.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pairFloor:result.pairFloor,pairGradeBound:result.pairEndpointGradeBound,pair:result.pair,plots:pair.map(p=>({id:p.id,old29:p.old29,v2:p.v2,v3:p.v3,deltaOld:p.rigidDeltaFromOld29,deltaV2:p.rigidDeltaFromV2}))},null,2));
