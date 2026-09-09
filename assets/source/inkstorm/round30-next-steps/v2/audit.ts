import { Raycaster,Vector3,FrontSide } from 'three';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RaceSimulation } from '../../../../../src/game/race/RaceSimulation.ts';
import { sampleTerrainHeight } from '../../../../../src/render/terrain/terrainMath.ts';
import { createInkstormFoundry,getInkstormFoundryPlan } from './InkstormFoundry.ts';
import { getInkstormLayout } from '../../../../../src/game/race/inkstormLayout.ts';
const dir='assets/source/inkstorm/round30-next-steps/v2';
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
const receipt={scope:'CPU source candidate only: no browser, GPU, Blender, render, timing or art acceptance',clearanceRule:'Vertices and triangle centroids must stay 2m outside the road edge or at least 30m above installed terrain' ,seed:course.seed,bankIds:plan.bankIds,sockets:plan.sockets.length,pipeRuns:plan.pipes.length,boxes:plan.boxes.length,triangles:pos.count/3,vertices:pos.count,materials:1,additionalMeshes:1,additionalTextures:0,additionalLights:0,perFrameUpdates:0,geometryBytes:Object.values(mesh.geometry.attributes).reduce((sum:any,a:any)=>sum+a.array.byteLength,0),bounds:mesh.geometry.boundingBox,minimumLowVertexOrCentroidClearance:minLowClearance,minimumOverheadVertexOrCentroidHeight:minOverheadHeight,nonfinite,failures,removedArtInstances:[],geometryBudget:24000,budgetPassed:pos.count/3<=24000,clearancePassed:failures.length===0,limitations:['Per-vertex and triangle-centroid checks are not swept-pod or triangle-volume collision proof.','Root must validate actual camera composition, graphics lifecycle and full-race cadence.','Existing collision placement list, gulf arrays, terrain and physics were not edited.','The distant launch basin has not been recomposed by this near-foundry candidate.'],hashes:{candidate:sha(`${dir}/InkstormFoundry.ts`),pipeBankGlb:sha('public/assets/inkstorm/pipe-bank.glb')}};
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
writeFileSync(`${dir}/cpu-receipt.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync(`${dir}/plan.json`,JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
mesh.geometry.dispose();(mesh.material as any).dispose();
