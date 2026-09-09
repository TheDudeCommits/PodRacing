import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Ray,Vector3,Triangle,Box3} from 'three';
import {readEXR,sha} from './encode-bake.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),input=JSON.parse(await readFile(path.join(here,'inputs/pit-complex.json'))),uv=JSON.parse(await readFile(path.join(here,'pit-complex.uv-corners.json')));
const exr=await readEXR(path.join(here,'pit-complex-direct-600w-128s.exr')),P=input.attributes.POSITION.values,N=input.attributes.NORMAL.values,I=input.indices;
const uvFaces=new Map(uv.triangles.map(t=>[t.sourceTriangleId,t]));
const triangles=Array.from({length:I.length/3},(_,i)=>{const ids=I.slice(i*3,i*3+3),points=ids.map(j=>new Vector3(...P.slice(j*3,j*3+3))),box=new Box3().setFromPoints(points);return{id:i,ids,points,box,center:box.getCenter(new Vector3())};});
function tree(ts){const box=new Box3();ts.forEach(t=>box.union(t.box));if(ts.length<=16)return{box,ts};const size=box.getSize(new Vector3()),axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');ts.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=ts.length>>1;return{box,left:tree(ts.slice(0,mid)),right:tree(ts.slice(mid))};}
const bvh=tree([...triangles]),tmp=new Vector3();
function nearest(ray,limit=Infinity,node=bvh){if(!ray.intersectsBox(node.box))return null;let best=null;
 if(node.ts){for(const t of node.ts){const hit=ray.intersectTriangle(...t.points,false,tmp);if(!hit)continue;const distance=ray.origin.distanceTo(hit);if(distance>1e-5&&distance<limit){limit=distance;best={t,distance,point:hit.clone()};}}return best;}
 const a=nearest(ray,limit,node.left);if(a)limit=a.distance;return nearest(ray,limit,node.right)??a;
}
function sample(hit){const bary=Triangle.getBarycoord(hit.point,...hit.t.points,new Vector3()),weights=[bary.x,bary.y,bary.z],corners=uvFaces.get(hit.t.id).corners;
 const coords=[0,0];hit.t.ids.forEach((id,i)=>{const p=corners.find(c=>c.sourceVertexId===id).uv;coords[0]+=p[0]*weights[i];coords[1]+=p[1]*weights[i];});
 const x=coords[0]*exr.width-.5,y=coords[1]*exr.height-.5,ix=Math.floor(x),iy=Math.floor(y),out=[0,0,0];
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const px=Math.max(0,Math.min(exr.width-1,ix+dx)),py=Math.max(0,Math.min(exr.height-1,iy+dy)),w=(dx?x-ix:1-x+ix)*(dy?y-iy:1-y+iy);for(let c=0;c<3;c++)out[c]+=exr.data[(py*exr.width+px)*4+c]*w;}
 return{uvBlender:coords,linearRGB:out};
}
const lamps=[[-50,9.437,-3],[-8,9.437,-3],[36,9.437,-6]],results=[];
for(let bay=0;bay<3;bay++)for(const dx of [-6,-3,0,3,6])for(const dz of [-6,-3,0,3,6]){
 const lamp=lamps[bay],floor=nearest(new Ray(new Vector3(lamp[0]+dx,1.01,lamp[2]+dz),new Vector3(0,-1,0)),1);
 if(!floor)continue;const p=floor.point.clone().add(new Vector3(0,.005,0));let visible=0,unoccludedRed=0,predictedRed=0,rays=0;
 // A 5×3 deterministic rectangle quadrature is separate from the Cycles bake.
 for(const source of lamps)for(let ix=0;ix<5;ix++)for(let iz=0;iz<3;iz++){
  const q=new Vector3(source[0]+((ix+.5)/5-.5)*2.1,source[1],source[2]+((iz+.5)/3-.5)*.68),d=q.clone().sub(p),distance=d.length(),cos=d.y/distance;
  if(cos<=0)continue;d.normalize();const blocked=nearest(new Ray(p,d),distance-.005),value=600/(Math.PI*Math.PI*distance*distance)*cos*cos/15;
  unoccludedRed+=value;rays++;if(!blocked){predictedRed+=value;visible++;}
 }
 const sampled=sample(floor);results.push({bay:bay+1,point:floor.point.toArray(),sourceTriangle:floor.t.id,areaRays:rays,visibleAreaRays:visible,unoccludedRed,predictedRed,...sampled,absoluteRedError:Math.abs(sampled.linearRGB[0]-predictedRed)});
}
const blocked=results.filter(r=>r.predictedRed<.005&&r.unoccludedRed>.15),lit=results.filter(r=>r.predictedRed>.35);
const sorted=values=>values.sort((a,b)=>a-b),litValues=sorted(lit.map(r=>r.linearRGB[0])),blockValues=sorted(blocked.map(r=>r.linearRGB[0]));
const checks=[{name:'Baked floor contains physically blocked dark receivers under equipment',pass:blocked.length>=3&&blocked.every(r=>r.linearRGB[0]<.07),samples:blocked.length,maxBakedRed:Math.max(...blockValues)},{name:'Clear task work planes receive a meaningful warm response',pass:lit.length>=3&&litValues[Math.floor(litValues.length/2)]>.35,samples:lit.length,medianBakedRed:litValues[Math.floor(litValues.length/2)]},{name:'Sampled source rays and baked response broadly agree',pass:results.filter(r=>r.absoluteRedError<.12).length/results.length>.8,within012:results.filter(r=>r.absoluteRedError<.12).length,total:results.length}];
const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',scope:'Exact frozen pit geometry CPU visibility quadrature versus actual128sample Cycles direct-white EXR at floor receivers. No game A/B or exhaustive transport proof.',sourceSha256:input.sourceSha256,uvSourceSha256:uv.sourceSha256,exrSha256:sha(exr.bytes),checks,results,limitations:['Finite5x3 area-light quadrature and sparsefloorgrid are not exhaustive visibility validation','Bilinear UV lookup may cross penumbra transitions; thresholds tolerate the measured ~7.2texels/m density','UV tiny-island and distant mip appearance still need actualgame views']};await writeFile(path.join(here,'pit-bake-occlusion.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks},null,2));
