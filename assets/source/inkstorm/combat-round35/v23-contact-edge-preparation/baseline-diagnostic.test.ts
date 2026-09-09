import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { describe,it,expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { fixture,race,step,variants } from './geometry-fixture';

describe('V22 center fan source occlusion diagnostic',()=>{
 it.each(variants)('%s quantifies casing intersections at the existing center fan', name=>{
  const art=fixture(name),sim=race();for(let frame=1;frame<=932;frame++)step(sim,frame);
  const e=sim.state.entries[0]!,pose=art.cache.update(e.vehicle,e.galactic!.wreck.timer,sim.terrain);
  art.breakup.update(pose,e.galactic!.wreck.timer,sim.terrain);art.root.updateMatrixWorld(true);
  const f=pose.groundContact!.footprint!;
  const rear=art.damage.find(m=>m.name.includes('right-rear'))!;
  const body=new Matrix4().compose(pose.position,new Quaternion().setFromEuler(pose.rotation),new Vector3(1,1,1));
  const world=new Matrix4().multiplyMatrices(body,rear.matrixWorld),probe=new Mesh(rear.geometry,new MeshBasicMaterial({side:DoubleSide}));
  probe.matrixAutoUpdate=false;probe.matrix.copy(world);probe.updateMatrixWorld(true);
  const across=new Vector3(f.axis.z,0,-f.axis.x),ray=new Raycaster(),rows:unknown[]=[];
  let hidden=0,total=0;
  for(const along of[-.6,-.3,0,.3,.6])for(const height of[.35,.7,1.2]){
   const p=f.center.clone().addScaledVector(f.axis,along*f.halfLength);p.y+=height;
   const hits=[-1,1].map(sign=>{ray.set(p,across.clone().multiplyScalar(sign));return ray.intersectObject(probe,false)[0]?.distance??null;});
   if(hits.every(x=>x!==null))hidden++;total++;rows.push({along,height,hits});
  }
  const p=new Vector3(),position=rear.geometry.getAttribute('position');let min=Infinity,max=-Infinity;let left:number[]=[],right:number[]=[];
  for(let i=0;i<position.count;i++){
   p.fromBufferAttribute(position,i).applyMatrix4(world);const lateral=p.clone().sub(f.center).dot(across);
   if(lateral<min){min=lateral;left=p.toArray();}if(lateral>max){max=lateral;right=p.toArray();}
  }
  const out={name,frame:932,footprint:JSON.parse(JSON.stringify(f)),centerFanSamples:total,centerFanSamplesCasedOnBothSides:hidden,fullSourceLateralMin:min,fullSourceLateralMax:max,sourceLeft:left,sourceRight:right,rows};
  writeFileSync('assets/source/inkstorm/combat-round35/v23-contact-edge-preparation/baseline-'+name+'.json',JSON.stringify(out,null,2)+'\n');
  console.info('V22 center occlusion',JSON.stringify({name,hidden,total,min,max,halfWidth:f.halfWidth,left,right}));
  expect(hidden).toBeGreaterThan(0);probe.material.dispose();art.breakup.reset();
 });
});
