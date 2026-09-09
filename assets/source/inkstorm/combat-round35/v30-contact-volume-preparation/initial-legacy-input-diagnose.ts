import { Matrix4, Quaternion, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { prepareHero, disposeSources, race, step } from '../settled-pose-diagnosis/fixture';
import { GalacticEffectsView } from '/Users/amir/Projects/PodRacing/src/render/galactic/GalacticEffectsView';
import { sampleTerrainHeight } from '/Users/amir/Projects/PodRacing/src/render/terrain/terrainMath';
const art=await prepareHero(),sim=race(),fx=new GalacticEffectsView();
const native=JSON.parse(readFileSync('output/playwright/round35-combat-v29/solo-chase-observations.json','utf8'));
const firstNative=native.samples.find((s:any)=>s.wreck==='wrecked');
const matrix=new Matrix4(),center=new Vector3(),rotation=new Quaternion(),scale=new Vector3();
const field=(x:number,z:number)=>sampleTerrainHeight(x,z)+(sim.courseGulfField?.sampleOffset(x,z)??0)+(sim.pitPadField?.sampleOffset(x,z)??0);
const meshHeight=(x:number,z:number,eye:Vector3)=>{
 const step=1.5,gx=(x-eye.x+96)/step,gz=(z-eye.z+96)/step,ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
 const ax=eye.x-96+ix*step,az=eye.z-96+iz*step,a=field(ax,az),c=field(ax+step,az+step);
 return v<=u?a*(1-u)+field(ax+step,az)*(u-v)+c*v:a*(1-v)+field(ax,az+step)*(v-u)+c*u;
};
const solidAngle=(a:Vector3,b:Vector3,c:Vector3,eye:Vector3)=>{
 const aa=a.clone().sub(eye).normalize(),bb=b.clone().sub(eye).normalize(),cc=c.clone().sub(eye).normalize();
 return 2*Math.atan2(Math.abs(aa.dot(bb.clone().cross(cc))),1+aa.dot(bb)+bb.dot(cc)+cc.dot(aa));
};
const out:any={scope:'One actual hero source bind, fixed native harness input reconstruction to first eligible contact; two FX sheets at six fixed native phases. Recorded eye and native sample frame clock; no camera quaternion/pixel reconstruction, no GPU float emulation or casing occlusion ray test. Uniform grid tests sheet-versus-terrain only.',clockMap:'Source cut frame267 PTS10.68 is paired with first observed native wreck wall10667.3; other native samples chosen nearest that wall offset. This approximate map carries one native-sample/capture-frame uncertainty. FX age uses recorded simulation frame /120, not wall PTS or cueAge.',rows:[]};
try{
 let born=false;
 for(let frame=1;frame<=925;frame++){
  step(sim,frame);const entry=sim.state.entries[0]!;
  if(entry.galactic?.wreck.phase!=='wrecked')continue;
  const remaining=entry.galactic.wreck.timer,pose=art.cache.update(entry.vehicle,remaining,sim.terrain);art.breakup.update(pose,remaining,sim.terrain);
  if(!pose.groundContact||born)continue;
  const c=pose.groundContact,f=c.footprint!;born=true;
  const match=native.samples.reduce((a:any,b:any)=>Math.abs(a.frame-frame)<=Math.abs(b.frame-frame)?a:b);
  out.birth={frame,remaining,elapsed:2.15-remaining,simulationPosition:entry.vehicle.position,nativeNearest:{frame:match.frame,wallMs:match.wallMs,position:match.position},positionDifference:new Vector3(entry.vehicle.position.x,entry.vehicle.position.y,entry.vehicle.position.z).distanceTo(new Vector3(...match.position)),witness:c.position.toArray(),direction:c.direction.toArray(),footprint:{center:f.center.toArray(),axis:f.axis.toArray(),halfLength:f.halfLength,halfWidth:f.halfWidth,edges:f.edges?.map(e=>e.toArray())}};
  fx.emitWreckGroundContact(0,c.position,c.direction,f);break;
 }
 if(!born)throw Error('No first contact by925');
 for(const [name,sourceFrame] of [['entry',267],['early-impact',268],['hold',280],['debris-return',293],['settled',313],['recovery',339]] as const){
  const targetWall=firstNative.wallMs+(sourceFrame-267)*40,s=native.samples.reduce((a:any,b:any)=>Math.abs(a.wallMs-targetWall)<=Math.abs(b.wallMs-targetWall)?a:b);
  const age=(s.frame-out.birth.frame)/120,eye=new Vector3(...s.cameraPosition);fx.update(age);
  const row:any={phase:name,sourceFrame,sourcePTS:sourceFrame*.04,native:{frame:s.frame,wallMs:s.wallMs,cameraPosition:s.cameraPosition,position:s.position,wreck:s.wreck},effectAge:age,plates:[]};
  for(let i=0;i<fx.explosionPlates.count;i++){
   fx.explosionPlates.getMatrixAt(i,matrix);matrix.decompose(center,rotation,scale);
   const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>new Vector3(x,y,0).applyMatrix4(matrix));
   const normal=new Vector3(0,0,1).applyQuaternion(rotation),eyeDir=eye.clone().sub(center).normalize();
   const surface=fx.explosionPlates.geometry.getAttribute('aEffectSurface'),normalCos=Math.abs(normal.dot(eyeDir));
   let minGap=Infinity,maxGap=-Infinity,below=0,above=0,maxInterpolation=0,maxCheb=0,offsetMin=Infinity,offsetMax=-Infinity;
   const samples=[];
   for(let iz=0;iz<9;iz++)for(let ix=0;ix<17;ix++){
    const localX=-1+ix/8,localY=-1+iz/4,p=new Vector3(localX,localY,0).applyMatrix4(matrix),physical=sim.terrain.heightAt(p.x,p.z),beauty=meshHeight(p.x,p.z,eye),gap=p.y-beauty;
    minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);if(gap<0)below++;else above++;
    maxInterpolation=Math.max(maxInterpolation,Math.abs(beauty-physical));maxCheb=Math.max(maxCheb,Math.abs(p.x-eye.x),Math.abs(p.z-eye.z));
    const offset=field(p.x,p.z)-sampleTerrainHeight(p.x,p.z);offsetMin=Math.min(offsetMin,offset);offsetMax=Math.max(offsetMax,offset);
    samples.push({localX,localY,gap});
   }
   row.plates.push({kind:surface.getX(i),opacity:surface.getY(i),center:center.toArray(),corners:corners.map(c=>c.toArray()),fullLocalWidth:2*scale.x,fullLocalLength:2*scale.y,worldVerticalRise:corners[2]!.y-corners[1]!.y,quadArea:4*scale.x*scale.y,faceCosine:normalCos,solidAngleSteradians:solidAngle(corners[0]!,corners[1]!,corners[2]!,eye)+solidAngle(corners[0]!,corners[2]!,corners[3]!,eye),distanceToEye:center.distanceTo(eye),sampledFloor:{grid:[17,9],below,above,fractionBelow:below/(below+above),minGap,maxGap,maxMeshVsPhysics:maxInterpolation,maxCameraChebyshev:maxCheb,courseOffsetRange:[offsetMin,offsetMax]},samples});
  }
  out.rows.push(row);
 }
}finally{fx.dispose();art.breakup.reset();disposeSources();}
export default out;
