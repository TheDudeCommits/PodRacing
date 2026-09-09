/* CPU-only source study; root timing release required before execution. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Vector3, Matrix4, Quaternion, BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Raycaster } from 'three';
import { CinematicCamera } from '../../../../../src/camera/CinematicCamera';
import { createProceduralPodraceCourse } from '../../../../../src/game/race/course';
import { createCourseGulfField } from '../../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../../src/render/terrain/terrainMath';
import { getInkstormLayout } from '../../../../../src/game/race/inkstormLayout';
const base='assets/source/inkstorm/foundry-service-round33/v3-hoist/';
const capturePath='output/gauntlet/round-33-foundry-combined-v4/receipts.json';
const capture=JSON.parse(fs.readFileSync(capturePath,'utf8'));
const contract=JSON.parse(fs.readFileSync(base+'v2-hoist-triangle-contract.json','utf8'));
const raw=fs.readFileSync('assets/source/inkstorm/foundry-service-round33/v2/foundry-service-gantry-v2.glb');
const sha=(b:Buffer)=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(raw)!==contract.sourceSha256)throw Error('V2 source changed');
const jsonLength=raw.readUInt32LE(12),doc=JSON.parse(raw.subarray(20,20+jsonLength).toString()),binStart=28+jsonLength;
function rows(i:number){const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],dim=a.type==='SCALAR'?1:3,unit=a.componentType===5126?4:2,stride=v.byteStride??unit*dim;const out:number[][]=[];for(let j=0;j<a.count;j++){const p=binStart+(v.byteOffset??0)+(a.byteOffset??0)+j*stride;out.push(Array.from({length:dim},(_,k)=>a.componentType===5126?raw.readFloatLE(p+k*unit):raw.readUInt16LE(p+k*unit)));}return out;}
const prim=doc.meshes[0].primitives[0],positions=rows(prim.attributes.POSITION),indices=rows(prim.indices).flat();
const labels:string[]=contract.triangleLabels.map((label:string,i:number)=>{if(label!=='original_retained')return label;const tr=indices.slice(i*3,i*3+3).map(j=>positions[j]);const cy=tr.reduce((a,p)=>a-p[2],0)/3,cz=tr.reduce((a,p)=>a+p[1],0)/3;if(cy>4.8&&cz<44.8)return 'original-near-conduit';if(cy>2.5&&cz>=43.8&&cz<51.6)return 'original-near-truss';return label;});
const material=new MeshBasicMaterial({side:DoubleSide});
function model(ps:number[][],is:number[],ls:string[]){const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(ps.flat(),3));geo.setIndex(is);geo.computeBoundingSphere();return {mesh:new Mesh(geo,material),ps,is,ls};}
const models=[{name:'V2 actual final GLB',...model(positions,indices,labels)}];
if(fs.existsSync(base+'v3-hoist-arithmetic.json')){
 const proposal=JSON.parse(fs.readFileSync(base+'v3-hoist-arithmetic.json','utf8'));
 const ps=positions.map(p=>p.slice()),is:number[]=[],ls:string[]=[];
 for(let i=0;i<labels.length;i++)if(!contract.groups[contract.triangleLabels[i]]){is.push(...indices.slice(i*3,i*3+3));ls.push(labels[i]);}
 const offset=ps.length;ps.push(...proposal.vertices.map(([x,y,z]:number[])=>[x,z,-y]));
 for(let f=0;f<proposal.faces.length;f++){const face=proposal.faces[f];for(let i=1;i<face.length-1;i++){is.push(offset+face[0],offset+face[i],offset+face[i+1]);ls.push(proposal.groups[f]);}}
 models.push({name:'V3 arithmetic proposal, not exported',...model(ps,is,ls)});
}
const receipts=[capture.receipts.find((r:any)=>r.section.id==='06-foundry'),capture.supplemental.find((r:any)=>r.view.id==='foundry-near-span')];
const results:any[]=[];
for(const receipt of receipts){
 const view=receipt.section??receipt.view,game=receipt.game,course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},game.course.seed),gulf=createCourseGulfField(course)!;
 const height=(x:number,z:number)=>sampleTerrainHeight(x,z,gulf),ahead=course.sampleAtDistance(view.progress*course.totalLength+55+Math.min(70,game.speed*.3));
 const forward=new Vector3(Math.sin(game.yaw),0,Math.cos(game.yaw)),rig=new CinematicCamera();rig.setCaptureMode(true);rig.camera.aspect=2160/1350;
 rig.snap({position:new Vector3(...game.position),forward,velocity:forward.clone().multiplyScalar(game.speed),speed:game.speed,chaseClearance:5.2,routeLookAhead:new Vector3(ahead.x,ahead.y+3,ahead.z)});rig.camera.updateMatrixWorld(true);
 const cameraError=rig.camera.position.distanceTo(new Vector3(...game.cameraPosition));if(cameraError>.001)throw Error(`Camera mismatch ${view.id} ${cameraError}`);
 const gantry=getInkstormLayout(course).find(p=>p.family==='foundry-gantry'&&p.progress>.1)!;
 const transform=new Matrix4().compose(new Vector3(gantry.x,height(gantry.x,gantry.z)-1.5,gantry.z),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),gantry.yaw),new Vector3(gantry.sx,gantry.sy,gantry.sz));
 const eye=rig.camera.position,project=(p:Vector3)=>{const n=p.clone().project(rig.camera);return [(n.x+1)*1080,(1-n.y)*675,n.z];};
 const run:any={view:view.id,cameraError,cameraPosition:eye.toArray(),cameraInSourceGltf:eye.clone().applyMatrix4(transform.clone().invert()).toArray(),gantry,models:[]};
 for(const m of models){m.mesh.matrixAutoUpdate=false;m.mesh.matrix.copy(transform);m.mesh.updateMatrixWorld(true);const ray=new Raycaster(),groups:any={};
  for(let i=0;i<m.ls.length;i++){
   const name=m.ls[i];if(name.startsWith('original')||name==='v2_unrelated')continue;
   const tr=m.is.slice(i*3,i*3+3).map(j=>new Vector3(...m.ps[j]).applyMatrix4(transform)),screen=tr.map(project),g=groups[name]??={triangles:0,screenBounds:[[Infinity,-Infinity],[Infinity,-Infinity]],frontFacingSamples:0,visibleSamples:0,frontFacingProjectedArea:0,visibleProjectedArea:0,occluders:{}};
   g.triangles++;for(const p of screen)for(let k=0;k<2;k++){g.screenBounds[k][0]=Math.min(g.screenBounds[k][0],p[k]);g.screenBounds[k][1]=Math.max(g.screenBounds[k][1],p[k]);}
   const centroid=tr[0].clone().add(tr[1]).add(tr[2]).multiplyScalar(1/3),normal=tr[1].clone().sub(tr[0]).cross(tr[2].clone().sub(tr[0]));
   if(normal.dot(eye.clone().sub(centroid))<=0)continue;
   const area=Math.abs((screen[1][0]-screen[0][0])*(screen[2][1]-screen[0][1])-(screen[1][1]-screen[0][1])*(screen[2][0]-screen[0][0]))*.5;
   if(area<.015)continue;
   g.frontFacingSamples++;g.frontFacingProjectedArea+=area;const distance=eye.distanceTo(centroid);ray.set(eye,centroid.clone().sub(eye).normalize());ray.far=distance+.005;
   const hit=ray.intersectObject(m.mesh,false)[0];const visible=hit&&hit.faceIndex===i;
   if(visible){g.visibleSamples++;g.visibleProjectedArea+=area;}else{const blocker=hit?m.ls[hit.faceIndex!]: 'no hit';g.occluders[blocker]=(g.occluders[blocker]??0)+1;}
  }
  for(const g of Object.values(groups) as any[]){g.screenSize=g.screenBounds.map(([a,b]:number[])=>b-a);g.visibleProjectedAreaFraction=g.frontFacingProjectedArea?g.visibleProjectedArea/g.frontFacingProjectedArea:null;}
  run.models.push({name:m.name,groups});
 }
 results.push(run);rig.dispose();
}
for(const m of models)m.mesh.geometry.dispose();material.dispose();
const report={scope:'CPU reconstruction of actual fixed racing cameras; gantry self-occlusion only. Excludes other runtime scenery/terrain and screen-space shading. Triangle-centroid visibility is diagnostic, not art acceptance.',captureSha256:sha(fs.readFileSync(capturePath)),sourceSha256:sha(raw),results};
fs.writeFileSync(base+'camera-study.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({view:r.view,cameraError:r.cameraError,cameraInSourceGltf:r.cameraInSourceGltf,models:r.models.map((m:any)=>({name:m.name,groups:Object.fromEntries(Object.entries(m.groups).map(([k,g]:any)=>[k,{size:g.screenSize,visibleAreaFraction:g.visibleProjectedAreaFraction,occluders:g.occluders}]))}))})),null,2));
