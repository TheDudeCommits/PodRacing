import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {Vector3,Matrix4,Quaternion,Ray} from 'three';
const folder='assets/source/inkstorm/fork-entry-round30',plan=JSON.parse(await readFile(`${folder}/island-contact-plan.json`)),geometry=JSON.parse(await readFile(`${folder}/foundation-geometry.json`)),island=plan.island;
const req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json'),{NodeIO,Document}=await import(pathToFileURL(req.resolve('@gltf-transform/core')).href),io=new NodeIO();
const bytes=await readFile(plan.sourceFile),doc=await io.readBinary(bytes),mesh=doc.getRoot().listMeshes()[0].listPrimitives()[0],P=mesh.getAttribute('POSITION'),I=mesh.getIndices().getArray();
const matrix=new Matrix4().compose(new Vector3(island.x,island.grounding.baseY,island.z),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),island.yaw),new Vector3(island.sx,island.grounding.scaleY,island.sz));
const triangles=Array.from({length:I.length/3},(_,i)=>Array.from(I.slice(i*3,i*3+3),j=>new Vector3(...P.getElement(j,[])).applyMatrix4(matrix)));
const rows=[];
for(const contact of plan.contacts){
 const points=[];for(let i=0;i<geometry.position.length;i+=3){const p=geometry.position.slice(i,i+3);if(Math.hypot(p[0]-contact.inside[0],p[2]-contact.inside[2])<.002)points.push(p);}
 points.sort((a,b)=>b[1]-a[1]);const endpoint=points[0],start=new Vector3(contact.start[0],endpoint[1],contact.start[2]),target=new Vector3(...endpoint),direction=target.clone().sub(start).normalize(),length=target.distanceTo(start),ray=new Ray(start,direction),hits=[];
 for(const triangle of triangles){const hit=ray.intersectTriangle(...triangle,false,new Vector3());if(hit)hits.push(hit.distanceTo(start));}
 hits.sort((a,b)=>a-b);const unique=hits.filter((h,i)=>i===0||Math.abs(h-hits[i-1])>.0001),before=unique.filter(h=>h<length-.001),inside=before.length%2===1;
 rows.push({row:contact.row,actualTopEndpoint:endpoint,sourceCrossingsBeforeEndpoint:before.length,insideActualSource:inside,metresPastLastCrossing:before.length?length-before.at(-1):null});
}
const report={status:rows.every(r=>r.insideActualSource)?'PASS':'FAIL',scope:'CPU ray parity against the actual placed island source, at final Float32 candidate top endpoints',sourceSha256:createHash('sha256').update(bytes).digest('hex'),rows};
await writeFile(`${folder}/island-contact-audit.json`,JSON.stringify(report,null,2)+'\n');
const out=new Document(),buffer=out.createBuffer(),prim=out.createPrimitive();for(const [name,key] of [['POSITION','position'],['NORMAL','normal'],['COLOR_0','color']])prim.setAttribute(name,out.createAccessor().setType('VEC3').setArray(new Float32Array(geometry[key])).setBuffer(buffer));
prim.setMaterial(out.createMaterial('Existing sandstone shader stand-in for source inspection').setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.9));out.createScene('CPU source-only fork foundation').addChild(out.createNode('Closed causeway and source-contact island buttress').setMesh(out.createMesh().addPrimitive(prim)));
const glb=await io.writeBinary(out);await writeFile(`${folder}/fork-foundation.glb`,glb);console.log(JSON.stringify({...report,sourceGlbBytes:glb.byteLength,sourceGlbSha256:createHash('sha256').update(glb).digest('hex')},null,2));
