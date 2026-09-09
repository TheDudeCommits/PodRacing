import { Raycaster,Vector3,FrontSide } from 'three';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RaceSimulation } from '../../../../../src/game/race/RaceSimulation.ts';
import { sampleTerrainHeight } from '../../../../../src/render/terrain/terrainMath.ts';
import { createInkstormFoundry,getInkstormFoundryPlan } from './InkstormFoundry.ts';
import { createInkstormFoundry as createV2, getInkstormFoundryPlan as planV2 } from '../v2/InkstormFoundry.ts';
import { getInkstormLayout } from '../../../../../src/game/race/inkstormLayout.ts';
const dir='assets/source/inkstorm/round30-next-steps/v3';
const simulation=new RaceSimulation({seed:0x494e4b53,terrain:{heightAt:sampleTerrainHeight}});
const course=simulation.course;
const height=(x:number,z:number)=>sampleTerrainHeight(x,z)+(simulation.courseGulfField?.sampleOffset(x,z)??0)+(simulation.pitPadField?.sampleOffset(x,z)??0);
const plan=getInkstormFoundryPlan(course,height),mesh=createInkstormFoundry(course,height)!;
const pos=mesh.geometry.getAttribute('position');
let minLowClearance=Infinity,minOverheadHeight=Infinity,nonfinite=0;
const failures=[];
const probe=(x:number,y:number,z:number,index:string)=>{
 const projection=course.projectPoint(x,z);
 const edge=projection.distanceToCenter-projection.width;
 const above=y-height(x,z);
 if(!Number.isFinite(x+y+z))nonfinite++;
 if(edge<7)minOverheadHeight=Math.min(minOverheadHeight,above);
 if(above<30)minLowClearance=Math.min(minLowClearance,edge);
 if(edge<2&&above<30&&failures.length<20)failures.push({index,x,y,z,edge,above});
};
for(let i=0;i<pos.count;i++)probe(pos.getX(i),pos.getY(i),pos.getZ(i),`v${i}`);
for(let i=0;i<pos.count;i+=3)probe((pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3,(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3,`t${i/3}`);
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const receipt={scope:'CPU source candidate only: no browser, GPU, Blender, render, timing or art acceptance',clearanceRule:'Vertices and triangle centroids must stay 2m outside the road edge or at least 30m above installed terrain' ,seed:course.seed,bankIds:plan.bankIds,sockets:plan.sockets.length,pipeRuns:plan.pipes.length,boxes:plan.boxes.length,triangles:pos.count/3,vertices:pos.count,materials:1,additionalMeshes:1,additionalTextures:0,additionalLights:0,perFrameUpdates:0,geometryBytes:Object.values(mesh.geometry.attributes).reduce((sum:any,a:any)=>sum+a.array.byteLength,0),bounds:mesh.geometry.boundingBox,minimumLowVertexOrCentroidClearance:minLowClearance,minimumOverheadVertexOrCentroidHeight:minOverheadHeight,nonfinite,failures,removedArtInstances:[],geometryBudget:50000,budgetPassed:pos.count/3<=50000,clearancePassed:failures.length===0,limitations:['Per-vertex and triangle-centroid checks are not swept-pod or triangle-volume collision proof.','Root must validate actual camera composition, graphics lifecycle and full-race cadence.','Existing collision placement list, gulf arrays, terrain and physics were not edited.','The distant launch basin has not been recomposed by this near-foundry candidate.'],hashes:{candidate:sha(`${dir}/InkstormFoundry.ts`),pipeBankGlb:sha('public/assets/inkstorm/pipe-bank.glb')}};
mesh.updateMatrixWorld(true); (mesh.material as any).side=FrontSide;
const attachmentRays:any[]=[];
for(const socket of plan.sockets){
 const normal=new Vector3(...socket.outward), center=new Vector3(...socket.position), horizontal=new Vector3(0,1,0).cross(normal).normalize();
 for(let sample=0;sample<9;sample++){
  const angle=(sample-1)/8*Math.PI*2,r=sample?socket.radius*.8:0;
  const face=center.clone().addScaledVector(horizontal,Math.cos(angle)*r*socket.scale[0]).add(new Vector3(0,Math.sin(angle)*r*socket.scale[1],0));
  const ray=new Raycaster(face.clone().addScaledVector(normal,20),normal.clone().negate(),0,20.05),hit=ray.intersectObject(mesh,false)[0];
  attachmentRays.push({id:socket.id,sample,hit:!!hit,distance:hit?.distance??null});
 }
}
(receipt as any).attachmentRayProbe={scope:'9 rays per actual scaled aperture; hit before original cap along its measured outward normal',total:attachmentRays.length,hits:attachmentRays.filter(r=>r.hit).length,misses:attachmentRays.filter(r=>!r.hit)};
writeFileSync(`${dir}/attachment-rays.json`,JSON.stringify(attachmentRays,null,2)+'\n');
const previousPlan=planV2(course,height),previousMesh=createV2(course,height)!;
const oldParts=[...previousPlan.pipes,...previousPlan.boxes],newParts=[...plan.pipes,...plan.boxes];
const changedParts=oldParts.filter(part=>JSON.stringify(part)!==JSON.stringify(newParts.find(p=>p.id===part.id))).map(p=>p.id);
const triangleCounts=(m:any)=>{
 const attrs=['position','normal','color'].map(name=>m.geometry.getAttribute(name));const result=new Map<string,number>();
 for(let i=0;i<attrs[0].count;i+=3){
  const floats=[];for(const attr of attrs)for(let v=i;v<i+3;v++)floats.push(attr.getX(v),attr.getY(v),attr.getZ(v));
  const key=Buffer.from(new Float32Array(floats).buffer).toString('base64');result.set(key,(result.get(key)??0)+1);
 }return result;
};
const oldTriangles=triangleCounts(previousMesh),newTriangles=triangleCounts(mesh);let missingTriangles=0;
for(const [key,count]of oldTriangles)missingTriangles+=Math.max(0,count-(newTriangles.get(key)??0));
(receipt as any).v2Preservation={parts:oldParts.length,changedParts,originalTriangles:previousMesh.geometry.getAttribute('position').count/3,missingTriangles,positionsNormalsColorsByteExact:missingTriangles===0};
(receipt as any).bankCoverage={actualBanks:getInkstormLayout(course).filter(p=>p.family==='pipe-bank').length,connectedBanks:plan.bankIds.length,unconnectedIds:getInkstormLayout(course).filter(p=>p.family==='pipe-bank'&&!plan.bankIds.includes(p.id)).map(p=>p.id)};
previousMesh.geometry.dispose();(previousMesh.material as any).dispose();
// Independent corridor capsule audit: inspect every nearby main/branch segment,
// rather than relying on a single nearest-path projection at switchbacks.
const render=course.getRenderData(4096),buckets=new Map<string,any[]>();
let segmentCount=0;
for(const [lineIndex,line]of [render.points,...(render.branches??[]).map(b=>b.points)].entries()){
 const count=lineIndex===0?line.length:line.length-1;
 for(let i=0;i<count;i++){
  const a=line[i]!,b=line[(i+1)%line.length]!,width=Math.max(a.width,b.width),margin=width+10;
  const segment={id:`${lineIndex}:${i}`,a,b,width};segmentCount++;
  for(let x=Math.floor((Math.min(a.x,b.x)-margin)/64);x<=Math.floor((Math.max(a.x,b.x)+margin)/64);x++)
  for(let z=Math.floor((Math.min(a.z,b.z)-margin)/64);z<=Math.floor((Math.max(a.z,b.z)+margin)/64);z++){
   const key=`${x}:${z}`,bucket=buckets.get(key)??[];bucket.push(segment);buckets.set(key,bucket);
  }
 }
}
const adjacentFailures:any[]=[];let adjacentProbes=0,minAdjacentOverhead=Infinity,minAdjacentLowClearance=Infinity;
const adjacent=(x:number,y:number,z:number,id:string)=>{
 for(const segment of buckets.get(`${Math.floor(x/64)}:${Math.floor(z/64)}`)??[]){
  const {a,b,width}=segment,dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  const edge=Math.hypot(x-a.x-dx*t,z-a.z-dz*t)-width,above=y-a.y-(b.y-a.y)*t;adjacentProbes++;
  if(edge<7)minAdjacentOverhead=Math.min(minAdjacentOverhead,above);
  if(above<30)minAdjacentLowClearance=Math.min(minAdjacentLowClearance,edge);
  if(edge<2&&above<30&&adjacentFailures.length<30)adjacentFailures.push({id,segment:segment.id,edge,above,x,y,z});
 }
};
for(let i=0;i<pos.count;i++)adjacent(pos.getX(i),pos.getY(i),pos.getZ(i),`v${i}`);
for(let i=0;i<pos.count;i+=3)adjacent((pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3,(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3,(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3,`t${i/3}`);
(receipt as any).adjacentRouteAudit={segmentCount,adjacentProbes,minAdjacentOverhead,minAdjacentLowClearance,failures:adjacentFailures,passed:!adjacentFailures.length,scope:'All nearby conservative main and branch capsules at4096 main rows plus actual branch rows; discrete vertices/centroids, not swept volumes'};
writeFileSync(`${dir}/cpu-receipt.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync(`${dir}/plan.json`,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
mesh.geometry.dispose();(mesh.material as any).dispose();
