import { readFileSync, writeFileSync } from 'node:fs';
import { createProceduralPodraceCourse } from '../../../../src/game/race/course';
import { CourseGulfField } from '../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';
import { PitPadField, padLocalToWorld, type PitPad } from './PitPadField';
const dir = 'assets/source/inkstorm/pit-pad-round30-road-level';
const report = JSON.parse(readFileSync(`${dir}/receipt.json`, 'utf8')).reports[0];
const data = readFileSync(`${dir}/seed-1229867859.f32`);
const field = new PitPadField(report.pads, { ...report.grid, values: new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) });
const saved = JSON.parse(readFileSync('assets/source/inkstorm/launch-composition-round28/candidate-field.json', 'utf8'));
const gulf = new CourseGulfField(saved.grids.map((g: any) => {
  const bytes = readFileSync('assets/source/inkstorm/launch-composition-round28/' + g.filename);
  return { ...g, values: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) };
}), saved.launchProfile);
const base = (x: number, z: number) => sampleTerrainHeight(x, z) + gulf.sampleOffset(x, z);
const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const roadClearance = (x: number, z: number) => { const p = course.projectPoint(x, z); return p.distanceToCenter - p.width; };
const pads: PitPad[] = report.pads;
const results = pads.map(pad => {
  const worst: any[] = [];
  for (let ix = 0; ix <= 150; ix++) for (let iz = 0; iz <= 61; iz++) {
    const localX = -pad.halfX + ix / 150 * pad.halfX * 2, localZ = -pad.halfZ + iz / 61 * pad.halfZ * 2;
    const [x, z] = padLocalToWorld(pad, localX, localZ), raw = base(x, z), h = raw + field.sampleOffset(x, z);
    const above = h - pad.anchorHeight - pad.slabBottomOffset;
    if (above > -.1) worst.push({ localX, localZ, x, z, raw, height: h, above, roadClearance: roadClearance(x, z) });
  }
  worst.sort((a,b)=>b.above-a.above);
  const bays = (pad.family === 'pit-complex' ? [-51, -9, 35] : [-39, -2, 38].map(x => x * pad.halfX / 60)).map(localX => {
    const profile = [];
    for (let out = 0; out <= 32; out += .5) {
      const [x, z] = padLocalToWorld(pad, localX, pad.halfZ + out), raw = base(x, z), clearance = roadClearance(x, z);
      profile.push({ out, raw, after: raw + field.sampleOffset(x, z), roadClearance: clearance });
      if (clearance < 13.5) break;
    }
    const contact = profile.at(-1)!;
    return { localX, contact, currentFloorGap: pad.floorHeight - contact.raw, profile };
  });
  const neighbors = pads.filter(p => p.id !== pad.id).map(other => {
    const c = Math.cos(pad.yaw), s = Math.sin(pad.yaw);
    let polygon = [[-other.halfX,-other.halfZ],[other.halfX,-other.halfZ],[other.halfX,other.halfZ],[-other.halfX,other.halfZ]].map(([x,z]) => {
      const [wx,wz] = padLocalToWorld(other,x!,z!), dx = wx-pad.centerX, dz=wz-pad.centerZ;
      return [dx*c-dz*s,dx*s+dz*c];
    });
    for (const [axis,side,bound] of [[0,-1,pad.halfX],[0,1,pad.halfX],[1,-1,pad.halfZ],[1,1,pad.halfZ]]) {
      const next: number[][] = [];
      for (let i=0;i<polygon.length;i++) {
        const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!, da=a[axis!]!*side!-bound!, db=b[axis!]!*side!-bound!;
        if (da<=0) next.push(a);
        if ((da<0&&db>0)||(da>0&&db<0)) {const t=da/(da-db);next.push([a[0]!+(b[0]!-a[0]!)*t,a[1]!+(b[1]!-a[1]!)*t]);}
      }
      polygon=next;
    }
    let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!;area+=a[0]!*b[1]!-b[0]!*a[1]!;}
    return { id:other.id,intersectionArea:Math.abs(area)*.5,intersectionInPadFrame:polygon,floorDifference: pad.floorHeight-other.floorHeight };
  }).filter(p=>p.intersectionArea>1e-6);
  let low=0,high=4;
  for(let i=0;i<40;i++){
    const grade=(low+high)*.5, lo=Math.max(...bays.map(b=>b.contact.raw-grade*b.contact.out)), hi=Math.min(...bays.map(b=>b.contact.raw+grade*b.contact.out));
    if(lo<=hi)high=grade;else low=grade;
  }
  const feasibleLo=Math.max(...bays.map(b=>b.contact.raw-high*b.contact.out)), feasibleHi=Math.min(...bays.map(b=>b.contact.raw+high*b.contact.out));
  return { id:pad.id, floor:pad.floorHeight, worst:worst.slice(0,10), bays, neighbors,
    allBayStraightEntryLowerBound:{grade:high,optimalFloor:(feasibleLo+feasibleHi)*.5,scope:'necessary endpoint bound, ignoring terrain humps, source slab and protected-corner constraints'} };
});
writeFileSync(`${dir}/constraints.json`, JSON.stringify(results, null, 2)+'\n');
console.log(JSON.stringify(results.map(r=>({id:r.id,floor:r.floor,worst:r.worst.slice(0,2),bays:r.bays.map(b=>({x:b.localX,ground:b.contact.raw,out:b.contact.out,gap:b.currentFloorGap})),neighbors:r.neighbors,entryBound:r.allBayStraightEntryLowerBound}))));
