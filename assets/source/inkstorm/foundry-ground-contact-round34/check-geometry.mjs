import { registerHooks } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const here=fileURLToPath(new URL('.',import.meta.url)),root=resolve(here,'../../../..');
registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){
 let p=fileURLToPath(new URL(s,c.parentURL));
 if(!existsSync(p)&&!existsSync(p+'.ts'))for(const name of ['candidate','baseline']){const prefix=resolve(here,name,'src')+'/';if(p.startsWith(prefix))p=resolve(root,'src',p.slice(prefix.length));}
 if(existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);
 if(existsSync(p+'/index.ts'))return next(pathToFileURL(p+'/index.ts').href,c);
}return next(s,c);}});
const load=path=>import(pathToFileURL(resolve(root,path)).href);
const [{buildFoundationContactBank,createInkstormFoundationContactPlan},{createProceduralPodraceCourse},{createCourseGulfField},{createPitPadField},{getInkstormLayout},{sampleTerrainHeight},three]=await Promise.all([
 import('./candidate/src/render/inkstorm/InkstormFoundationContact.ts'),load('src/game/race/course.ts'),load('src/game/race/CourseGulfField.ts'),load('src/game/race/PitPadField.ts'),load('src/game/race/inkstormLayout.ts'),load('src/render/terrain/terrainMath.ts'),import('three')]);
