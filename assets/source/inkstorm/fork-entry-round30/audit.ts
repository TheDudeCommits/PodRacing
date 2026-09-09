import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {createCourseGulfField} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {sampleBridgeSurface} from '../../../../src/game/race/bridgeSurface';
import {createInkstormForkFoundation} from './InkstormForkFoundation';
import {getInkstormLayout} from '../../../../src/game/race/inkstormLayout';
import {Vector3} from 'three';
const folder='assets/source/inkstorm/fork-entry-round30';
let field:ReturnType<typeof createCourseGulfField>=null;
const ground=(x:number,z:number)=>sampleTerrainHeight(x,z,field),course=createProceduralPodraceCourse({heightAt:ground},0x494e4b53);
field=createCourseGulfField(course);course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
const branch=course.branches.find(b=>b.elevated)!,geometry=createInkstormForkFoundation(branch,ground,course)!;
const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),color=geometry.getAttribute('color'),kinds=geometry.userData.triangleKinds as number[];
const canonical=course.getRenderData(2048).points;
function clearance(x:number,z:number){let value=Infinity;for(let i=0;i<canonical.length;i++){const p=canonical[i]!,q=canonical[(i+1)%canonical.length]!,dx=q.x-p.x,dz=q.z-p.z,t=Math.max(0,Math.min(1,((x-p.x)*dx+(z-p.z)*dz)/Math.max(1e-8,dx*dx+dz*dz)));value=Math.min(value,Math.hypot(x-p.x-dx*t,z-p.z-dz*t)-Math.max(p.width,q.width));}return value;}
const orientations=new Map<string,number>();
const volumes=[0,0];
const edgeCounts=new Map<string,number>(),key=(p:Vector3)=>[p.x,p.y,p.z].map(v=>v.toFixed(4)).join(',');
const a=new Vector3(),b=new Vector3(),c=new Vector3(),center=new Vector3(),cross=new Vector3();
let degenerate=0,illegalRoadSamples=0,maxRoadPenetration=-Infinity,minWingMainClearance=Infinity,maxDeckPenetration=-Infinity,topUp=0,topDown=0;
const bad:any[]=[];
for(let t=0;t<pos.count/3;t++){
 a.fromBufferAttribute(pos,t*3);b.fromBufferAttribute(pos,t*3+1);c.fromBufferAttribute(pos,t*3+2);cross.subVectors(b,a).cross(new Vector3().subVectors(c,a));if(cross.lengthSq()<1e-12)degenerate++;
 for(const [p,q]of [[a,b],[b,c],[c,a]]){const x=key(p!),y=key(q!),edge=x<y?x+'|'+y:y+'|'+x;edgeCounts.set(edge,(edgeCounts.get(edge)??0)+1);orientations.set(edge,(orientations.get(edge)??0)+(x<y?1:-1));}
 const origin=new Vector3(18400,0,-700);volumes[kinds[t]]+=a.clone().sub(origin).dot(b.clone().sub(origin).cross(c.clone().sub(origin)))/6;
 center.copy(a).add(b).add(c).multiplyScalar(1/3);
 if(cross.y>0)topUp++;else if(cross.y<0)topDown++;
 const probes:Vector3[]=[];
 for(let u=0;u<=6;u++)for(let v=0;v<=6-u;v++)probes.push(a.clone().multiplyScalar(u/6).addScaledVector(b,v/6).addScaledVector(c,1-u/6-v/6));
 for(const p of probes){
  const deck=sampleBridgeSurface(course.branches,p.x,p.z),terrain=ground(p.x,p.z),clear=clearance(p.x,p.z),physical=deck?Math.max(terrain,deck.height):terrain;
  if(deck)maxDeckPenetration=Math.max(maxDeckPenetration,p.y-deck.height);
  if(clear<-.1){maxRoadPenetration=Math.max(maxRoadPenetration,p.y-physical);if(p.y>physical+.08){illegalRoadSamples++;if(bad.length<10)bad.push({triangle:t,point:p.toArray(),physical,deck,clear});}}
  if(kinds[t]===1)minWingMainClearance=Math.min(minWingMainClearance,clear);
 }
}
const nonmanifold=[...edgeCounts.values()].filter(n=>n!==2).length;
let maxFootAboveGround=-Infinity,footSamples=0;
const footPoints=geometry.userData.footPoints as number[][];
for(let i=0;i<footPoints.length-2;i++)for(let k=0;k<=16;k++){const a=footPoints[i]!,b=footPoints[i+2]!,t=k/16,x=a[0]!+(b[0]!-a[0]!)*t,y=a[1]!+(b[1]!-a[1]!)*t,z=a[2]!+(b[2]!-a[2]!)*t;maxFootAboveGround=Math.max(maxFootAboveGround,y-ground(x,z));footSamples++;}
const inconsistentEdges=[...orientations.values()].filter(v=>v!==0).length;
const pads=getInkstormLayout(course).filter(p=>p.family==='pit-complex'||p.family==='pit-district');
let pitPadSupportClearance=Infinity;
for(const p of pads){const district=p.family==='pit-district',c=Math.cos(p.yaw),s=Math.sin(p.yaw),cx=district?p.x:p.x+4*p.sx*c-2.25*p.sz*s,cz=district?p.z:p.z-4*p.sx*s-2.25*p.sz*c,hx=(district?60:75)*p.sx,hz=(district?18:30.25)*p.sz;
 for(let i=0;i<pos.count;i++){const dx=pos.getX(i)-cx,dz=pos.getZ(i)-cz;pitPadSupportClearance=Math.min(pitPadSupportClearance,Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-hx),Math.max(0,Math.abs(dx*s+dz*c)-hz))-35);}}
