/** CPU-only pre-integration arch corridor study. No public/runtime mutation. */
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Box3,Matrix4,Mesh,Quaternion,Triangle,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createProceduralPodraceCourse,type PodraceCourse} from '../src/game/race/course';
import {createCourseGulfField,type CourseGulfField} from '../src/game/race/CourseGulfField';
import {getInkstormLayout,type InkstormPlacement} from '../src/game/race/inkstormLayout';
import {sampleTerrainHeight} from '../src/render/terrain/terrainMath';

const asset='assets/source/inkstorm/canyon-arch-v3/canyon-arch-v3-normalized.glb';
const output='output/arch-v3/clearance';
const seeds=[0x494e4b53,0,1,42,1234,987654321,0x494e4b52,0x494e4b54,0xffffffff];
const step=.4,maximumStep=.5,wideHalf=9.6,guard=7,headroom=12,verticalBaseAllowance=1;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const originalPath='public/assets/inkstorm/canyon-arch.glb';
const originalSHA='36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453';
assert.equal(fileHash(originalPath),originalSHA);
const bytes=readFileSync(asset),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const triangles:{triangle:Triangle;bounds:Box3}[]=[],bounds=new Box3();
gltf.scene.traverse(o=>{
 if(!(o instanceof Mesh))return;
 const g=o.geometry.clone().applyMatrix4(o.matrixWorld),positions=g.getAttribute('position'),indices=g.index!;
 for(let i=0;i<indices.count;i+=3){
  const points=[0,1,2].map(k=>new Vector3().fromBufferAttribute(positions,indices.getX(i+k)));
  const triangle=new Triangle(points[0],points[1],points[2]),box=new Box3().setFromPoints(points);
  triangles.push({triangle,bounds:box});bounds.union(box);
 }g.dispose();
});
assert.equal(triangles.length,37800);
const protectedOpening=new Box3(new Vector3(-44,0,bounds.min.z-1),new Vector3(44,24,bounds.max.z+1));
const protectedOpeningIntersections=triangles.filter(t=>protectedOpening.intersectsTriangle(t.triangle)).length;
assert.equal(protectedOpeningIntersections,0,'The guaranteed opening must match this exact candidate GLB');
assert(bounds.min.y>=0);
const binSize=4,bins=new Map<string,number[]>();
for(const [i,t]of triangles.entries())for(let x=Math.floor(t.bounds.min.x/binSize);x<=Math.floor(t.bounds.max.x/binSize);x++)
 for(let z=Math.floor(t.bounds.min.z/binSize);z<=Math.floor(t.bounds.max.z/binSize);z++){
  const key=x+','+z,list=bins.get(key)??[];list.push(i);bins.set(key,list);
 }

interface Point{x:number;z:number;width:number;rightX:number;rightZ:number;progress:number;deck:number|null;}
interface Line{id:string;points:Point[];closed:boolean;}
function directMain(course:PodraceCourse):Line{
 const count=Math.ceil(course.totalLength/step);
 const points=Array.from({length:count},(_,i)=>{
  const p=course.samplePlanAtProgress(i/count);
  return {x:p.x,z:p.z,width:p.width,rightX:p.rightX,rightZ:p.rightZ,progress:p.progress,deck:null};
 });
 // Adaptive distance-parameter subdivision enforces measured world spacing,
 // independent of getRenderData's clamp and approximate course arc table.
 const dense:Point[]=[];
 function subdivide(a:Point,b:Point,pa:number,pb:number,depth=0){
  if(Math.hypot(b.x-a.x,b.z-a.z)>maximumStep){
   assert(depth<12);const pm=(pa+pb)/2,p=course.samplePlanAtProgress(pm);
   const mid:Point={x:p.x,z:p.z,width:p.width,rightX:p.rightX,rightZ:p.rightZ,progress:p.progress,deck:null};
   subdivide(a,mid,pa,pm,depth+1);subdivide(mid,b,pm,pb,depth+1);
  }else dense.push(a);
 }
 for(let i=0;i<points.length;i++)subdivide(points[i],points[(i+1)%points.length],i/count,(i+1)/count);
 return {id:'main',points:dense,closed:true};
}
function branchLines(course:PodraceCourse):Line[]{
 return course.branches.map(branch=>{
  const points:Point[]=[];
  for(let i=1;i<branch.points.length;i++){
   const a=branch.points[i-1],b=branch.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   const n=Math.max(1,Math.ceil(len/step));
   for(let k=0;k<=n;k++){
    const t=k/n;points.push({x:a.x+dx*t,z:a.z+dz*t,width:Math.max(a.width,b.width),rightX:dz/len,rightZ:-dx/len,
     progress:a.canonicalProgress+(b.canonicalProgress-a.canonicalProgress)*t,
     deck:branch.elevated?a.y+(b.y-a.y)*t:null});
   }
  }return {id:'branch:'+branch.id,points,closed:false};
 });
}
function physical(course:PodraceCourse){return {signature:course.signature,totalLength:course.totalLength,
 controlPoints:course.controlPoints,checkpoints:course.checkpoints,branches:course.branches,
 layout:getInkstormLayout(course),directPlan:Array.from({length:4096},(_,i)=>course.samplePlanAtProgress(i/4096))};}

