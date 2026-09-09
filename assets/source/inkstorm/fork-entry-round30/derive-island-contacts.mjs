import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {Vector3,Matrix4,Quaternion,Ray} from 'three';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..'),data=JSON.parse(await readFile(path.join(here,'course-contact-study.json'))),island=data.dividers[0];
const req=createRequire('/tmp/inkstorm-rock-lod-tools/package.json'),{NodeIO}=await import(pathToFileURL(req.resolve('@gltf-transform/core')).href),io=new NodeIO();
const bytes=await readFile(path.join(root,'public/assets/inkstorm/canyon-buttress.glb')),doc=await io.readBinary(bytes),mesh=doc.getRoot().listMeshes()[0].listPrimitives()[0],P=mesh.getAttribute('POSITION'),I=mesh.getIndices().getArray();
const matrix=new Matrix4().compose(new Vector3(island.x,island.grounding.baseY,island.z),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),island.yaw),new Vector3(island.sx,island.grounding.scaleY,island.sz)),inverse=matrix.clone().invert();
const triangles=Array.from({length:I.length/3},(_,i)=>Array.from(I.slice(i*3,i*3+3),j=>new Vector3(...P.getElement(j,[])).applyMatrix4(matrix)));
const contacts=[];
for(let row=5;row<=10;row+=.5){const i=Math.floor(row),t=row-i,a=data.rows[i],b=data.rows[Math.min(i+1,data.rows.length-1)],x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t,right=new Vector3(a.rightX+(b.rightX-a.rightX)*t,0,a.rightZ+(b.rightZ-a.rightZ)*t).normalize(),width=a.width+(b.width-a.width)*t;
 const start=new Vector3(x,y-.45,z).addScaledVector(right,-width+.2),direction=new Vector3(island.x,start.y,island.z).sub(start).normalize(),ray=new Ray(start,direction),hits=[];
 for(let id=0;id<triangles.length;id++){const p=ray.intersectTriangle(...triangles[id],false,new Vector3());if(p&&p.distanceTo(start)>1)hits.push({id,distance:p.distanceTo(start),p});}
 hits.sort((a,b)=>a.distance-b.distance);if(!hits.length)continue;
 const hit=hits[0],inside=hit.p.clone().addScaledVector(direction,3);
 contacts.push({row,sourceTriangle:hit.id,firstContact:hit.p.toArray(),contactDistance:hit.distance,start:start.toArray(),inside:inside.toArray(),sourceLocalInside:inside.clone().applyMatrix4(inverse).toArray()});
}
const report={sourceFile:'public/assets/inkstorm/canyon-buttress.glb',sourceSha256:createHash('sha256').update(bytes).digest('hex'),islandId:island.id,island,contacts};await writeFile(path.join(here,'island-contact-plan.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
