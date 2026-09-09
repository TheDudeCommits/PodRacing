/** Exact CPU segment tests on staged GLBs; no browser, Blender or runtime writes. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Ray, Vector3 } from 'three';
const here=path.dirname(fileURLToPath(import.meta.url)), stage=path.resolve(here,'../grid-construction-round29');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io=new NodeIO(), sha=b=>createHash('sha256').update(b).digest('hex');
const shared=JSON.parse(await readFile(path.join(stage,'task-light-anchors.json')));
const shapes=[{x:-39,w:33,back:13,h:12,i:0},{x:-2,w:35,back:17,h:17,i:1},{x:38,w:33,back:10,h:13.8,i:2}];
const key=p=>[p.x,p.y,p.z].map(x=>x.toFixed(3)).join(',');
const clothVertices=new Set();
for(const s of shapes) for(let j=0;j<=7;j++) for(let i=0;i<=12;i++) {
  const u=i/12,v=j/7,d=s.i===1?14:11;
  const z=s.h-1-2.2*v-2.4*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.45*Math.sin(u*15+s.i*11)*v;
  for(const offset of [0,.09,-.16]) clothVertices.add(key(new Vector3(s.x-.4+(u-.5)*s.w*.93,z+offset,-(s.back-10-v*d))));
}
async function loadTriangles(relative) {
  const full=path.join(stage,relative), bytes=await readFile(full),doc=await io.readBinary(bytes);
  const root=doc.getRoot(); assert(root.listNodes().every(n=>JSON.stringify(n.getMatrix())===JSON.stringify([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])));
  const p=root.listMeshes()[0].listPrimitives()[0],pos=p.getAttribute('POSITION'),idx=p.getIndices().getArray();
  const triangles=[];
  for(let i=0;i<idx.length;i+=3) {
    const points=Array.from(idx.subarray(i,i+3),j=>new Vector3(...pos.getElement(j,[])));
    triangles.push({points,index:i/3,cloth:points.every(p=>clothVertices.has(key(p)))});
  }
  return {file:relative,sha256:sha(bytes),triangles};
}
function cast(mesh,source,target) {
  const from=new Vector3(...source),to=new Vector3(...target),distance=from.distanceTo(to);
  const direction=to.clone().sub(from).normalize();
  const origin=from.clone().addScaledVector(direction,.02),ray=new Ray(origin,direction);
  const hits=[];
  for(const t of mesh.triangles) {
    const hit=ray.intersectTriangle(...t.points,false,new Vector3());
    if(!hit)continue;
    const d=hit.distanceTo(from);
    if(d>.025&&d<distance-.08)hits.push({distance:d,point:hit.toArray(),triangle:t.index,cloth:t.cloth});
  }
  hits.sort((a,b)=>a.distance-b.distance);
  return {clear:hits.length===0,firstHit:hits[0]??null,clothHits:hits.filter(h=>h.cloth).length};
}
const originals=await loadTriangles('predecessors/pit-district.glb');
const candidate=await loadTriangles('candidates/pit-district.glb');
const fixtureFree=await loadTriangles('versions/v1/candidates/pit-district.glb');
const families=[originals,candidate];
const results=[];
for(const s of shapes) {
  const current=shared.fixtures.find(f=>f.id===`district-task-${s.i+1}`).emitterGLB;
  const proposed=[s.x+3,Number((s.h-3.92).toFixed(2)),-(s.back-9)];
  const targets=[
    ['rear bench top',[s.x+2,2.45,-(s.back-3)]],
    ['original engine crown',[s.x-1,4.1,-(s.back-7)]],
    ['floor below emitter',[s.x+3,.4,-(s.back-9)]],
    ['left interior aisle',[s.x-6,.4,-(s.back-6)]],
    ['front apron',[s.x+3,.4,-(s.back-17)]],
    ['near front worker torso',[s.x+4,1.2,-(s.back-16)]],
  ];
  for(const [anchor,label] of [[current,'current-v2'],[proposed,'proposed-lower-service-rail']]) {
    for(const mesh of families) for(const [receiver,target] of targets) results.push({fixture:`district-task-${s.i+1}`,anchor:label,source:anchor,receiver,target,asset:mesh.file,...cast(mesh,anchor,target)});
  }
  // The new location is supported by a rail which already existed before v2.
  const from=new Vector3(...proposed),ray=new Ray(from,new Vector3(0,1,0));
  const heights=fixtureFree.triangles.map(t=>ray.intersectTriangle(...t.points,false,new Vector3())).filter(Boolean).map(p=>p.y).filter(y=>y>from.y+.01).sort((a,b)=>a-b);
  const underside=heights[0];
  assert(underside>=proposed[1]+.04 && underside<=proposed[1]+.36);
  results.push({fixture:`district-task-${s.i+1}`,anchor:'proposed-lower-service-rail',source:proposed,support:{asset:fixtureFree.file,railUnderside:underside,bodyTop:proposed[1]+.36,overlap:proposed[1]+.36-underside}});
}
const rayResults=results.filter(r=>!r.support);
const counts=Object.fromEntries(['current-v2','proposed-lower-service-rail'].map(anchor=>[anchor,{
  sourceClothBlocked:rayResults.filter(r=>r.anchor===anchor&&r.asset===originals.file&&r.clothHits>0).length,
  candidateClothBlocked:rayResults.filter(r=>r.anchor===anchor&&r.asset===candidate.file&&r.clothHits>0).length,
  candidateClear:rayResults.filter(r=>r.anchor===anchor&&r.asset===candidate.file&&r.clear).length,
  candidateOtherOccluded:rayResults.filter(r=>r.anchor===anchor&&r.asset===candidate.file&&!r.clear&&r.clothHits===0).length,
  testedReceivers:18,
}]));
const receipt={status:'EXACT_TRIANGLE_SOURCE_OCCLUSION_STUDY',assets:[originals,candidate,fixtureFree].map(({triangles,...meta})=>({...meta,triangles:triangles.length,clothTriangles:triangles.filter(t=>t.cloth).length})),counts,results,
  limitations:['Fixed sample rays are not exhaustive visibility proof','Double-sided physical occluders include the existing nonshadowed local-light limitation','Geometry snapshot paths/SHA256 identify the exact tested revision']};
await writeFile(path.join(here,'occlusion-audit.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,counts,supports:results.filter(r=>r.support),blockedExamples:rayResults.filter(r=>r.clothHits>0).slice(0,4)},null,2));