function study(rock:InkstormPlacement,lines:Line[],ground:(x:number,z:number)=>number){
 const baseY=ground(rock.x,rock.z)-1.5;
 const matrix=new Matrix4().compose(new Vector3(rock.x,baseY,rock.z),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),rock.yaw),new Vector3(rock.sx,rock.sy,rock.sz));
 const inverse=matrix.clone().invert(),minXZScale=Math.min(rock.sx,rock.sz);
 const receipt={id:rock.id,progress:rock.progress,placement:rock,baseY,baseContract:'render terrain height at center minus 1.5m',
  totalRouteSegments:0,nearbyRouteSegments:0,sweptCells:0,guaranteedOpeningCells:0,triangleTests:0,intersectingCells:0,
  maximumCenterInterval:0,maximumAcrossInterval:0,maximumHorizontalAllowance:0,maximumCellHeightRange:0,
  maximumVerticalAllowance:0,minimumOpeningSideMargin:Infinity,minimumOpeningTopMargin:Infinity,
  routeCounts:[] as {id:string;points:number;nearbySegments:number;intersectingCells:number}[],
  witnesses:[] as unknown[],status:'pending'};
 const seen=new Set<number>(),cellBox=new Box3(),point=new Vector3(),coarse=new Box3();
 function test(box:Box3):number|null{
  if(!box.intersectsBox(bounds))return null;
  // This empty volume was independently verified against every exported
  // triangle. Its extension below Y=0 is also empty because min asset Y=0.
  if(box.min.x>=-44&&box.max.x<=44&&box.max.y<=24){receipt.guaranteedOpeningCells++;return null;}
  seen.clear();
  for(let x=Math.floor(box.min.x/binSize);x<=Math.floor(box.max.x/binSize);x++)
   for(let z=Math.floor(box.min.z/binSize);z<=Math.floor(box.max.z/binSize);z++)for(const index of bins.get(x+','+z)??[]){
    if(seen.has(index))continue;seen.add(index);const item=triangles[index];
    if(!box.intersectsBox(item.bounds))continue;
    receipt.triangleTests++;
    if(box.intersectsTriangle(item.triangle))return index;
   }
  return null;
 }
 for(const line of lines){
  const route={id:line.id,points:line.points.length,nearbySegments:0,intersectingCells:0};
  const n=line.closed?line.points.length:line.points.length-1;
  for(let i=0;i<n;i++){
   const a=line.points[i],b=line.points[(i+1)%line.points.length];receipt.totalRouteSegments++;
   const distance=Math.hypot(b.x-a.x,b.z-a.z);assert(distance<=maximumStep+1e-7);
   receipt.maximumCenterInterval=Math.max(receipt.maximumCenterInterval,distance);
   // Coincident branch endpoints can change direction/width. Sweep that
   // corner fan too; only a completely identical duplicate is redundant.
   if(distance<1e-10&&Math.hypot(b.rightX-a.rightX,b.rightZ-a.rightZ)<1e-10&&Math.abs(b.width-a.width)<1e-10)continue;
   const radius=Math.max(a.width,b.width)+wideHalf+guard;
   const allowance=distance+Math.abs(b.width-a.width)+radius*Math.hypot(b.rightX-a.rightX,b.rightZ-a.rightZ);
   coarse.makeEmpty();
   for(const p of[a,b])for(const sign of[-1,1]){
    point.set(p.x+p.rightX*radius*sign,baseY,p.z+p.rightZ*radius*sign).applyMatrix4(inverse);coarse.expandByPoint(point);
   }
   const localAllowance=allowance/minXZScale;coarse.expandByScalar(localAllowance);
   if(coarse.max.x<bounds.min.x||coarse.min.x>bounds.max.x||coarse.max.z<bounds.min.z||coarse.min.z>bounds.max.z)continue;
   route.nearbySegments++;receipt.nearbyRouteSegments++;
   receipt.maximumHorizontalAllowance=Math.max(receipt.maximumHorizontalAllowance,allowance);
   const acrossCount=Math.ceil(2*radius/step),acrossStep=2*radius/acrossCount;
   assert(acrossStep<=maximumStep);receipt.maximumAcrossInterval=Math.max(receipt.maximumAcrossInterval,acrossStep);
   for(let j=0;j<acrossCount;j++){
    const left=-radius+j*acrossStep,right=left+acrossStep;cellBox.makeEmpty();
    let minY=Infinity,maxY=-Infinity;
    // Nine actual support samples per cell include corners, edge midpoints,
    // center, main terrain, and elevated branch height when present.
    for(const t of[0,.5,1])for(const lateral of[left,(left+right)/2,right]){
     const x=a.x+(b.x-a.x)*t+(a.rightX+(b.rightX-a.rightX)*t)*lateral;
     const z=a.z+(b.z-a.z)*t+(a.rightZ+(b.rightZ-a.rightZ)*t)*lateral;
     // InkstormRoad adds .07 at construction and another .04 in its shader.
     const deck=a.deck===null||b.deck===null?-Infinity:a.deck+(b.deck-a.deck)*t+.11;
     const y=Math.max(ground(x,z)+.45,deck);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
     point.set(x,y,z).applyMatrix4(inverse);cellBox.expandByPoint(point);
    }
    const range=maxY-minY,verticalAllowance=verticalBaseAllowance+range;
    receipt.maximumCellHeightRange=Math.max(receipt.maximumCellHeightRange,range);
    receipt.maximumVerticalAllowance=Math.max(receipt.maximumVerticalAllowance,verticalAllowance);
    cellBox.min.x-=localAllowance;cellBox.max.x+=localAllowance;cellBox.min.z-=localAllowance;cellBox.max.z+=localAllowance;
    cellBox.min.y=(minY-verticalAllowance-baseY)/rock.sy;
    cellBox.max.y=(maxY+headroom+verticalAllowance-baseY)/rock.sy;
    receipt.sweptCells++;
    if(cellBox.max.z>=bounds.min.z&&cellBox.min.z<=bounds.max.z){
     receipt.minimumOpeningSideMargin=Math.min(receipt.minimumOpeningSideMargin,cellBox.min.x+44,44-cellBox.max.x);
     receipt.minimumOpeningTopMargin=Math.min(receipt.minimumOpeningTopMargin,24-cellBox.max.y);
    }
    const hit=test(cellBox);
    if(hit!==null){
     receipt.intersectingCells++;route.intersectingCells++;
     if(receipt.witnesses.length<24)receipt.witnesses.push({route:line.id,segment:i,progress:a.progress,lateral:[left,right],
      supportHeight:[minY,maxY],allowance,verticalAllowance,triangle:hit,localBox:{min:cellBox.min.toArray(),max:cellBox.max.toArray()},
      triangleVertices:[triangles[hit].triangle.a.toArray(),triangles[hit].triangle.b.toArray(),triangles[hit].triangle.c.toArray()]});
    }
   }
  }
  receipt.routeCounts.push(route);
 }
 receipt.status=receipt.intersectingCells?'unsafe-conservative-envelope':'clear-conservative-envelope';
 return receipt;
}

