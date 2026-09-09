/** Read-only CPU reconstruction of the production clipmap at saved cameras. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {TerrainSystem} from '../../../../src/render/terrain/TerrainSystem';
import {PerspectiveCamera,Ray,Vector3} from 'three';

const dir='assets/source/inkstorm/launch-escarpment-v27',mode=process.argv[2];
assert(['round26','candidate','candidate2'].includes(mode));
const frozen=JSON.parse(readFileSync(`${dir}/round26-field.json`,'utf8'));
const current=JSON.parse(readFileSync(`${dir}/${mode}-field.json`,'utf8'));
const grids=current.grids.map((g:CourseGulfGrid&{filename:string})=>{
 const bytes=readFileSync(`${dir}/${g.filename}`),values=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 return {...g,values};
}) as [CourseGulfGrid,CourseGulfGrid];
const field=new CourseGulfField(grids,current.launchProfile);
const terrain=new TerrainSystem({levels:6,baseCellSize:3,segmentsPerSide:64});terrain.setCourseGulfField(field);
const binSize=24,a=new Vector3(),b=new Vector3(),c=new Vector3(),hit=new Vector3();
const regions=[
 {id:'launch-west-front',camera:'05-launch',rect:[.195,.30,.405,.55]},
 {id:'launch-east-front',camera:'05-launch',rect:[.60,.26,.94,.56]},
 {id:'crest-west-front',camera:'launch-crest',rect:[.10,.32,.30,.55]},
 {id:'crest-east-front',camera:'launch-crest',rect:[.51,.34,.88,.57]},
 {id:'descent-west-front',camera:'launch-descent',rect:[.32,.10,.66,.42]},
];
const results=[];
for(const saved of frozen.cameras){
 const camera=new PerspectiveCamera(saved.fov,saved.aspect,saved.near,saved.far);
 camera.position.fromArray(saved.position);camera.quaternion.fromArray(saved.quaternion);camera.updateMatrixWorld(true);
 const bins=new Map<string,number[]>(),triangles:{mesh:number;offset:number}[]=[];
 const meshes=terrain.meshes.map(mesh=>{
  const g=mesh.geometry,source=g.getAttribute('position'),positions=new Float64Array(source.count*3);
  for(let i=0;i<source.count;i++){
   const x=source.getX(i)+camera.position.x,z=source.getZ(i)+camera.position.z;
   positions[i*3]=x;positions[i*3+1]=source.getY(i)+sampleTerrainHeight(x,z,field);positions[i*3+2]=z;
  }
  return {positions,index:g.index!,cellSize:g.userData.terrainRing.cellSize};
 });
 for(let mi=0;mi<meshes.length;mi++){
  const mesh=meshes[mi]!,positions=mesh.positions,index=mesh.index;
  for(let i=0;i<index.count;i+=3){
   const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
   const minX=Math.min(...ids.map(k=>positions[k*3]!)),maxX=Math.max(...ids.map(k=>positions[k*3]!));
   const minZ=Math.min(...ids.map(k=>positions[k*3+2]!)),maxZ=Math.max(...ids.map(k=>positions[k*3+2]!));
   const ti=triangles.length;triangles.push({mesh:mi,offset:i});
   for(let x=Math.floor(minX/binSize);x<=Math.floor(maxX/binSize);x++)
    for(let z=Math.floor(minZ/binSize);z<=Math.floor(maxZ/binSize);z++){
     const key=x+','+z,list=bins.get(key)??[];list.push(ti);bins.set(key,list);
    }
  }
 }
 const ray=new Ray(),seen=new Set<number>();
 const cast=(u:number,v:number)=>{
  ray.origin.copy(camera.position);ray.direction.set(u*2-1,1-v*2,.5).unproject(camera).sub(ray.origin).normalize();
  let bx=Math.floor(ray.origin.x/binSize),bz=Math.floor(ray.origin.z/binSize);
  const sx=ray.direction.x<0?-1:1,sz=ray.direction.z<0?-1:1;
  let tx=((bx+(sx>0?1:0))*binSize-ray.origin.x)/ray.direction.x;
  let tz=((bz+(sz>0?1:0))*binSize-ray.origin.z)/ray.direction.z;
  const dx=Math.abs(binSize/ray.direction.x),dz=Math.abs(binSize/ray.direction.z);
  let nearest=Infinity,result=null;seen.clear();
  for(let steps=0;steps<600;steps++){
   for(const ti of bins.get(bx+','+bz)??[]){
    if(seen.has(ti))continue;seen.add(ti);
    const t=triangles[ti]!,mesh=meshes[t.mesh]!,idx=mesh.index;
    a.fromArray(mesh.positions,idx.getX(t.offset)*3);b.fromArray(mesh.positions,idx.getX(t.offset+1)*3);c.fromArray(mesh.positions,idx.getX(t.offset+2)*3);
    if(ray.intersectTriangle(a,b,c,false,hit)){
     const distance=hit.distanceTo(ray.origin);
     if(distance<nearest){
      nearest=distance;
      const x=hit.x-frozen.anchor.x,z=hit.z-frozen.anchor.z;
      result={distance,world:hit.toArray(),forward:x*frozen.anchor.tangentX+z*frozen.anchor.tangentZ,
       right:-x*frozen.anchor.rightX-z*frozen.anchor.rightZ,
       height:hit.y,physicalHeight:sampleTerrainHeight(hit.x,hit.z,field),cellSize:mesh.cellSize,triangle:ti};
     }
    }
   }
   if(nearest<=Math.min(tx,tz)+1e-7)break;
   if(Math.min(tx,tz)>4500)break;
   if(tx<tz){bx+=sx;tx+=dx;}else{bz+=sz;tz+=dz;}
  }
  return result;
 };
 for(const region of regions.filter(r=>r.camera===saved.id)){
  const [x0,y0,x1,y1]=region.rect as [number,number,number,number],samples=[];
  for(let row=0;row<9;row++)for(let col=0;col<13;col++){
   const u=x0+(x1-x0)*(col+.5)/13,v=y0+(y1-y0)*(row+.5)/9;
   samples.push({u,v,hit:cast(u,v)});
  }
  results.push({...region,samples});
 }
 console.log(JSON.stringify({camera:saved.id,triangles:triangles.length,bins:bins.size,
  hits:results.filter(r=>r.camera===saved.id).map(r=>({id:r.id,count:r.samples.filter(s=>s.hit).length}))}));
}
terrain.dispose();
const report={mode,sourceSha256:current.sourceSha256,fieldSha256:current.grids[0].sha256,
 method:'Production TerrainSystem ring indices and cell-centers, vertex-displaced with the matching CPU physical field, at source-reconstructed frozen cameras. Exact ray/triangle first hit, accelerated by exact XZ bin traversal.',
 limitation:'Terrain-only first hits: scan, factory, HUD, vehicle and gantry occlusion are not included. CPU field matches the shader contract but this is not a GPU raster capture.',
 results};
writeFileSync(`${dir}/${mode}-roi.json`,JSON.stringify(report,null,2)+'\n');
