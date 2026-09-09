import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {LAUNCH_INDUSTRIAL_BENCHES} from '../../../../src/game/race/LaunchBasinPlan';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
const dir='assets/source/inkstorm/launch-escarpment-v27';
const load=(mode:string)=>{
 const receipt=JSON.parse(readFileSync(`${dir}/${mode}-field.json`,'utf8'));
 const grids=receipt.grids.map((g:CourseGulfGrid&{filename:string})=>{
  const b=readFileSync(`${dir}/${g.filename}`);
  return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
 }) as [CourseGulfGrid,CourseGulfGrid];
 return {receipt,field:new CourseGulfField(grids,receipt.launchProfile)};
};
const mode=process.argv[2]??'candidate';
const old=load('round26'),next=load(mode),anchor=old.receipt.anchor;
const sha=(a:unknown)=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
assert.equal(sha(old.receipt.cameras),sha(next.receipt.cameras));
assert.equal(sha(old.receipt.launchProfile),sha(next.receipt.launchProfile));
assert.equal(old.receipt.grids[1].sha256,next.receipt.grids[1].sha256);
let changed=0,outsideWindow=0,nearGridChanges=0,benchGridChanges=0,maxRaise=0,maxCut=0;
const g=old.field.grids[0];
for(let row=0;row<g.size;row++)for(let col=0;col<g.size;col++){
 const i=row*g.size+col,delta=next.field.grids[0].values[i]!-g.values[i]!;
 if(delta===0)continue;changed++;maxRaise=Math.max(maxRaise,delta);maxCut=Math.min(maxCut,delta);
 const x=g.minX+col*g.cellSize-anchor.x,z=g.minZ+row*g.cellSize-anchor.z;
 const f=x*anchor.tangentX+z*anchor.tangentZ,r=-x*anchor.rightX-z*anchor.rightZ;
 if(!((f>640&&f<1140&&r>-710&&r< -180)||(f>300&&f<1120&&r>180&&r<700)))outsideWindow++;
 if(f<=631&&r<=50)nearGridChanges++;
 if(LAUNCH_INDUSTRIAL_BENCHES.some(b=>Math.abs(f-b.forward)<=b.halfForward+12&&Math.abs(r-b.right)<=b.halfRight+12))benchGridChanges++;
}
assert.equal(outsideWindow,0);assert.equal(nearGridChanges,0);assert.equal(benchGridChanges,0);
const heights=(f:number,r:number)=>{
 const x=anchor.x+anchor.tangentX*f-anchor.rightX*r,z=anchor.z+anchor.tangentZ*f-anchor.rightZ*r;
 return [sampleTerrainHeight(x,z,old.field),sampleTerrainHeight(x,z,next.field)];
};
const protectedRegions=[];
for(const region of [{id:'near-west',minF:-250,maxF:630,minR:-900,maxR:50},
 ...LAUNCH_INDUSTRIAL_BENCHES.map(b=>({id:b.id,minF:b.forward-b.halfForward,maxF:b.forward+b.halfForward,
  minR:b.right-b.halfRight,maxR:b.right+b.halfRight}))]){
 let samples=0,maxDelta=0;const before:number[]=[],after:number[]=[];
 const step=region.id==='near-west'?7.3:2.3;
 for(let f=region.minF;f<=region.maxF;f+=step)for(let r=region.minR;r<=region.maxR;r+=step){
  const [a,b]=heights(f,r);samples++;maxDelta=Math.max(maxDelta,Math.abs(a!-b!));before.push(a!);after.push(b!);
 }
 assert.equal(maxDelta,0,region.id);
 protectedRegions.push({id:region.id,samples,maxDelta,beforeHash:sha(before),afterHash:sha(after)});
}
const probes=[[780,-310],[800,-340],[830,-340],[850,-340],[850,-420],[820,-540],
 [780,-550],[930,-560],[1040,-545],[470,275],[520,280],[650,530],[730,565],[550,545],
 [780,-410],[800,-440],[850,-460],[500,430],[620,385]].map(([f,r])=>({f,r,heights:heights(f!,r!)}));
const report={changedGridNodes:changed,outsideWindow,nearGridChanges,benchGridChanges,maxRaise,maxCut,
 cameraAndLaunchProfileUnchanged:true,finishGridUnchanged:true,protectedRegions,probes};
writeFileSync(`${dir}/${mode}-preservation.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