const cases=[];
for(const seed of seeds){
 // Same ordering as RaceSimulation: generate on base terrain, install the
 // instance field, refresh cached heights. No course/terrain edits follow.
 let field:CourseGulfField|null=null;
 const terrain={heightAt:(x:number,z:number)=>sampleTerrainHeight(x,z,field)};
 const course=createProceduralPodraceCourse(terrain,seed);field=createCourseGulfField(course);
 if(field)course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
 const before=hash(physical(course)),lines=[directMain(course),...branchLines(course)];
 const arches=getInkstormLayout(course).filter(p=>p.family==='canyon-arch');assert.equal(arches.length,2);
 const results=arches.map(p=>study(p,lines,terrain.heightAt));
 const after=hash(physical(course));assert.equal(before,after);
 cases.push({seed,seedHex:'0x'+seed.toString(16).padStart(8,'0'),signature:course.signature,totalLength:course.totalLength,
  branches:course.branches.length,fieldEnabled:Boolean(field),physicalHashBefore:before,physicalHashAfter:after,results});
 console.log(JSON.stringify({seed,signature:course.signature,results:results.map(r=>({id:r.id,status:r.status,cells:r.sweptCells,
  intersections:r.intersectingCells,maxStep:r.maximumCenterInterval,sideMargin:r.minimumOpeningSideMargin,topMargin:r.minimumOpeningTopMargin}))}));
}
assert.equal(fileHash(originalPath),originalSHA);
const report={generatedAt:new Date().toISOString(),asset,assetSha256:fileHash(asset),source:'actual GLB triangles and production course/terrain/layout functions',
 method:{main:'direct samplePlanAtProgress with adaptive measured <=.5m spacing; never getRenderData',
  branches:'every piecewise branch segment interpolated at <=.4m spacing, including elevated road heights',
  across:'each full lane halfwidth +9.6m craft halfwidth+7m guard split into <=.4m cells',
  geometry:'actual local triangle against conservative 3D cell boxes; independently validated empty opening shortcut',
  horizontalAllowance:'whole endpoint center interval + lane width change + radius times right-vector change, divided by minimum local X/Z scale',
  verticalAllowance:'1m plus entire 9-point cell support-height range; top is max road/terrain support +12m + allowance',
  scope:'full transformed asset depth; every main and branch line, no canonical-progress proximity filter',
  limitation:'Dense conservative sampled study, not an analytic global derivative proof of the terrain between samples; unsafe means the expanded guard volume intersects, not necessarily the chassis.'},
 budgets:{maximumStep,requestedStep:step,craftHalfWidth:wideHalf,guard,headroom,verticalBaseAllowance},
 originalPublicPreserved:true,originalPublicSha256:originalSHA,cases,
 protectedOpening:{min:protectedOpening.min.toArray(),max:protectedOpening.max.toArray(),triangleIntersections:protectedOpeningIntersections},
 unsafePlacements:cases.flatMap(c=>c.results.filter(r=>r.intersectingCells).map(r=>({seed:c.seed,id:r.id,intersectingCells:r.intersectingCells}))),
 sourceHashes:Object.fromEntries(['src/game/race/course.ts','src/game/race/CourseGulfField.ts','src/game/race/branches.ts',
  'src/game/race/inkstormLayout.ts','src/render/terrain/terrainMath.ts','src/render/inkstorm/InkstormWorld.ts'].map(p=>[p,fileHash(p)]))};
mkdirSync(output,{recursive:true});writeFileSync(output+'/clearance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:output+'/clearance.json',cases:cases.length,placements:cases.length*2,unsafe:report.unsafePlacements},null,2));
gltf.scene.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
if(report.unsafePlacements.length)process.exitCode=1;
