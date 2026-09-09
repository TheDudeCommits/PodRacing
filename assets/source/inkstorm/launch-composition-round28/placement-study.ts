import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Matrix4,Mesh,PerspectiveCamera,Quaternion,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {groundInkstormButtress} from '../../../../src/render/inkstorm/InkstormRockGrounding';
import {LAUNCH_INDUSTRIAL_BENCHES} from './LaunchBasinPlan';

const dir='assets/source/inkstorm/launch-composition-round28';
const receipt=JSON.parse(readFileSync(`${dir}/candidate-field.json`,'utf8')),anchor=receipt.anchor;
const grids=receipt.grids.map((g:CourseGulfGrid&{filename:string})=>{
 const b=readFileSync(`${dir}/${g.filename}`);
 return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
}) as [CourseGulfGrid,CourseGulfGrid];
const field=new CourseGulfField(grids,receipt.launchProfile);
const ground=(x:number,z:number)=>sampleTerrainHeight(x,z,field);
const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const main=Array.from({length:16384},(_,i)=>course.samplePlanAtProgress(i/16384));
const lines:{points:{x:number;z:number;width:number}[];closed:boolean}[]=[{points:main,closed:true}];
for(const branch of course.branches){
 const points=[];
 for(let i=1;i<branch.points.length;i++){
  const a=branch.points[i-1]!,b=branch.points[i]!,steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4));
  for(let k=0;k<=steps;k++){const t=k/steps;points.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,width:Math.max(a.width,b.width)});}
 }
 lines.push({points,closed:false});
}
let intervalAllowance=0;
for(const line of lines)for(let i=0;i<line.points.length-(line.closed?0:1);i++){
 const a=line.points[i]!,b=line.points[(i+1)%line.points.length]!;
 intervalAllowance=Math.max(intervalAllowance,Math.hypot(b.x-a.x,b.z-a.z)+Math.abs(b.width-a.width));
}
const corridor=lines.flatMap(l=>l.points),up=new Vector3(0,1,0);
const candidates=[
 {id:'west-broken-toe',family:'canyon-buttress',forward:350,right:-330,scale:.48,yaw:.28,layer:'near'},
 {id:'west-mid-spire',family:'fractured-spire',forward:570,right:-300,scale:.68,yaw:-.76,layer:'middle'},
 {id:'west-descent-finger',family:'fractured-spire',forward:650,right:-240,scale:.58,yaw:-1.56,layer:'middle'},
 {id:'west-talus-crown',family:'canyon-buttress',forward:690,right:-420,scale:.85,yaw:1.52,layer:'middle'},
 {id:'west-inset-spire',family:'fractured-spire',forward:880,right:-400,scale:.47,yaw:.65,layer:'middle'},
 {id:'east-basin-toe',family:'canyon-buttress',forward:330,right:180,scale:.60,yaw:-1.64,layer:'near'},
 {id:'east-inner-spire',family:'fractured-spire',forward:600,right:210,scale:.75,yaw:1.83,layer:'middle'},
 {id:'east-process-buttress',family:'canyon-buttress',forward:790,right:520,scale:.90,yaw:.25,layer:'middle'},
 {id:'far-west-needle',family:'fractured-spire',forward:1260,right:-330,scale:.70,yaw:-1.28,layer:'far'},
 {id:'refinery-outer-tooth',family:'canyon-buttress',forward:1100,right:670,scale:.70,yaw:.55,layer:'far'},
] as const;
const scans=new Map<string,{positions:number[];triangles:number;sha256:string}>();
for(const family of ['canyon-buttress','fractured-spire'])for(const suffix of ['','-lod']){
 const name=family+suffix,bytes=readFileSync(`public/assets/inkstorm/${name}.glb`),model=await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer,'');
 model.scene.updateMatrixWorld(true);const positions:number[]=[],v=new Vector3();let triangles=0;
 model.scene.traverse(o=>{if(!(o instanceof Mesh))return;const p=o.geometry.getAttribute('position');triangles+=(o.geometry.index?.count??p.count)/3;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);positions.push(...v.toArray());}
  o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});
 scans.set(name,{positions,triangles,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const accepted=[],rejected=[];
for(const form of candidates){
 const size=form.scale,x=anchor.x+anchor.tangentX*form.forward-anchor.rightX*form.right,z=anchor.z+anchor.tangentZ*form.forward-anchor.rightZ*form.right;
 const yaw=Math.atan2(anchor.tangentX,anchor.tangentZ)+form.yaw,radius=Math.hypot(40*size,50*size);
 const placement={id:`launch-composition-${form.id}`,x,z,yaw,sx:size,sy:size,sz:size,radius,family:form.family,forward:form.forward,settlement:false,compositionLayer:form.layer};
 let rawClearance=Infinity;for(const p of corridor)rawClearance=Math.min(rawClearance,Math.hypot(x-p.x,z-p.z)-p.width-radius);
 const clearance=rawClearance-intervalAllowance-9.6;
 const panorama=Math.abs(form.right)-radius-Math.tan(Math.PI/15)*(form.forward+radius);
 const yards=Math.min(...LAUNCH_INDUSTRIAL_BENCHES.map(b=>Math.hypot(Math.max(0,Math.abs(form.forward-b.forward)-b.halfForward-8),Math.max(0,Math.abs(form.right-b.right)-b.halfRight-8))-radius));
 // Both shipped source families have the same exact 80×120×100m bounds.
 // The staged spires explicitly require this existing grounding path when
 // integrated; current runtime applies it to canyon-buttress only.
 const grounded=groundInkstormButtress(placement,ground);
 const matrix=new Matrix4().compose(new Vector3(x,grounded.baseY,z),new Quaternion().setFromAxisAngle(up,yaw),new Vector3(size,grounded.scaleY,size));
 let maxToe= -Infinity,minimumGroundContact=Infinity;
 for(const name of [form.family,`${form.family}-lod`]){
  const positions=scans.get(name)!.positions;
  for(let i=0;i<positions.length;i+=3){
   if(positions[i+1]!>10)continue;
   const p=new Vector3(positions[i],positions[i+1],positions[i+2]).applyMatrix4(matrix);
   const contact=p.y-ground(p.x,p.z);maxToe=Math.max(maxToe,contact);minimumGroundContact=Math.min(minimumGroundContact,contact);
  }
 }
 const visibilityBins=new Map<string,Vector3>();
 const highPositions=scans.get(form.family)!.positions;
 for(let i=0;i<highPositions.length;i+=3){
  if(highPositions[i+1]!<50)continue;
  const key=Math.floor((highPositions[i]!+40)/27)+','+Math.floor((highPositions[i+2]!+50)/34);
  const previous=visibilityBins.get(key);
  if(!previous||highPositions[i+1]!>previous.y)visibilityBins.set(key,new Vector3(highPositions[i],highPositions[i+1],highPositions[i+2]));
 }
 const visibilityProbePoints=[...visibilityBins.values()].map(p=>p.applyMatrix4(matrix).toArray());
 const projections=receipt.cameras.map((c:any)=>{
  const camera=new PerspectiveCamera(c.fov,c.aspect,c.near,c.far);camera.position.fromArray(c.position);camera.quaternion.fromArray(c.quaternion);camera.updateMatrixWorld(true);
  const worldPoints=[];
  for(const xx of [-40,40])for(const yy of [0,120])for(const zz of [-50,50])worldPoints.push(new Vector3(xx,yy,zz).applyMatrix4(matrix));
  const nearClipped=worldPoints.some(p=>p.clone().applyMatrix4(camera.matrixWorldInverse).z>=-camera.near);
  const behindCamera=worldPoints.every(p=>p.clone().applyMatrix4(camera.matrixWorldInverse).z>=-camera.near);
  const points=worldPoints.map(p=>p.clone().project(camera));
  const crown=new Vector3(x,grounded.baseY+120*grounded.scaleY,z);
  return {camera:c.id,rect:nearClipped?null:[(Math.min(...points.map(p=>p.x))+1)/2,(1-Math.max(...points.map(p=>p.y)))/2,(Math.max(...points.map(p=>p.x))+1)/2,(1-Math.min(...points.map(p=>p.y)))/2],nearClipped,behindCamera,crown:crown.toArray(),crownNdc:behindCamera?null:crown.clone().project(camera).toArray()};
 });
 const reasons=[];if(clearance<7)reasons.push('route');if(panorama<=0)reasons.push('panorama');if(yards<=0)reasons.push('yard');if(grounded.scaleY/size>1.75)reasons.push('stretched');if(maxToe>=0)reasons.push('floating toe');
 const result={...placement,local:{forward:form.forward,right:form.right},grounded,requiresGroundedSpireIntegration:form.family==='fractured-spire',clearance,panorama,yards,maxToe,minimumGroundContact,scaleRatio:grounded.scaleY/size,projections,visibilityProbePoints,
  highTriangles:scans.get(form.family)!.triangles,lowTriangles:scans.get(`${form.family}-lod`)!.triangles};
 if(reasons.length)rejected.push({...result,reasons});else accepted.push(result);
}
const report={status:'CPU-only placement candidates; terrain-only occlusion check and GPU art acceptance pending',fieldSha256:receipt.grids[0].sha256,mainSamples:main.length,allCorridorSamples:corridor.length,intervalAllowance,
 sourceScans:Object.fromEntries([...scans].map(([id,{positions,...r}])=>[id,r])),accepted,rejected,
 highTriangleBudget:accepted.reduce((s,a)=>s+a.highTriangles,0),lowTriangleBudget:accepted.reduce((s,a)=>s+a.lowTriangles,0)};
writeFileSync(`${dir}/landforms.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,accepted:accepted.map(({projections,...p})=>p),rejected:rejected.map(p=>({id:p.id,reasons:p.reasons,clearance:p.clearance,panorama:p.panorama,yards:p.yards,maxToe:p.maxToe,scaleRatio:p.scaleRatio}))},null,2));