const check=(v,m)=>{if(!v)throw Error(m);};
const hash=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
function topology(bank,p,heightAt){
 const edges=new Map(), verts=new Map(),normalLengths=[];let volume=0,minimumArea=Infinity,maximumOutside=0,minimumToeBurial=Infinity;
 const origin=[p.x,bank.receipt.bottom,p.z],pos=bank.positions;let maxNormalError=0;
 for(let i=0;i<pos.length;i+=9){
  const q=[pos.slice(i,i+3),pos.slice(i+3,i+6),pos.slice(i+6,i+9)];
  const ids=q.map(v=>{const key=v.join(',');if(!verts.has(key))verts.set(key,verts.size);return verts.get(key);});
  for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=Math.min(a,b)+':'+Math.max(a,b);const old=edges.get(key)??{count:0,direction:0};old.count++;old.direction+=a<b?1:-1;edges.set(key,old);}
  const [a,b,c]=q.map(v=>v.map((x,k)=>x-origin[k]));
  volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  const u=q[1].map((x,k)=>x-q[0][k]),v=q[2].map((x,k)=>x-q[0][k]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);
  minimumArea=Math.min(minimumArea,len/2);
  for(let k=0;k<3;k++){const normal=bank.normals.slice(i+k*3,i+k*3+3);normalLengths.push(Math.hypot(...normal));maxNormalError=Math.max(maxNormalError,...normal.map((x,j)=>Math.abs(x-n[j]/len)));}
  for(const v of q){const dx=v[0]-p.x,dz=v[2]-p.z;maximumOutside=Math.max(maximumOutside,Math.abs(dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))-47*p.sx,Math.abs(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))-22*p.sz);}
 }
 for(let i=0;i<bank.terrainToe.length;i++){
  const a=bank.terrainToe[i],b=bank.terrainToe[(i+1)%bank.terrainToe.length];const steps=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.25);
  for(let j=0;j<=steps;j++){const t=j/steps,q=a.map((x,k)=>x+(b[k]-x)*t);minimumToeBurial=Math.min(minimumToeBurial,heightAt(q[0],q[2])-q[1]);}
 }
 const badEdges=[...edges].filter(([,e])=>e.count!==2||e.direction!==0);
 check(badEdges.length===0,'Open/inconsistent edges: '+p.id);check(volume>0,'Non-outward closed orientation: '+p.id);check(minimumArea>1e-7,'Degenerate actual triangle');check(maximumOutside===0,'Outside old footprint');check(maxNormalError<1e-10,'Normals do not follow packed faces');check(minimumToeBurial>0,'Dense terrain gap: '+p.id);
 return {id:p.id,triangles:pos.length/9,uniqueVertices:verts.size,edges:edges.size,badEdges:badEdges.length,eulerCharacteristic:verts.size-edges.size+pos.length/9,signedVolume:volume,minimumArea,maximumOutside,maximumNormalError:maxNormalError,minimumToeBurialAtQuarterMetreProbes:minimumToeBurial};
}
const synthetic=[];
for(const yaw of [0,.74,-2.1]){
 const p={id:'synthetic-'+yaw,family:'pipe-bank',x:19583,z:-253,yaw,sx:1,sy:1.8,sz:1};
 const h=(x,z)=>2+Math.sin((x-p.x)/15)*1.1+Math.cos((z-p.z)/18)*.7;
 const bank=buildFoundationContactBank(p,h,20);synthetic.push(topology(bank,p,h));
}
let gulf=null,pit=null;const ground=(x,z)=>sampleTerrainHeight(x,z)+(gulf?.sampleOffset(x,z)??0)+(pit?.sampleOffset(x,z)??0);
const course=createProceduralPodraceCourse({heightAt:ground},0x494e4b53);gulf=createCourseGulfField(course);course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
pit=createPitPadField(getInkstormLayout(course),Array.from({length:2048},(_,i)=>course.samplePlanAtProgress(i/2048)),course.branches,(x,z)=>sampleTerrainHeight(x,z)+gulf.sampleOffset(x,z));
const banks=getInkstormLayout(course).filter(p=>p.family==='pipe-bank'),pins=JSON.parse(readFileSync(resolve(here,'construction-plan-inputs-v1.json'),'utf8'));
check(JSON.stringify(banks)===JSON.stringify(pins.referencePlacements),'Current layout differs from pinned map input');
const started=performance.now(),plan=createInkstormFoundationContactPlan(course,ground),ms=performance.now()-started;
const actual=[];
for(const receipt of plan.banks){const p=banks.find(p=>p.id===receipt.id),bank=buildFoundationContactBank(p,ground,receipt.minimumRoadSafety);actual.push({...receipt,...topology(bank,p,ground)});}
const receipt={scope:'CPU-only actual candidate geometry and unchanged course/terrain modules. Complete coordinate-welded edge incidence/orientation and actual Float32 positions checked. Dense toe probes .25m; not a continuous terrain proof, GPU render or performance gate.',sourceHashes:['src/render/inkstorm/InkstormFoundations.ts','src/render/inkstorm/InkstormFoundry.ts','src/render/inkstorm/InkstormWorld.ts','src/game/race/course.ts','src/game/race/inkstormLayout.ts','public/assets/inkstorm/pipe-bank-detail-v1.glb'].map(path=>({path,sha256:hash(path)})),synthetic,course:{seed:course.seed,totalLength:course.totalLength,referencePlacementTuplesExact:true},buildCpuMs:ms,accepted:actual,rejected:plan.rejected,totalTriangles:actual.reduce((s,x)=>s+x.triangles,0),netTriangles:actual.reduce((s,x)=>s+x.triangles-12,0),uploadedGeometryBytes:plan.geometry?[...Object.values(plan.geometry.attributes)].reduce((s,a)=>s+a.array.byteLength,0):0};
writeFileSync(resolve(here,'geometry-check-v1.json'),JSON.stringify(receipt,null,2)+'\n');
writeFileSync(resolve(here,'geometry-cpu-copy-v1.json'),JSON.stringify({banks:plan.banks,positions:plan.geometry?Array.from(plan.geometry.getAttribute('position').array):[],normals:plan.geometry?Array.from(plan.geometry.getAttribute('normal').array):[],colors:plan.geometry?Array.from(plan.geometry.getAttribute('color').array):[]})+'\n');
const [{CinematicCamera},{updateCourseJunctionFraming}]=await Promise.all([load('src/camera/CinematicCamera.ts'),load('src/camera/CourseJunctionFraming.ts')]);
const captures=JSON.parse(readFileSync(resolve(root,'output/gauntlet/round34-painted-shading-v13/captures/receipts.json'),'utf8'));
const projections=[];
for(const frame of [...captures.receipts,...captures.supplemental]){
 const g=frame.game,progress=frame.galactic.racers.find(x=>x.id==='player').courseProgress;
 const forward=new three.Vector3(Math.sin(g.yaw),0,Math.cos(g.yaw));
 const position=new three.Vector3(...g.cameraFocusPosition),ahead=course.sampleAtDistance(progress*course.totalLength+55+Math.min(70,g.speed*.3));
 const junction=new three.Vector3(),weight=updateCourseJunctionFraming(course,progress,position,forward,junction);
 const subject={position,forward,velocity:forward.clone().multiplyScalar(g.speed),speed:g.speed,chaseClearance:4.8,routeLookAhead:new three.Vector3(ahead.x,ahead.y+3,ahead.z),junctionWeight:weight,...(weight>0?{junctionLookAhead:junction}:{})};
 const rig=new CinematicCamera();rig.camera.aspect=1.6;rig.setMode(frame.camera);rig.snap(subject);rig.camera.updateMatrixWorld(true);
 const eyeError=rig.camera.position.distanceTo(new three.Vector3(...g.cameraPosition));check(eyeError<1e-8,'Camera eye reconstruction differs: '+frame.section?.id);
 const rows=[];
 for(const bank of actual){
  const p=banks.find(p=>p.id===bank.id),built=buildFoundationContactBank(p,ground,bank.minimumRoadSafety);
  const visible=[];
  for(let i=0;i<built.positions.length;i+=3){const q=new three.Vector3(...built.positions.slice(i,i+3));if(q.clone().applyMatrix4(rig.camera.matrixWorldInverse).z>=-.25)continue;const ndc=q.project(rig.camera);visible.push([(ndc.x+1)*1080,(1-ndc.y)*675]);}
  if(!visible.length)continue;
  const bounds=[Math.min(...visible.map(q=>q[0])),Math.min(...visible.map(q=>q[1])),Math.max(...visible.map(q=>q[0])),Math.max(...visible.map(q=>q[1]))];
  if(bounds[0]>2160||bounds[1]>1350||bounds[2]<0||bounds[3]<0)continue;
  const world=(x,y,z)=>new three.Vector3(p.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),y,p.z-x*Math.sin(p.yaw)+z*Math.cos(p.yaw));
  const screen=q=>{const t=q.project(rig.camera);return new three.Vector2((t.x+1)*1080,(1-t.y)*675);};
  const y=bank.top-.9,frontZ=22*p.sz-.356;
  const grooveWidth=screen(world(-.3*p.sx,y,frontZ)).distanceTo(screen(world(.3*p.sx,y,frontZ)));
  const recessDepth=screen(world(0,y,frontZ)).distanceTo(screen(world(0,y,frontZ-.3)));
  rows.push({id:p.id,unoccludedScreenBounds:bounds,centralJointWidthPx:grooveWidth,recessDepthPx:recessDepth,eyeToTopCentre:rig.camera.position.distanceTo(world(0,bank.top,0))});
 }
 projections.push({id:(frame.section??frame.view).id,eyeError,fov:rig.camera.fov,quaternion:rig.camera.quaternion.toArray(),banks:rows.sort((a,b)=>a.eyeToTopCentre-b.eyeToTopCentre)});rig.dispose();
}
writeFileSync(resolve(here,'projection-check-v1.json'),JSON.stringify({scope:'CPU projection of actual candidate packed geometry using current wider camera class and recorded race preset velocity direction. All11 reconstructed eye positions match actual V13 receipts. Unoccluded bounds only: no terrain/scenery depth, raster, motion or visual acceptance claim.',captureReceiptSha256:hash('output/gauntlet/round34-painted-shading-v13/captures/receipts.json'),views:projections},null,2)+'\n');
plan.geometry?.dispose();
console.log(JSON.stringify({synthetic:synthetic.length,accepted:actual.length,rejected:plan.rejected,totalTriangles:receipt.totalTriangles,netTriangles:receipt.netTriangles,buildCpuMs:ms,minimumToeBurial:Math.min(...actual.map(x=>x.minimumToeBurialAtQuarterMetreProbes))},null,2));
