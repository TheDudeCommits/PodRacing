import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createProceduralPodraceCourse } from '../../../../src/game/race/course';
import { CourseGulfField } from '../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';
const dir='assets/source/inkstorm/pit-access-round30';
const pads=JSON.parse(readFileSync('assets/source/inkstorm/pit-pad-round29/district-extension/receipt.json','utf8')).reports[0].pads;
const saved=JSON.parse(readFileSync('assets/source/inkstorm/launch-composition-round28/candidate-field.json','utf8'));
const hashes:any[]=[];
const gulf=new CourseGulfField(saved.grids.map((g:any)=>{const b=readFileSync('assets/source/inkstorm/launch-composition-round28/'+g.filename);const actual=createHash('sha256').update(b).digest('hex');if(actual!==g.sha256)throw Error('gulf changed');hashes.push({name:g.name,sha256:actual});return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}),saved.launchProfile);
const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const raw=(x:number,z:number)=>sampleTerrainHeight(x,z)+gulf.sampleOffset(x,z);
const world=(p:any,x:number,z:number)=>[p.centerX+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),p.centerZ-x*Math.sin(p.yaw)+z*Math.cos(p.yaw)];
const clear=(x:number,z:number)=>{const p=course.projectPoint(x,z);return p.distanceToCenter-p.width;};
const perimeter=(p:any)=>{let min=Infinity;for(let i=0;i<=200;i++){const t=i/200;for(const [x,z]of[[-p.halfX+2*p.halfX*t,-p.halfZ],[-p.halfX+2*p.halfX*t,p.halfZ],[-p.halfX,-p.halfZ+2*p.halfZ*t],[p.halfX,-p.halfZ+2*p.halfZ*t]]){const [wx,wz]=world(p,x!,z!);min=Math.min(min,clear(wx!,wz!));}}return min;};
const distance=(a:any,b:any)=>{const corners=(p:any)=>[[-p.halfX,-p.halfZ],[p.halfX,-p.halfZ],[p.halfX,p.halfZ],[-p.halfX,p.halfZ]].map(([x,z])=>world(p,x!,z!));const ac=corners(a),bc=corners(b);let separation=-Infinity;for(const angle of[a.yaw,b.yaw])for(const [ax,az]of[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]]){const aa=ac.map(p=>p[0]!*ax!+p[1]!*az!),bb=bc.map(p=>p[0]!*ax!+p[1]!*az!);separation=Math.max(separation,Math.min(...bb)-Math.max(...aa),Math.min(...aa)-Math.max(...bb));}return separation;};
const modules=[];
for(const p of pads.filter((p:any)=>p.id.endsWith('215')||p.id.endsWith('216'))){
 for(const [bay,x,lo,hi]of[['left',-47,-71,-24.5],['middle',-5,-24.5,14],['right',39,14,79]] as const){
  const rays=[];for(const across of[-1.6,-.8,0,.8,1.6]){let out=0;for(;out<48;out+=.1){const [wx,wz]=world(p,x-4+across,30.25+out);if(clear(wx!,wz!)<=16.5)break;}const [wx,wz]=world(p,x-4+across,30.25+out);rays.push({across,out,x:wx,z:wz,height:raw(wx!,wz!),clearance:clear(wx!,wz!)});}
  const sorted=rays.map(r=>r.height).sort((a,b)=>a-b),floor=sorted[2]!+.15;
  let minBridgeRoadClearance=Infinity, protectedRawIntrusion=-Infinity, maxRawCut=0;for(const r of rays)for(let out=0;out<=r.out;out+=.25){const [wx,wz]=world(p,x-4+r.across,30.25+out);const clearance=clear(wx!,wz!), plane=floor+(r.height-floor)*out/r.out, intrusion=raw(wx!,wz!)-plane; minBridgeRoadClearance=Math.min(minBridgeRoadClearance,clearance); maxRawCut=Math.max(maxRawCut,intrusion); if(clearance<=10+Math.SQRT2+4)protectedRawIntrusion=Math.max(protectedRawIntrusion,intrusion);}
  const center=world(p,(lo+hi)/2-4,0);const modulePad={...p,centerX:center[0],centerZ:center[1],halfX:(hi-lo)/2};
  modules.push({parentId:p.id,bay,sourceXBounds:[lo,hi],sourceZBounds:[-32.5,28],sourceEntranceX:x,width:3.2,floorHeight:floor,anchorHeight:floor-2.45,rigidYShift:floor-(p.anchorHeight+2.45),rays,maxEndpointGrade:Math.max(...rays.map(r=>Math.abs(floor-r.height)/r.out)),oldMaxEndpointGrade:Math.max(...rays.map(r=>Math.abs(p.anchorHeight+2.45-r.height)/r.out)),corePerimeterMinimumRoadClearance:perimeter(modulePad),bridgeMinimumRoadClearance:minBridgeRoadClearance,protectedRawIntrusion,maxRawCut});
 }
}
const district=pads.find((p:any)=>p.id.endsWith('218')),moved={...district,centerX:district.centerX+16*Math.cos(district.yaw),centerZ:district.centerZ-16*Math.sin(district.yaw)};
const result={status:'source proposal; not implemented; endpoint and placement evidence only',gulfArrays:hashes,modules,districtMove:{id:district.id,localX:16,worldDelta:[moved.centerX-district.centerX,moved.centerZ-district.centerZ],newCenter:[moved.centerX,moved.centerZ],yaw:district.yaw,savedAnchor:district.anchorHeight,minimumRoadClearance:perimeter(moved),separatingAxisGapToOtherPads:pads.filter((p:any)=>p.id!==district.id).map((p:any)=>({id:p.id,before:distance(district,p),after:distance(moved,p)}))},invariants:{runtimeWrites:false,courseMutation:false,gulfMutation:false,samplerOrAllocationChange:false,fieldImplemented:false,terrainMeshValidated:false,assetPartitionValidated:false,physicsAccessImplemented:false},nextImplementation:{guard:'Keep literal-zero field support within road edge + 10 m shoulder + sqrt(2) atlas footprint + 4 m normal margin; do not inherit old 215/216 plateau offsets.',atlas:'Rebuild one bounded composite atlas from raw terrain plus gulf; all surviving slab ceilings symmetric. Existing 1 m R32F sampler and 1024 dimension / 524288 texel cap unchanged.'}};
writeFileSync(dir+'/proposal.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({modules:modules.map(m=>({id:m.parentId,bay:m.bay,floor:m.floorHeight,shift:m.rigidYShift,grade:m.maxEndpointGrade,old:m.oldMaxEndpointGrade,road:m.bridgeMinimumRoadClearance})),districtMove:result.districtMove},null,2));
