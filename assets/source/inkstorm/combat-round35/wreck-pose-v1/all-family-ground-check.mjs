import fs from 'node:fs';
import crypto from 'node:crypto';
import {createServer} from 'vite';
import {Group,Mesh,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
const out='assets/source/inkstorm/combat-round35/wreck-pose-v1';
const server=await createServer({configFile:false,root:process.cwd(),server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'error'});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
try{
 const {RaceSimulation}=await server.ssrLoadModule('/src/game/race/RaceSimulation.ts');
 const {sampleTerrainHeight}=await server.ssrLoadModule('/src/render/terrain/terrainMath.ts');
 const {WreckVisualPoseCache}=await server.ssrLoadModule('/src/render/combat/WreckVisualPose.ts');
 const art=[];
 for(const name of ['teemto-hero-open-v2','sebulba-hero','polwo-hero-v1','blockrunner-hero-v1']){
  const path=`public/assets/inkstorm/vehicles/${name}.glb`,data=fs.readFileSync(path),jsonSize=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+jsonSize)),binary=data.subarray(28+jsonSize),root=new Group(),meshes=[];
  for(const node of gltf.nodes){if(node.mesh===undefined)continue;if(node.matrix||node.translation||node.rotation||node.scale)throw Error('Nonidentity mesh node');
   for(const p of gltf.meshes[node.mesh].primitives){const a=gltf.accessors[p.attributes.POSITION],v=gltf.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=='VEC3'||a.sparse)throw Error('Unsupported position');const values=new Float32Array(a.count*3);
    for(let i=0;i<a.count;i++){const off=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12);for(let axis=0;axis<3;axis++)values[i*3+axis]=binary.readFloatLE(off+axis*4);}
    const mesh=new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(values,3)));root.add(mesh);meshes.push(mesh);}}
  const cache=new WreckVisualPoseCache();cache.refresh(root,meshes,1);art.push({name,source:{path,bytes:data.length,sha256:sha(data)},root,meshes,cache});
 }
 const race=new RaceSimulation({terrain:{heightAt:sampleTerrainHeight},seed:1229867859,totalLaps:1,countdownSeconds:3,competitionProfile:'time-trial'}),rows=[],sample=new Vector3();
 const frames=new Set([...Array.from({length:21},(_,i)=>910+i*12),943,975,1010,1070,1153]);
 for(let frame=1;frame<=1153;frame++){
  race.step({brake:1,boost:frame>=558&&frame<=910});if(!frames.has(frame))continue;
  const entry=race.state.entries[0],before=JSON.stringify(race.state);
  for(const {name,meshes,cache} of art){let queries=0;const pose=cache.update(entry.vehicle,entry.galactic.wreck.timer,{heightAt:(x,z)=>{queries++;return race.terrain.heightAt(x,z);}});let minimum=Infinity,below=0,total=0;
   for(const mesh of meshes){const points=mesh.geometry.getAttribute('position');total+=points.count;for(let i=0;i<points.count;i++){sample.fromBufferAttribute(points,i).applyEuler(pose.rotation).add(pose.position);const gap=sample.y-race.terrain.heightAt(sample.x,sample.z);minimum=Math.min(minimum,gap);below+=Number(gap<0);}}
   rows.push({frame,name,remaining:entry.galactic.wreck.timer,position:pose.position.toArray(),rotationYXZ:[pose.rotation.x,pose.rotation.y,pose.rotation.z],center:pose.center.toArray(),groundCorrection:pose.groundCorrection,minimumPositionClearance:minimum,belowTerrain:below,positionOccurrences:total,terrainQueries:queries,supportSamples:cache.supportPoints.length});
  }
  if(before!==JSON.stringify(race.state))throw Error('Authoritative mutation');
 }
 const summary=art.map(({name,source,cache,meshes})=>{const a=rows.filter(r=>r.name===name);return{name,source,meshes:meshes.length,localBounds:{min:cache.localBounds.min.toArray(),max:cache.localBounds.max.toArray()},localCenter:cache.localCenter.toArray(),radius:cache.pose.radius,supportSamples:cache.supportPoints.length,checkpoints:a.length,positionOccurrences:a[0].positionOccurrences,minimumClearance:Math.min(...a.map(r=>r.minimumPositionClearance)),maximumGroundLift:Math.max(...a.map(r=>r.groundCorrection)),maximumGroundDrop:-Math.min(...a.map(r=>r.groundCorrection)),maximumQueries:Math.max(...a.map(r=>r.terrainQueries)),allSampledPositionsClear:a.every(r=>r.belowTerrain===0)};});
 const result={scope:'Actual rigid POSITION occurrences from all four admitted GLBs transformed at exact native V9 state checkpoints. Uses current renderer-only helper. No browser/Blender/render. Authoritative race state is unchanged by every helper call. Other three families are geometric substitution checks on Teemto native trajectory, not independent driving runs. The bounded support approximation and positive vertex tests do not establish continuous triangle/terrain collision or visual acceptance.',sourceModule:{path:'src/render/combat/WreckVisualPose.ts',sha256:sha(fs.readFileSync('src/render/combat/WreckVisualPose.ts'))},checkpoints:frames.size,summary,rows};
 fs.writeFileSync(`${out}/all-family-ground-check.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(summary,null,2));if(summary.some(s=>!s.allSampledPositionsClear))process.exitCode=1;
}finally{await server.close();}
