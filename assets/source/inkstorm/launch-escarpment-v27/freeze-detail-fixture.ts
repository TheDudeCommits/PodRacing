import {readFileSync,writeFileSync} from 'node:fs';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {TerrainSystem} from '../../../../src/render/terrain/TerrainSystem';
const dir='assets/source/inkstorm/launch-escarpment-v27';
const descriptor=JSON.parse(readFileSync(`${dir}/round26-field.json`,'utf8'));
const grids=descriptor.grids.map((g:CourseGulfGrid&{filename:string})=>{
 const b=readFileSync(`${dir}/${g.filename}`);return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
}) as [CourseGulfGrid,CourseGulfGrid];
const field=new CourseGulfField(grids,descriptor.launchProfile),terrain=new TerrainSystem();
const cameraX=18805.3636927033,cameraZ=1303.0263772671685,x=19642.928946859978,z=1850.359962302568;
const points=new Map<string,{x:number;z:number;height:number}>();
const h=(x:number,z:number)=>{
 const height=sampleTerrainHeight(x,z,field);points.set(`${x.toFixed(6)},${z.toFixed(6)}`,{x,z,height});return height;
};
const expected=h(x,z),modes=[];
for(const mode of ['coarse','detailed']){
 if(mode==='detailed')terrain.setCourseGulfField(field);
 const g=terrain.meshes[4]!.geometry,p=g.getAttribute('position'),idx=g.index!;
 for(let i=0;i<idx.count;i+=3){
  const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],v=ids.map(k=>[p.getX(k)+cameraX,p.getZ(k)+cameraZ]);
  const [a,b,c]=v;
  if(x<Math.min(a![0]!,b![0]!,c![0]!)||x>Math.max(a![0]!,b![0]!,c![0]!)||z<Math.min(a![1]!,b![1]!,c![1]!)||z>Math.max(a![1]!,b![1]!,c![1]!))continue;
  const d=(b![1]!-c![1]!)*(a![0]!-c![0]!)+(c![0]!-b![0]!)*(a![1]!-c![1]!);if(Math.abs(d)<1e-10)continue;
  const wa=((b![1]!-c![1]!)*(x-c![0]!)+(c![0]!-b![0]!)*(z-c![1]!))/d;
  const wb=((c![1]!-a![1]!)*(x-c![0]!)+(a![0]!-c![0]!)*(z-c![1]!))/d,wc=1-wa-wb;
  if(Math.min(wa,wb,wc)<-1e-8)continue;
  const interpolated=v.reduce((sum,q,k)=>sum+[wa,wb,wc][k]!*(h(q[0]!,q[1]!)+p.getY(ids[k]!)),0);
  modes.push({mode,interpolated,error:Math.abs(interpolated-expected)});break;
 }
}
terrain.dispose();
const fixture={description:'Frozen round26 physical heights at the recorded round24 missing-face site and the exact coarse/detail triangle vertices. Retains the original >130m interpolation regression independently of later intentional terrain sculpting.',
 sourceSha256:descriptor.sourceSha256,launchGridSha256:descriptor.grids[0].sha256,cameraX,cameraZ,x,z,expected,modes,points:[...points.values()]};
writeFileSync('tests/terrain/authoredTerrainRound26.ts','export const authoredTerrainRound26 = '+JSON.stringify(fixture,null,2)+' as const;\n');
console.log(JSON.stringify(fixture,null,2));
