import fs from 'node:fs';
import crypto from 'node:crypto';
import {createServer} from 'vite';
import {Euler,Vector3,Group,Mesh,BufferGeometry,Float32BufferAttribute} from 'three';
const out='assets/source/inkstorm/combat-round35/wreck-pose-v1';
const server=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
try{
 const {RaceSimulation}=await server.ssrLoadModule('/src/game/race/RaceSimulation.ts');
 const {sampleTerrainHeight}=await server.ssrLoadModule('/src/render/terrain/terrainMath.ts');
 const race=new RaceSimulation({terrain:{heightAt:sampleTerrainHeight},seed:1229867859,totalLaps:1,countdownSeconds:3,competitionProfile:'time-trial'});
 const src='public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb',b=fs.readFileSync(src),len=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+len).toString()),binary=b.subarray(20+len+8);
 if(g.nodes.some(n=>n.matrix||n.translation||n.rotation||n.scale))throw Error('Source identity guard failed');
 const meshes=[];for(const node of g.nodes){if(node.mesh===undefined)continue;const points=[];for(const p of g.meshes[node.mesh].primitives){const a=g.accessors[p.attributes.POSITION],v=g.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=='VEC3'||a.sparse)throw Error('Unsupported position encoding');for(let i=0;i<a.count;i++){const off=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12);points.push(new Vector3(binary.readFloatLE(off),binary.readFloatLE(off+4),binary.readFloatLE(off+8)));}}meshes.push({name:node.name,points});}
 const {WreckVisualPoseCache}=await server.ssrLoadModule('/src/render/combat/WreckVisualPose.ts');
 const root=new Group(),rigidMeshes=meshes.map(m=>{const mesh=new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(m.points.flatMap(p=>p.toArray()),3)));root.add(mesh);return mesh;});
 const cache=new WreckVisualPoseCache();cache.refresh(root,rigidMeshes,1);
 const frames=new Set([557,910,922,943,975,1010,1070,1153,1169]),rows=[],matches=[];const temp=new Vector3(),rotation=new Euler();
 const receipt=JSON.parse(fs.readFileSync('output/playwright/round35-combat-v9/receipt.json','utf8'));
 for(let frame=1;frame<=1169;frame++){
  race.step({brake:1,boost:frame>=558&&frame<=910});if(!frames.has(frame))continue;
  const entry=race.state.entries[0],state=entry.vehicle,time=frame/120,wrecked=entry.galactic.wreck.phase==='wrecked';
  const yaw=state.orientation.yaw+(wrecked?time*1.25:0),pitch=state.orientation.pitch+(wrecked?.34+Math.sin(time*5.1)*.16:0),roll=state.orientation.roll+state.orientation.bank+(wrecked?-.92+Math.sin(time*7.4)*.34:0);
  rotation.set(pitch,yaw,roll,'YXZ');const pose=wrecked?cache.update(state,entry.galactic.wreck.timer,race.terrain):null;if(pose)rotation.copy(pose.rotation);const stats=[];let min=Infinity,total=0,below=0;
  for(const mesh of meshes){let m=Infinity,low=0,point=null;for(const p of mesh.points){temp.copy(p).applyEuler(rotation).add(pose?.position??state.position);const terrain=race.terrain.heightAt(temp.x,temp.z),gap=temp.y-terrain;if(gap<m){m=gap;point={local:p.toArray(),world:temp.toArray(),terrainY:terrain};}if(gap<0)low++;}min=Math.min(min,m);total+=mesh.points.length;below+=low;stats.push({name:mesh.name,positionOccurrences:mesh.points.length,belowTerrain:low,minClearance:m,worstPoint:point});}
  const snapshot=receipt.cases[0].captures.find(c=>c.snapshot.simulationFrame===frame)?.snapshot;
  if(snapshot){const expected=snapshot.game.position,actual=[state.position.x,state.position.y,state.position.z];matches.push({frame,positionMaxError:Math.max(...expected.map((v,i)=>Math.abs(v-actual[i]))),yawError:Math.abs(snapshot.game.yaw-state.orientation.yaw),raceTimeError:Math.abs(snapshot.raceTime-race.state.raceTime)});}
  rows.push({frame,simulationTime:time,raceTime:race.state.raceTime,wreckPhase:entry.galactic.wreck.phase,position:{...state.position},authoritativeOrientation:{...state.orientation},displayEulerYXZ:[rotation.x,rotation.y,rotation.z],newPose:pose?{position:pose.position.toArray(),center:pose.center.toArray(),groundCorrection:pose.groundCorrection,supportCount:cache.supportPoints.length}:null,minVertexClearance:min,verticalLiftForMinimumPointClearance05:Math.max(0,.05-min),positionOccurrences:total,belowTerrain:below,meshes:stats});
 }
 if(matches.some(m=>m.positionMaxError>1e-8||m.yawError>1e-8||m.raceTimeError>1e-8))throw Error('Native repro mismatch');
 const result={scope:'Read-only CPU normal-input reproduction. All POSITION occurrences in actual admitted rigid GLB sampled against the instance race terrain at displayed root pose. Counts are vertex occurrences, not triangle/surface-area shares. This proves point penetration when negative; absence of negative vertices alone would not prove complete triangle/terrain clearance. No DCC/browser/runtime/source edits. No collision/physics change or visual acceptance claim.',source:{path:src,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')},inputs:{seed:1229867859,totalLaps:1,countdownSeconds:3,competitionProfile:'time-trial',brake:'all frames',boost:'558..910 inclusive'},snapshotMatches:matches,rows};
 fs.writeFileSync(out+'/actual-geometry-ground-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({matches,rows:rows.map(r=>({frame:r.frame,phase:r.wreckPhase,min:r.minVertexClearance,below:r.belowTerrain,total:r.positionOccurrences,correction:r.newPose?.groundCorrection,support:r.newPose?.supportCount,lift:r.verticalLiftForMinimumPointClearance05}))},null,2));
}finally{await server.close();}
