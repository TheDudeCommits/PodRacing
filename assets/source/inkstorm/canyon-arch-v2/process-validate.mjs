/** Isolated arch staging only. Never copies to public or edits the runtime. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';

const stage=fileURLToPath(new URL('./',import.meta.url));
const root=path.resolve(stage,'../../../..');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const {dedup,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const validator=require('gltf-validator');
const io=new NodeIO(),hash=data=>createHash('sha256').update(data).digest('hex');
const oldPath=path.join(root,'public/assets/inkstorm/canyon-arch.glb');
const oldHash='36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453';
assert.equal(hash(await readFile(oldPath)),oldHash);

const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function overlapsBox(triangle,center,half){
  const vertices=triangle.map(v=>sub(v,center));
  const edges=vertices.map((v,i)=>sub(vertices[(i+1)%3],v));
  const basis=[[1,0,0],[0,1,0],[0,0,1]];
  const axes=[...basis,cross(edges[0],edges[1]),...edges.flatMap(e=>basis.map(b=>cross(e,b)))];
  for(const axis of axes){
    if(dot(axis,axis)<1e-18)continue;
    const projected=vertices.map(v=>dot(v,axis));
    const radius=half.reduce((sum,v,i)=>sum+v*Math.abs(axis[i]),0);
    if(Math.min(...projected)>radius+1e-7||Math.max(...projected)<-radius-1e-7)return false;
  }
  return true;
}

function geometryReceipt(p){
  const pos=p.getAttribute('POSITION'),norm=p.getAttribute('NORMAL'),col=p.getAttribute('COLOR_0');
  assert(pos&&norm&&col);assert.equal(p.getMode(),4);
  assert.equal(pos.getCount(),norm.getCount());assert.equal(pos.getCount(),col.getCount());
  for(const a of[pos,norm,col])assert(Array.from(a.getArray()).every(Number.isFinite));
  const data=pos.getArray(),indices=p.getIndices().getArray(),positions=[],weld=new Map(),remap=[];
  for(let i=0;i<data.length;i+=3){
    const v=Array.from(data.subarray(i,i+3)),key=v.map(x=>x.toFixed(5)).join(',');
    if(!weld.has(key)){weld.set(key,positions.length);positions.push(v);}
    remap.push(weld.get(key));
  }
  const edges=new Map(),parents=positions.map((_,i)=>i);
  function find(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
  let volume=0,degenerate=0,boxIntersections=0,minArea=Infinity;
  for(let i=0;i<indices.length;i+=3){
    const ids=Array.from(indices.subarray(i,i+3),id=>remap[id]);
    const [a,b,c]=ids.map(id=>positions[id]);
    const twiceArea=Math.hypot(...cross(sub(b,a),sub(c,a)));minArea=Math.min(minArea,twiceArea/2);
    if(new Set(ids).size!==3||twiceArea<1e-8)degenerate++;
    volume+=dot(a,cross(b,c))/6;
    if(overlapsBox([a,b,c],[0,12,0],[44,12,50]))boxIntersections++;
    for(let j=0;j<3;j++){
      const from=ids[j],to=ids[(j+1)%3],key=Math.min(from,to)+','+Math.max(from,to);
      const e=edges.get(key)??{faces:0,winding:0};e.faces++;e.winding+=from<to?1:-1;edges.set(key,e);
      parents[find(from)]=find(to);
    }
  }
  const boundaryEdges=[...edges.values()].filter(e=>e.faces===1).length;
  const nonManifoldEdges=[...edges.values()].filter(e=>e.faces!==2).length;
  const inconsistentWindingEdges=[...edges.values()].filter(e=>e.winding!==0).length;
  const components=new Set(parents.map((_,i)=>find(i))).size;
  assert.equal(boundaryEdges,0);assert.equal(nonManifoldEdges,0);assert.equal(inconsistentWindingEdges,0);
  assert.equal(degenerate,0);assert.equal(components,1);assert(volume>0);assert.equal(boxIntersections,0);
  const normals=Array.from({length:norm.getCount()},(_,i)=>Math.hypot(...norm.getElement(i,[])));
  assert(Math.min(...normals)>.999&&Math.max(...normals)<1.001);
  assert(col.getMin([]).every(x=>x>=0)&&col.getMax([]).every(x=>x<=1));
  const min=pos.getMin([]),max=pos.getMax([]),triangles=indices.length/3;
  assert(triangles<=30000);assert(min[0]>=-83.76&&max[0]<=86.93);
  assert(min[1]>=0&&max[1]<=99.79);assert(min[2]>=-16.79&&max[2]<=16.78);
  const toes=positions.filter(p=>p[1]<0.01),minimumToeAbsX=Math.min(...toes.map(p=>Math.abs(p[0])));
  assert(minimumToeAbsX>=49);
  return {triangles,vertices:pos.getCount(),attributes:p.listSemantics(),bounds:{min,max},
    normals:{minLength:Math.min(...normals),maxLength:Math.max(...normals)},
    color:{min:col.getMin([]),max:col.getMax([])},
    topology:{weldPrecision:5,weldedVertices:positions.length,boundaryEdges,nonManifoldEdges,
      inconsistentWindingEdges,degenerateTriangles:degenerate,connectedComponents:components,signedVolume:volume,minimumTriangleArea:minArea},
    clearance:{method:'13 separating axes per triangle against canonical protected box across full depth',
      reservedBox:{min:[-44,0,-50],max:[44,24,50]},triangleIntersections:boxIntersections,minimumToeAbsX,
      runtimeCurvedRouteSweep:'Not tested by asset staging; required before integration'}};
}

const source=await readFile(path.join(stage,'canyon-arch-v2-source.glb'));
const doc=await io.readBinary(source),r=doc.getRoot();
assert.equal(r.listMeshes().length,1);assert.equal(r.listMeshes()[0].listPrimitives().length,1);
assert.equal(r.listAnimations().length,0);assert.equal(r.listCameras().length,0);assert.equal(r.listTextures().length,0);
for(const node of r.listNodes()){
  assert.deepEqual(node.getTranslation(),[0,0,0]);assert.deepEqual(node.getRotation(),[0,0,0,1]);assert.deepEqual(node.getScale(),[1,1,1]);
  assert.deepEqual(node.getExtras(),{});
}
const primitive=r.listMeshes()[0].listPrimitives()[0],previous=primitive.getMaterial();
primitive.setMaterial(doc.createMaterial('canyon-arch-v2-stone').setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.93));
previous.dispose();
await doc.transform(dedup(),prune());
const bytes=await io.writeBinary(doc),report=await validator.validateBytes(bytes,{uri:'canyon-arch-v2.glb',maxIssues:1000});
assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
const roundtrip=await io.readBinary(bytes),rt=roundtrip.getRoot();
assert.equal(rt.listMaterials().length,1);assert.equal(rt.listMeshes().length,1);assert.equal(rt.listMeshes()[0].listPrimitives().length,1);
const geometry=geometryReceipt(rt.listMeshes()[0].listPrimitives()[0]);
await writeFile(path.join(stage,'canyon-arch-v2.glb'),bytes);
assert.equal(hash(await readFile(oldPath)),oldHash);
const receipt={asset:'canyon-arch-v2.glb',status:'isolated candidate; no public/runtime integration',source:'original deterministic Blender MCP geometry',
  sourceScript:'scripts/blender/build-canyon-arch-v2.py',sourceSha256:hash(source),sha256:hash(bytes),bytes:bytes.length,
  originalPublicSha256:oldHash,originalPublicPreserved:true,meshes:1,primitives:1,materials:1,textures:0,
  optimization:'glTF Transform 4.5.0 dedup + prune; no quantization, compression, simplification or normal regeneration',
  ...geometry,validation:{library:'Khronos glTF Validator 2.0.0-dev.3.10',...report.issues}};
await writeFile(path.join(stage,'asset-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