const checks=[{name:'Pit grading field has no support in the candidate footprint',pass:pitPadSupportClearance>0,pitPadSupportClearance},{name:'Every foundation toe embeds in actual terrain',pass:maxFootAboveGround<-.60,maxFootAboveGround,contacts:geometry.userData.footPoints.length,samples:footSamples},{name:'Consistent outward solid orientation',pass:inconsistentEdges===0&&volumes.every(v=>v>0),inconsistentEdges,signedVolumes:volumes},{name:'Closed solids without boundary edges',pass:nonmanifold===0,nonmanifoldEdges:nonmanifold},{name:'Finite nondegenerate triangles',pass:degenerate===0&&Array.from(pos.array).every(Number.isFinite),degenerate},{name:'No new solid above a legal canonical road surface',pass:illegalRoadSamples===0,illegalRoadSamples,maxRoadPenetration,bad},{name:'No new solid intrudes through the legal elevated road surface',pass:maxDeckPenetration<-.20,maxDeckPenetration},{name:'Island connection clears canonical racing width by eight metres',pass:minWingMainClearance>=8,minWingMainClearance},{name:'Additional source geometry budget below4500triangles',pass:pos.count/3<4500,triangles:pos.count/3}];
const files=['src/game/race/course.ts','src/game/race/branches.ts','src/game/race/bridgeSurface.ts','src/game/race/CourseGulfField.ts','src/render/inkstorm/InkstormRoad.ts'];
const physicsHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const receipt={samplesPerTriangle:28,status:checks.every(c=>c.pass)?'PASS':'FAIL',scope:'CPU generated render-only fork foundation, road-space clearance and topology; no browser/GPU/Blender or in-world acceptance',checks,bounds:geometry.boundingBox,vertices:pos.count,triangles:pos.count/3,attributeBytes:pos.array.byteLength+normal.array.byteLength+color.array.byteLength,materialGroupsAdded:1,newRenderPasses:0,newTextures:0,maxDeckPenetration,triangleKinds:{causeway:kinds.filter(k=>k===0).length,islandButtress:kinds.filter(k=>k===1).length},physicsHashes,topUp,topDown};
writeFileSync(`${folder}/clearance-audit.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync(`${folder}/foundation-geometry.json`,JSON.stringify({position:Array.from(pos.array),normal:Array.from(normal.array),color:Array.from(color.array),triangleKinds:kinds})+'\n');
console.log(JSON.stringify(receipt,null,2));geometry.dispose();
