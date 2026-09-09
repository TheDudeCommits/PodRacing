import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {createCourseGulfField as createControl} from './control/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {LAUNCH_INDUSTRIAL_BENCHES} from '../../../../src/game/race/LaunchBasinPlan';
const dir='assets/source/inkstorm/launch-reveal-round31';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const load=(mode:string)=>{const j=JSON.parse(readFileSync(`${dir}/${mode}-trace.json`,'utf8'));return {j,field:new CourseGulfField(j.grids.map((g:CourseGulfGrid&{file:string})=>{const b=readFileSync(`${dir}/${g.file}`);return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}) as [CourseGulfGrid,CourseGulfGrid],j.profile)};};
const a=load('baseline'),b=load('candidate'),course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53),control=createControl(course)!;
const ga=(x:number,z:number)=>sampleTerrainHeight(x,z,a.field),gb=(x:number,z:number)=>sampleTerrainHeight(x,z,b.field);
const traces=a.j.views.map((v:any)=>({id:v.id,error:v.cameraPositionError}));
assert(traces.every((v:any)=>v.error<1e-10));
const gridDiff=a.field.grids.map((old,i)=>{const g=b.field.grids[i]!;assert.deepEqual([old.minX,old.minZ,old.cellSize,old.size],[g.minX,g.minZ,g.cellSize,g.size]);let changed=0,min=Infinity,max=-Infinity,maxDelta=0;const bounds=[Infinity,Infinity,-Infinity,-Infinity];for(let k=0;k<g.values.length;k++){const d=g.values[k]!-old.values[k]!;min=Math.min(min,g.values[k]!);max=Math.max(max,g.values[k]!);if(d!==0){changed++;maxDelta=Math.max(maxDelta,Math.abs(d));const x=g.minX+k%g.size*g.cellSize,z=g.minZ+Math.floor(k/g.size)*g.cellSize;bounds[0]=Math.min(bounds[0]!,x);bounds[1]=Math.min(bounds[1]!,z);bounds[2]=Math.max(bounds[2]!,x);bounds[3]=Math.max(bounds[3]!,z);}}return {name:g.name,changed,min,max,maxDelta,bounds:changed?bounds:null,baselineSha256:sha(new Uint8Array(old.values.buffer)),candidateSha256:sha(new Uint8Array(g.values.buffer)),bytes:g.values.byteLength};});
assert.equal(gridDiff[1]!.changed,0);
let outsideMax=0,branchMax=0,throatProtectedMax=0,intendedMax=0,changedMin=Infinity,changedMax=-Infinity,samples=0;
let maxGrade=0,maxCurvature=0,gradeAt=0,curvatureAt=0;const longitudinal=[];
const probe=(x:number,z:number,kind:'intended'|'outside'|'branch',d:number)=>{
 for(const [dx,dz] of [[0,0],[.85,0],[-.85,0],[0,.85],[0,-.85],[1.15,0],[-1.15,0],[0,1.15],[0,-1.15]]){
  const x1=x+dx!,z1=z+dz!,delta=Math.abs(b.field.sampleOffset(x1,z1)-a.field.sampleOffset(x1,z1));samples++;
  if(kind==='outside')outsideMax=Math.max(outsideMax,delta);if(kind==='branch')branchMax=Math.max(branchMax,delta);
  if(kind==='intended')intendedMax=Math.max(intendedMax,delta);
  if(delta>1e-8){changedMin=Math.min(changedMin,d);changedMax=Math.max(changedMax,d);}
  throatProtectedMax=Math.max(throatProtectedMax,Math.abs(b.field.sampleOffset(x1,z1)-control.sampleOffset(x1,z1)));
 }
};
for(let i=0;i<4096;i++){const p=course.samplePlanAtProgress(i/4096),d=p.distance,kind=d>=a.j.profile.startDistance-18&&d<=a.j.profile.endDistance+18?'intended':'outside';for(const side of [-1,-.5,0,.5,1])probe(p.x+p.rightX*p.width*side,p.z+p.rightZ*p.width*side,kind,d);}
let branchPoints=0;for(const branch of course.branches)for(let i=1;i<branch.points.length;i++){const p=branch.points[i-1]!,q=branch.points[i]!,len=Math.hypot(q.x-p.x,q.z-p.z),steps=Math.ceil(len/4);for(let k=0;k<=steps;k++){const t=k/steps,x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t,rx=(q.z-p.z)/len,rz=-(q.x-p.x)/len;for(const side of [-1,-.5,0,.5,1])probe(x+rx*Math.max(p.width,q.width)*side,z+rz*Math.max(p.width,q.width)*side,'branch',branch.entryProgress*course.totalLength);branchPoints++;}}
assert(outsideMax<1e-8,`unintended route change ${outsideMax}`);assert(branchMax<1e-8,`branch change ${branchMax}`);assert(throatProtectedMax<1e-8,`throat invaded normal guard ${throatProtectedMax}`);
for(let d=a.j.profile.startDistance-20;d<=a.j.profile.endDistance+20;d+=2){const p=course.samplePlanAtProgress(d/course.totalLength),p0=course.samplePlanAtProgress((d-4)/course.totalLength),p1=course.samplePlanAtProgress((d+4)/course.totalLength),y=gb(p.x,p.z),before=gb(p0.x,p0.z),after=gb(p1.x,p1.z),grade=(after-before)/8,curvature=(after-2*y+before)/16/(1+grade*grade)**1.5;if(Math.abs(grade)>maxGrade){maxGrade=Math.abs(grade);gradeAt=d;}if(Math.abs(curvature)>maxCurvature){maxCurvature=Math.abs(curvature);curvatureAt=d;}longitudinal.push({distance:d,baseline:ga(p.x,p.z),candidate:y,grade,curvature});}
const anchor=a.j.anchor;let benchDelta=0;for(const bench of LAUNCH_INDUSTRIAL_BENCHES)for(const df of [-bench.halfForward,0,bench.halfForward])for(const dr of [-bench.halfRight,0,bench.halfRight]){const f=bench.forward+df,r=bench.right+dr,x=anchor.x+anchor.tangentX*f-anchor.rightX*r,z=anchor.z+anchor.tangentZ*f-anchor.rightZ*r;benchDelta=Math.max(benchDelta,Math.abs(gb(x,z)-ga(x,z)));}
const targets=b.j.views.map((v:any)=>{const old=a.j.views.find((o:any)=>o.id===v.id);return {id:v.id,roadTargets:{count:v.road.length,baselineVisible:old.road.filter((p:any)=>p.margin>0&&p.withinFrame).length,candidateVisible:v.road.filter((p:any)=>p.margin>0&&p.withinFrame).length},centralBasin:v.bowl.filter((p:any)=>p.r===0).map((p:any)=>({forward:p.f,baselineMargin:old.bowl.find((q:any)=>q.f===p.f&&q.r===0).margin,candidateMargin:p.margin,screen:p.screen}))};});
for(const id of ['05-launch','launch-crest'])for(const f of [450,600,800])assert(targets.find((v:any)=>v.id===id)!.centralBasin.find((p:any)=>p.forward===f).candidateMargin>1);
const receipt={status:'CPU physical sightline candidate only; actual image and driving acceptance pending',signatureUnchanged:course.signature===a.j.signature,gridDiff,traces,corridor:{mainStations:4096,branchStations:branchPoints,heightNormalProbes:samples,permittedMainDistanceRange:[a.j.profile.startDistance-18,a.j.profile.endDistance+18],observedChangedDistanceRange:[changedMin,changedMax],maxIntendedHeightDelta:intendedMax,maxOtherMainHeightNormalDelta:outsideMax,maxBranchHeightNormalDelta:branchMax,maxThroatOnlyProtectedHeightNormalDelta:throatProtectedMax},profile:{baseline:a.j.profile,candidate:b.j.profile,maxGrade,gradeAt,maxCurvature,curvatureAt,derivativeWindowMetres:8},industrialBenchMaxSampledHeightDelta:benchDelta,targets,limits:['Terrain-only ray tests use 3m steps and targets 2m/3m above road/floor; excludes meshes, vehicle, HUD and clipmap tessellation.','Corridor proof samples 4096 main stations plus branch intervals <=4m at five lane offsets and nine CPU/MRT normal taps; not a continuous swept-volume proof.','New48.9% descent grade and landing dynamics are not driving acceptance.','No performance claim; zero new render families or textures.']};
writeFileSync(`${dir}/longitudinal.json`,JSON.stringify(longitudinal,null,2)+'\n');writeFileSync(`${dir}/cpu-receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
