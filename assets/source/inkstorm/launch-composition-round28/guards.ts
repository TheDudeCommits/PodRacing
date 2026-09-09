import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {CourseGulfField,sampleCourseGulfGrid,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {getInkstormVistaPlan} from '../../../../src/render/inkstorm/InkstormVista';
import {groundInkstormButtress} from '../../../../src/render/inkstorm/InkstormRockGrounding';
import {LAUNCH_RIDGES,LAUNCH_LANDSCAPE_BOUNDS,LAUNCH_INDUSTRIAL_BENCHES,launchRidgeSurface} from './LaunchBasinPlan';
import {launchRidgeSurface as beforeSurface} from './LaunchBasinPlan.round27';

const dir='assets/source/inkstorm/launch-composition-round28';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const load=(mode:string)=>{
 const receipt=JSON.parse(readFileSync(`${dir}/${mode}-field.json`,'utf8'));
 const grids=receipt.grids.map((g:CourseGulfGrid&{filename:string})=>{
  const b=readFileSync(`${dir}/${g.filename}`);
  return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
 }) as [CourseGulfGrid,CourseGulfGrid];
 return {receipt,field:new CourseGulfField(grids,receipt.launchProfile)};
};
const old=load('baseline'),next=load('candidate'),anchor=old.receipt.anchor;
const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const world=(f:number,r:number)=>({x:anchor.x+anchor.tangentX*f-anchor.rightX*r,z:anchor.z+anchor.tangentZ*f-anchor.rightZ*r});
const height=(f:number,r:number)=>{const p=world(f,r);return sampleTerrainHeight(p.x,p.z,next.field);};
const results:{name:string;pass:boolean;error?:string;data?:unknown}[]=[];
const check=(name:string,fn:()=>unknown)=>{
 try{const data=fn();results.push({name,pass:true,data});}
 catch(error){results.push({name,pass:false,error:String(error)});}
};

check('532296 historical lane/shoulder/CPU/MRT samples',()=>{
 const before:number[]=[],after:number[]=[];
 const probe=(x:number,z:number)=>{
  for(const [dx,dz] of [[0,0],[.85,0],[-.85,0],[0,.85],[0,-.85],[1.15,0],[-1.15,0],[0,1.15],[0,-1.15]]){
   before.push(sampleCourseGulfGrid(old.field.grids[0],x+dx!,z+dz!));
   after.push(sampleCourseGulfGrid(next.field.grids[0],x+dx!,z+dz!));
  }
 };
 for(let i=0;i<8192;i++){
  const p=course.samplePlanAtProgress((i+.371)/8192);
  for(const l of [-p.width-10,-p.width,-p.width*.5,0,p.width*.5,p.width,p.width+10])probe(p.x+p.rightX*l,p.z+p.rightZ*l);
 }
 for(const branch of course.branches)for(let i=1;i<branch.points.length;i++){
  const a=branch.points[i-1]!,b=branch.points[i]!,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  for(const t of [0,.123,.5,.877,1]){
   const width=a.width+(b.width-a.width)*t;
   for(const l of [-width-10,-width,0,width,width+10])probe(a.x+dx*t+dz/length*l,a.z+dz*t-dx/length*l);
  }
 }
 const beforeHash=sha(new Uint8Array(new Float64Array(before).buffer)),afterHash=sha(new Uint8Array(new Float64Array(after).buffer));
 assert.equal(after.length,532296);assert.equal(beforeHash,afterHash);assert.equal(afterHash,'8b719ceac7e26597a4c33989e6a1a036d2dcfb703812313436838b150d221b57');
 return {samples:after.length,beforeHash,afterHash};
});
check('central bowl, finish field, bounds and profile',()=>{
 const floor:number[]=[];
 for(let f=650;f<=1250;f+=7.3)for(let r=-100;r<=100;r+=8.9)floor.push(height(f,r));
 const floorHash=sha(new Uint8Array(new Float64Array(floor).buffer));
 assert.equal(floor.length,1909);assert.equal(floorHash,'f3f00afd1e3cb4d1c5d4726485edb16ee259b28555baee125d3c35820849c727');
 assert.equal(old.receipt.grids[1].sha256,next.receipt.grids[1].sha256);
 assert.deepEqual(old.receipt.launchProfile,next.receipt.launchProfile);
 const values=next.field.grids[0].values;let min=Infinity,max=-Infinity;
 for(const v of values){min=Math.min(min,v);max=Math.max(max,v);assert(v>=-170&&v<=250);}
 return {floorHash,finishHash:next.receipt.grids[1].sha256,min,max};
});
check('near-west, central opening and rear authoring exact',()=>{
 let samples=0;
 const same=(f:number,r:number)=>{assert.deepEqual(launchRidgeSurface(f,r),beforeSurface(f,r));samples++;};
 for(let f=-230;f<=630;f+=13.7)for(let r=-900;r<=50;r+=17.3)same(f,r);
 for(let f=300;f<=1500;f+=11.9)for(const r of [-100,0,100])same(f,r);
 for(let f=1148;f<=1740;f+=17.9)for(let r=-800;r<=720;r+=23.7)same(f,r);
 return {samples};
});
check('full founded bench footprints preserved',()=>{
 let samples=0,maxDelta=0;
 for(const b of LAUNCH_INDUSTRIAL_BENCHES){
  for(let row=-12;row<=12;row++)for(let col=-12;col<=12;col++){
   const f=b.forward+row/12*(b.halfForward+12),r=b.right+col/12*(b.halfRight+12),s=launchRidgeSurface(f,r);
   assert.equal(s.weight,1);assert(Math.abs(s.height-b.height)<1e-9);samples++;
  }
  for(let f=b.forward-b.halfForward;f<=b.forward+b.halfForward;f+=2.3)for(let r=b.right-b.halfRight;r<=b.right+b.halfRight;r+=2.3){
   const p=world(f,r),delta=sampleTerrainHeight(p.x,p.z,next.field)-sampleTerrainHeight(p.x,p.z,old.field);
   maxDelta=Math.max(maxDelta,Math.abs(delta));assert.equal(delta,0);samples++;
  }
 }
 return {samples,maxDelta};
});
check('existing connected spine and height separations',()=>{
 let min=Infinity,samples=0;
 for(const ridge of LAUNCH_RIDGES.slice(1))for(let index=1;index<ridge.stations.length;index++){
  const a=ridge.stations[index-1]!,b=ridge.stations[index]!;
  for(let i=0;i<=12;i++){
   const t=i/12,f=a.forward+(b.forward-a.forward)*t,r=a.right+(b.right-a.right)*t,h=height(f,r);
   assert(h>40,`${ridge.id} ${f},${r}: ${h}`);min=Math.min(min,h);samples++;
  }
 }
 for(const [f,r,min] of [[90,-300,150],[1190,-480,220],[1170,405,180]])assert(height(f!,r!)>min!);
 for(const f of [900,1000,1100,1200,1300]){
  assert(height(f,-480)-height(f,0)>200,`west spine at ${f}`);assert(height(f,420)-height(f,0)>180,`east spine at ${f}`);
 }
 return {samples,min};
});
check('three major saddles at all four 48m sampling phases',()=>{
 const phases=[];
 for(const phase of [0,12,24,36]){
  const values:number[]=[];
  for(let f=850+phase;f<=1510;f+=48)values.push(height(f,-480));
  let saddles=0;
  for(let i=1;i<values.length-1;i++){
   const value=values[i]!,left=Math.max(...values.slice(Math.max(0,i-2),i)),right=Math.max(...values.slice(i+1,i+3));
   if(value<values[i-1]!&&value<values[i+1]!&&Math.min(left,right)-value>25)saddles++;
  }
  assert(saddles>=3,`phase ${phase}: ${saddles}`);assert(Math.min(...values)>40);assert(Math.max(...values)>220);phases.push({phase,saddles,values});
 }
 assert(height(1138,-480)-height(1090,-480)>90);
 assert(height(1090,-350)-height(1138,-350)>60);
 return phases;
});
check('existing broken escarpment and unequal shelf probes',()=>{
 for(const f of [780,800,830,850])assert(height(f,-340)<0);
 for(const [f,r] of [[930,-560],[650,530],[730,565]])assert(height(f!,r!)<0);
 assert(height(850,-460)-height(800,-340)>170);assert(height(850,-340)-height(800,-340)>40);
 assert(height(650,385)-height(650,530)>90);
 assert(height(850,-420)>45&&height(850,-420)<75);assert(height(850,-460)>130);
 assert(height(500,430)>40&&height(500,430)<60);assert(height(850,-460)-height(850,-420)>65);
 return true;
});
check('unchanged five scan-depth forms stay accepted and bounded',()=>{
 const ground=(x:number,z:number)=>sampleTerrainHeight(x,z,next.field);
 const forms=getInkstormVistaPlan(course,ground).landforms.filter(p=>p.depthLayer);
 assert.equal(forms.length,5);
 const data=forms.map(f=>({id:f.id,scaleRatio:groundInkstormButtress(f,ground).scaleY/f.sx}));
 for(const d of data)assert(d.scaleRatio<=1.75,d.id);
 return data;
});
check('one millimetre source continuity and domain closure',()=>{
 const bounds=LAUNCH_LANDSCAPE_BOUNDS;
 const y=(f:number,r:number)=>{const p=launchRidgeSurface(f,r);return -170+(p.height+170)*p.weight;};
 let maxStep=0;
 for(let f=bounds.minForward;f<=bounds.maxForward;f+=9.73)for(let r=bounds.minRight;r<=bounds.maxRight;r+=9.37){
  const h=y(f,r);maxStep=Math.max(maxStep,Math.abs(y(f+.001,r)-h),Math.abs(y(f,r+.001)-h));
 }
 assert(maxStep<.02,`maximum ${maxStep}`);
 for(let i=0;i<=100;i++){
  const f=bounds.minForward+(bounds.maxForward-bounds.minForward)*i/100,r=bounds.minRight+(bounds.maxRight-bounds.minRight)*i/100;
  for(const [f0,r0] of [[f,bounds.minRight],[f,bounds.maxRight],[bounds.minForward,r],[bounds.maxForward,r]])assert.equal(launchRidgeSurface(f0!,r0!).weight,0);
 }
 return {maxStep};
});
const report={sourceSha256:next.receipt.sourceSha256,fieldSha256:next.receipt.grids[0].sha256,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results,
 limitation:'Focused CPU assertions reproduce the existing numeric protection thresholds. This is not a full test suite, GPU compilation/capture, visual review or performance evidence.'};
writeFileSync(`${dir}/guards.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
process.exitCode=report.failed?1:0;
