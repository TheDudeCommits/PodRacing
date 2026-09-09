import { DoubleSide, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3 } from 'three';
import { prepareHero,race,step,disposeSources } from './fixture';
const nativeRoot=new Vector3(18600.146944912514,-10.401951432896295,15.075286382043856);
const camera=new Vector3(18632.55712714071,-5.134568943024893,43.17454624485601);
const art=await prepareHero(),sim=race();
for(let frame=1;frame<=1067;frame++)step(sim,frame);
const e=sim.state.entries[0]!,sourcePosition=new Vector3(e.vehicle.position.x,e.vehicle.position.y,e.vehicle.position.z);
const sourcePositionError=sourcePosition.distanceTo(nativeRoot);
// Use the recorded base position. Orientation is reconstructed from the fixture;
// the original native receipt does not record its complete quaternion.
e.vehicle.position.x=nativeRoot.x;e.vehicle.position.y=nativeRoot.y;e.vehicle.position.z=nativeRoot.z;
const pose=art.cache.update(e.vehicle,e.galactic!.wreck.timer,sim.terrain);
art.breakup.update(pose,e.galactic!.wreck.timer,sim.terrain);art.root.updateMatrixWorld(true);
const body=new Matrix4().compose(pose.position,new Quaternion().setFromEuler(pose.rotation),new Vector3(1,1,1));
const proxies:Mesh[]=[];const material=new MeshBasicMaterial({side:DoubleSide});
for(const mesh of art.all)if(mesh.visible){
 const proxy=new Mesh(mesh.geometry,material);proxy.name=mesh.name;proxy.matrixAutoUpdate=false;
 proxy.matrix.multiplyMatrices(body,mesh.matrixWorld);proxy.updateMatrixWorld(true);proxies.push(proxy);
}
const ray=new Raycaster(),direction=new Vector3();let visibilityRays=0;
function visible(point:Vector3){
 direction.copy(point).sub(camera);const distance=direction.length();direction.multiplyScalar(1/distance);
 ray.set(camera,direction);ray.near=0;ray.far=distance-.015;visibilityRays++;
 const hit=ray.intersectObjects(proxies,false)[0];
 return {visibleFromRecordedCamera:!hit,occluder:hit?.object.name??null,occluderMetresBeforePoint:hit?distance-hit.distance:null};
}
const reports:unknown[]=[];const p=new Vector3(),a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3(),delta=new Vector3();
for(const proxy of proxies.filter(m=>m.name==='teemto-engine-left-body'||m.name.includes('damage-right'))){
 const position=proxy.geometry.getAttribute('position'),indices=proxy.geometry.index;
 const world=new Float64Array(position.count*3),gaps=new Float64Array(position.count);
 let minGap=Infinity,minimumIndex=0,near=0,zMin=Infinity,zMax=-Infinity;
 for(let i=0;i<position.count;i++){
  p.fromBufferAttribute(position,i).applyMatrix4(proxy.matrixWorld);world[i*3]=p.x;world[i*3+1]=p.y;world[i*3+2]=p.z;
  const gap=p.y-sim.terrain.heightAt(p.x,p.z);gaps[i]=gap;
  if(gap<minGap){minGap=gap;minimumIndex=i;}if(gap<=.45)near++;
  zMin=Math.min(zMin,position.getZ(i));zMax=Math.max(zMax,position.getZ(i));
 }
 const candidates:Array<Array<{triangle:number,rankGap:number,point:number[]}>>=Array.from({length:6},()=>[]);
 const count=indices?.count??position.count;
 for(let tri=0;tri<count;tri+=3){
  const ia=indices?indices.getX(tri):tri,ib=indices?indices.getX(tri+1):tri+1,ic=indices?indices.getX(tri+2):tri+2;
  a.fromArray(world,ia*3);b.fromArray(world,ib*3);c.fromArray(world,ic*3);
  normal.copy(b).sub(a).cross(delta.copy(c).sub(a));p.copy(a).add(b).add(c).multiplyScalar(1/3);
  if(normal.dot(delta.copy(camera).sub(p))<=0)continue;
  const z=(position.getZ(ia)+position.getZ(ib)+position.getZ(ic))/3;
  const bin=Math.min(5,Math.floor((z-zMin)/(zMax-zMin)*6));
  const rankGap=(gaps[ia]!+gaps[ib]!+gaps[ic]!)/3;
  const list=candidates[bin]!;
  if(list.length===2&&rankGap>=list[1]!.rankGap)continue;
  list.push({triangle:tri/3,rankGap,point:p.toArray()});list.sort((x,y)=>x.rankGap-y.rankGap);if(list.length>2)list.pop();
 }
 const minimumPoint=new Vector3().fromArray(world,minimumIndex*3);
 const sections=candidates.map((list,index)=>({section:index,sourceZRange:[zMin+(zMax-zMin)*index/6,zMin+(zMax-zMin)*(index+1)/6],
  candidates:list.map(x=>{p.fromArray(x.point);return{...x,actualGap:p.y-sim.terrain.heightAt(p.x,p.z),...visible(p)};})}));
 const frontVisibleGaps=sections.flatMap(s=>s.candidates.filter(x=>x.visibleFromRecordedCamera).map(x=>x.actualGap));
 const axis=new Vector3(0,0,1).transformDirection(proxy.matrixWorld).setY(0).normalize();
 const side=new Vector3(axis.z,0,-axis.x),center=new Vector3().setFromMatrixPosition(proxy.matrixWorld);
 const cameraHorizontal=camera.clone().sub(center).setY(0).normalize();
 reports.push({mesh:proxy.name,vertices:position.count,triangles:count/3,worldMatrix:proxy.matrixWorld.elements,
  minimumGap:minGap,minimumPoint:minimumPoint.toArray(),minimumPointVisibility:visible(minimumPoint),nearGroundVertexCount:near,
  cameraAlongAxis:cameraHorizontal.dot(axis),cameraAcrossAxis:cameraHorizontal.dot(side),
  verifiedFrontLowerSurfaceCandidates:frontVisibleGaps.length,frontLowerGapRange:frontVisibleGaps.length?[Math.min(...frontVisibleGaps),Math.max(...frontVisibleGaps)]:null,sections});
}
const offset=camera.clone().sub(nativeRoot),horizontal=offset.clone().setY(0).normalize();
const result={scope:'One reconstructed hero pose at frame1067, three source meshes; actual recorded camera origin; vehicle-only ray occlusion, no camera orientation/projection, scenery or GPU readback.',
 nativeFrame:1067,nativeWallMs:12316.8,phaseImage:'output/playwright/round35-combat-v22/temporal-review/settled-pts12.24.png',
 clockAssociation:'Approximate: first visible cut PTS10.40 vs native estimated wall10467.1ms. This is the closest raw sample, not an exact image/pose timestamp match.',
 nativeRoot:nativeRoot.toArray(),camera:camera.toArray(),cameraHorizontalDirection:horizontal.toArray(),cameraElevationFromRootDegrees:Math.atan2(offset.y,Math.hypot(offset.x,offset.z))*180/Math.PI,
 reconstructedBasePosition:sourcePosition.toArray(),sourcePositionErrorBeforeRecordedPositionOverride:sourcePositionError,
 reconstructedOrientation:e.vehicle.orientation,remaining:e.galactic!.wreck.timer,renderedParentPosition:pose.position.toArray(),renderedParentEuler:pose.rotation.toArray(),
 sourceVersion:'V23 source has the identical V22 engine transforms; V23 adds only cosmetic edge roots. No native quaternion was recorded.',
 visibilityMethod:'Full source vertex clearance; each of six longitudinal bins selects the two lowest mean-gap camera-facing triangle centroids. Their exact terrain gaps and line of sight are checked against all visible vehicle meshes. Unselected surfaces and scenery can limit conclusions.',
 visibilityRays,reports};
material.dispose();art.breakup.reset();disposeSources();
export default result;
