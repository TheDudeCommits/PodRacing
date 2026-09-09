import {readFileSync,writeFileSync} from 'node:fs';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';

const dir='assets/source/inkstorm/launch-escarpment-v27';
const frozen=JSON.parse(readFileSync(`${dir}/round26-field.json`,'utf8'));
const current=JSON.parse(readFileSync(`${dir}/candidate2-field.json`,'utf8'));
const roi=JSON.parse(readFileSync(`${dir}/candidate2-roi.json`,'utf8'));
const grids=current.grids.map((g:CourseGulfGrid&{filename:string})=>{
 const bytes=readFileSync(`${dir}/${g.filename}`);
 return {...g,values:new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength))};
}) as [CourseGulfGrid,CourseGulfGrid];
const field=new CourseGulfField(grids,current.launchProfile);
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(lo:number,hi:number,v:number)=>{const t=clamp((v-lo)/(hi-lo));return t*t*(3-2*t);};
type V=[number,number,number];
const norm=(v:V):V=>{const l=Math.hypot(...v);return v.map(x=>x/l) as V;};
const dot=(a:V,b:V)=>a.reduce((s,v,i)=>s+v*b[i]!,0);
const angle=(a:V,b:V)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))))*180/Math.PI;
const sun=norm([-.42,.76,-.5]);
const stat=(a:number[])=>{a.sort((x,y)=>x-y);return {min:a[0],median:a[Math.floor(a.length*.5)],p90:a[Math.floor(a.length*.9)],max:a.at(-1),mean:a.reduce((s,v)=>s+v,0)/a.length};};
const results=[];
for(const region of roi.results){
 const camera=frozen.cameras.find((c:any)=>c.id===region.camera).position as V;
 const samples=[];
 for(const sample of region.samples){
  if(!sample.hit)continue;
  const [x,y,z]=sample.hit.world as V;
  const e=9.5+(48-9.5)*smooth(360,1840,Math.hypot(x-camera[0],camera[1],z-camera[2]));
  const offset=field.sampleOffset(x,z),base=sampleTerrainHeight(x,z),h=base+offset;
  const bx=sampleTerrainHeight(x+e,z),bz=sampleTerrainHeight(x,z+e);
  const ox=field.sampleOffset(x+e,z),oz=field.sampleOffset(x,z+e);
  const old=norm([h-bx-ox,e,h-bz-oz]);
  const truthE=.85;
  const truth=norm([sampleTerrainHeight(x-truthE,z,field)-sampleTerrainHeight(x+truthE,z,field),2*truthE,sampleTerrainHeight(x,z-truthE,field)-sampleTerrainHeight(x,z+truthE,field)]);
  const proposals=[6,9.5,12,18].map(local=>{
   const dx=(field.sampleOffset(x+local,z)-offset)/local,dz=(field.sampleOffset(x,z+local)-offset)/local;
   const n=norm([(base-bx)/e-dx,1,(base-bz)/e-dz]);
   return {local,normal:n,changeDeg:angle(old,n),errorDeg:angle(truth,n),sunChange:dot(n,sun)-dot(old,sun)};
  });
  samples.push({world:[x,y,z],epsilon:e,offset,old,truth,oldErrorDeg:angle(old,truth),proposals});
 }
 const cliffs=samples.filter(s=>s.truth[1]<.65&&Math.abs(s.offset)>8);
 results.push({id:region.id,camera:region.camera,count:samples.length,cliffCount:cliffs.length,epsilon:stat(samples.map(s=>s.epsilon)),cliffOldErrorDeg:stat(cliffs.map(s=>s.oldErrorDeg)),proposals:[6,9.5,12,18].map(local=>({local,changeDeg:stat(cliffs.map(s=>s.proposals.find(p=>p.local===local)!.changeDeg)),errorDeg:stat(cliffs.map(s=>s.proposals.find(p=>p.local===local)!.errorDeg)),absSunChange:stat(cliffs.map(s=>Math.abs(s.proposals.find(p=>p.local===local)!.sunChange)))})),samples});
}
const report={sourceSha256:current.sourceSha256,fieldSha256:current.grids[0].sha256,method:'CPU lighting-normal comparison at saved terrain-only first-hit points. The source view-distance epsilon uses the undisplaced vertex Y=0, reproduced here. Reference normal is a .85 m central difference of the same physical field. These are analytic samples at ray hits, not interpolated GPU vertex normals or visual acceptance.',results};
writeFileSync('assets/source/inkstorm/terrain-cliff-normals-round27/diagnosis.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:results.map(({samples,...summary})=>summary)},null,2));
