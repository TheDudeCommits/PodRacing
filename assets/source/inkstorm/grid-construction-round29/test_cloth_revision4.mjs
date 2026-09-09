/** Actual GLB regression: thin cloth envelope, repaired colors, closed outward skins, and exact non-cloth preservation. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {Ray,Vector3} from 'three';
const stage=path.dirname(fileURLToPath(import.meta.url)),req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(req.resolve('@gltf-transform/core')).href),io=new NodeIO();
const sha=b=>createHash('sha256').update(b).digest('hex'),key=p=>p.map(v=>v.toFixed(4)).join(',');
async function load(rel){const bytes=await readFile(path.join(stage,rel)),doc=await io.readBinary(bytes),p=doc.getRoot().listMeshes()[0].listPrimitives()[0],ix=p.getIndices().getArray(),tris=[];
 for(let i=0;i<ix.length;i+=3){const ids=Array.from(ix.subarray(i,i+3));tris.push({p:ids.map(v=>p.getAttribute('POSITION').getElement(v,[])),n:ids.map(v=>p.getAttribute('NORMAL').getElement(v,[])),c:ids.map(v=>p.getAttribute('COLOR_0').getElement(v,[]))});}return{sha:sha(bytes),tris};}
const specs={
 'pit-complex':[[-48,-12.1,33.6,10,16.65,0,'cobalt'],[-6,-11.1,28.56,10,14.1,0,'coral'],[38,-12.1,38.64,12,19.2,0,'cobalt']],
 'pit-district':[[-39.4,3,30.69,11,11,0,'cobalt'],[-2.4,7,32.55,14,16,11,'coral'],[37.6,0,30.69,11,12.8,22,'cobalt'],[-17,9,44,14,26,39,'coral']]
};
const paint={cobalt:[.095,.21,.32],coral:[.80,.255,.12],cream:[.84,.65,.40],rust:[.43,.13,.065]};
const oldStarts={'pit-complex':1188,'pit-district':2704,'foundry-gantry':0},newStarts={'pit-complex':1188,'pit-district':2320,'foundry-gantry':0};
const reports=[],preservation=[];
for(const family of ['pit-complex','pit-district','foundry-gantry']){
 const now=await load(family+'-overlay.glb'),old=await load('versions/v3-thick-cloth/'+family+'-overlay.glb');
 const currentNoncloth=now.tris.slice(newStarts[family]),oldNoncloth=old.tris.slice(oldStarts[family]);
 assert.deepEqual(currentNoncloth,oldNoncloth,family+' equipment/fixtures/gantry changed');
 preservation.push({family,unchangedTriangles:currentNoncloth.length,trianglePositionNormalColorSha256:sha(JSON.stringify(currentNoncloth)),oldOverlaySha256:old.sha,currentOverlaySha256:now.sha});
 if(!specs[family])continue;
 const predecessor=await load('predecessors/'+family+'.glb'),isPit=family==='pit-complex',nx=isPit?8:12,ny=isPit?5:7;
 for(const [x,y,w,d,h,seed,basePaint]of specs[family]){
  const base=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,z=isPit?h-2.5*v-2.2*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.7*Math.sin(u*10)*v:h-2.2*v-2.4*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+.45*Math.sin(u*15+seed)*v;base.push([x+(u-.5)*w,z,-y+v*d]);}
  const find=p=>base.findIndex(q=>q.every((v,k)=>Math.abs(v-p[k])<.0002));
  const onSkin=p=>base.findIndex(q=>Math.abs(q[0]-p[0])<.0002&&Math.abs(q[2]-p[2])<.0002&&Math.abs(Math.abs(q[1]-p[1])-.015)<.0002);
  const shell=now.tris.filter(t=>t.p.every(p=>onSkin(p)>=0)),original=predecessor.tris.filter(t=>t.p.every(p=>find(p)>=0));
  assert.equal(shell.length,nx*ny*4+(nx+ny)*4);assert.equal(original.length,nx*ny*(isPit?2:4));
  const top=shell.filter(t=>t.p.every(p=>p[1]>base[onSkin(p)][1])),bottom=shell.filter(t=>t.p.every(p=>p[1]<base[onSkin(p)][1]));
  assert.equal(top.length,nx*ny*2);assert.equal(bottom.length,nx*ny*2);
  const edges=new Map();let volume=0;const center=new Vector3(x,h,-y);
  for(const t of shell){const [a,b,c]=t.p.map(p=>new Vector3(...p).sub(center));volume+=a.dot(b.cross(c))/6;for(let i=0;i<3;i++){const a=key(t.p[i]),b=key(t.p[(i+1)%3]),id=[a,b].sort().join('|'),e=edges.get(id)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(id,e);}}
  assert([...edges.values()].every(e=>e[0]===2&&e[1]===0),'open or inward paired cloth edges');
  let extra=0,maxEnvelope=.03;for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let a=j*(nx+1)+i,twist=Math.abs(base[a][1]+base[a+nx+2][1]-base[a+1][1]-base[a+nx+1][1]);if(!isPit){extra+=w*d/(nx*ny)*twist/6;maxEnvelope=Math.max(maxEnvelope,.03+twist/2);}}
  const expectedVolume=w*d*.03+extra;assert(Math.abs(volume-expectedVolume)<.002);
  const hit=(surface,x,z,above)=>{const origin=new Vector3(x,h+(above?10:-10),z),ray=new Ray(origin,new Vector3(0,above?-1:1,0)),hits=[];for(const t of surface){const q=ray.intersectTriangle(...t.p.map(p=>new Vector3(...p)),true,new Vector3());if(q)hits.push(q.y);}return above?Math.max(...hits):Math.min(...hits);};
  let minTop=Infinity,minBottom=Infinity,samples=0;
  for(const t of original)for(const weights of [[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]]){const q=[0,1,2].map(k=>weights.reduce((sum,v,i)=>sum+v*t.p[i][k],0)),upper=hit(top,q[0],q[2],true),lower=hit(bottom,q[0],q[2],false);minTop=Math.min(minTop,upper-q[1]);minBottom=Math.min(minBottom,q[1]-lower);assert(upper-q[1]>.0149&&q[1]-lower>.0149,'predecessor not separated within actual FrontSide shell');samples++;}
  let creamTop=0,creamBottom=0;
  for(const [surface,factor]of [[top,1],[bottom,.68]])for(const t of surface){const ij=t.p.map(p=>onSkin(p)),i=Math.min(...ij.map(k=>k%(nx+1))),j=Math.min(...ij.map(k=>Math.floor(k/(nx+1))));let color=basePaint;if(isPit&&i>=6||!isPit&&(i+seed)%7===0)color='cream';let f=Math.sin((i*3+j*7+seed)*12.9898+78.233)*43758.5453;if(!isPit&&j>ny-3&&f-Math.floor(f)>.77)color='rust';const want=paint[color].map(v=>v*factor);assert(t.c.every(c=>c.every((v,k)=>Math.abs(v-want[k])<.00001)),`${family} repaired or underside color mismatch`);assert(t.n.every(n=>factor===1?n[1]>.3:n[1]<-.3),'cloth shading facing wrong side');if(color==='cream'){if(factor===1)creamTop++;else creamBottom++;}}
  if(isPit){assert.equal(creamTop,20);assert.equal(creamBottom,20);}
  reports.push({family,centerBlender:[x,y,h],shellTriangles:shell.length,nominalPerimeterThickness:.03,signedVolume:volume,expectedVolume,predecessorWarpEnvelopeVolume:extra,maximumInteriorThickness:maxEnvelope,frontSideSeparationSamples:samples,minimumUpperSeparation:minTop,minimumLowerSeparation:minBottom,creamTopTriangles:creamTop,creamBottomTriangles:creamBottom,undersideColorMultiplier:.68,closedDirectedEdges:true});
 }
}
const report={revision:4,cloth:reports,nonClothPreservation:preservation,status:'CPU PASS; actual-game cloth acceptance pending'};await writeFile(path.join(stage,'cloth-revision4-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
