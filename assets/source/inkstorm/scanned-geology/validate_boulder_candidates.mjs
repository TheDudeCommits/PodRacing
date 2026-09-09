/** Optimize and validate staged measured-volume candidates; never publishes. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const {ALL_EXTENSIONS}=await import(pathToFileURL(require.resolve('@gltf-transform/extensions')).href);
const {dedup,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const validator=require('gltf-validator');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function checkTopology(primitive){
 const data=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices().getArray();
 const positions=[],weld=new Map(),remap=[];
 for(let i=0;i<data.length;i+=3){
  const v=Array.from(data.subarray(i,i+3)),key=v.map(x=>x.toFixed(5)).join(',');
  if(!weld.has(key)){weld.set(key,positions.length);positions.push(v);}
  remap.push(weld.get(key));
 }
 const edges=new Map(),parent=positions.map((_,i)=>i);
 function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
 let volume=0,degenerate=0;
 for(let i=0;i<indices.length;i+=3){
  const ids=Array.from(indices.subarray(i,i+3),id=>remap[id]);
  if(new Set(ids).size!==3){degenerate++;continue;}
  const [a,b,c]=ids.map(id=>positions[id]);
  const ab=b.map((v,j)=>v-a[j]),ac=c.map((v,j)=>v-a[j]);
  if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])<1e-8)degenerate++;
  volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  for(let j=0;j<3;j++){
   const from=ids[j],to=ids[(j+1)%3],key=Math.min(from,to)+','+Math.max(from,to);
   const e=edges.get(key)??{faces:0,winding:0};e.faces++;e.winding+=from<to?1:-1;edges.set(key,e);
   parent[find(from)]=find(to);
  }
 }
 const boundaryEdges=[...edges.values()].filter(e=>e.faces===1).length;
 const nonManifoldEdges=[...edges.values()].filter(e=>e.faces!==2).length;
 const inconsistentWindingEdges=[...edges.values()].filter(e=>e.winding!==0).length;
 const connectedComponents=new Set(parent.map((_,i)=>find(i))).size;
 assert.equal(boundaryEdges,0);assert.equal(nonManifoldEdges,0);assert.equal(inconsistentWindingEdges,0);assert.equal(degenerate,0);assert.equal(connectedComponents,1);assert(volume>0);
 return {method:'Weld identical export seam positions to 5 decimal places, count incident triangles/directed edge winding, triangle area and connected components',weldedVertices:positions.length,boundaryEdges,nonManifoldEdges,inconsistentWindingEdges,degenerateTriangles:degenerate,connectedComponents,signedVolume:volume};
}

const assets=[];
for(const index of[1,2])for(const detail of['high','lod']){
 const raw=await readFile(path.join(root,`boulder-${index}-raw-${detail}.glb`));
 const doc=await io.readBinary(raw),r=doc.getRoot(),p=r.listMeshes()[0].listPrimitives()[0];
 const name=`scanned-boulder-buttress-${index}-${detail}`;
 r.listMeshes()[0].setName(name);r.listNodes().forEach(n=>n.setName(name));
 const previous=p.getMaterial();p.setMaterial(doc.createMaterial(`Inkstorm_Sandstone_Boulder_${index}`).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.94));previous.dispose();
 await doc.transform(dedup(),prune());
 const bytes=await io.writeBinary(doc),file=`boulder-${index}-${detail}.glb`;
 const report=await validator.validateBytes(bytes,{uri:file,maxIssues:1000});
 assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues));assert.equal(report.issues.numWarnings,0,JSON.stringify(report.issues));
 const roundtrip=await io.readBinary(bytes),rt=roundtrip.getRoot(),primitive=rt.listMeshes()[0].listPrimitives()[0];
 assert.equal(rt.listMeshes().length,1);assert.equal(rt.listMeshes()[0].listPrimitives().length,1);assert.equal(rt.listMaterials().length,1);assert.equal(rt.listTextures().length,0);
 const position=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),color=primitive.getAttribute('COLOR_0');
 for(const a of[position,normal,color]){assert(a);assert(Array.from(a.getArray()).every(Number.isFinite));}
 const lengths=Array.from({length:normal.getCount()},(_,i)=>Math.hypot(...normal.getElement(i,[])));
 assert(Math.min(...lengths)>.999&&Math.max(...lengths)<1.001);
 assert(color.getMin([]).every(v=>v>=0)&&color.getMax([]).every(v=>v<=1));
 const bounds={min:position.getMin([]),max:position.getMax([])};assert.deepEqual(bounds,{min:[-40,0,-50],max:[40,120,50]});
 const triangles=primitive.getIndices().getCount()/3;assert(triangles<=(detail==='high'?28000:4200));
 const topology=checkTopology(primitive);
 await writeFile(path.join(root,file),bytes);
 assets.push({asset:file,rawSha256:hash(raw),sha256:hash(bytes),bytes:bytes.length,triangles,vertices:position.getCount(),meshes:1,primitives:1,materials:1,textures:0,attributes:primitive.listSemantics(),bounds,topology,validation:report.issues});
}
const receipt={date:'2026-09-07',status:'STAGED ONLY: neutral asset review; no runtime replacement, performance measurement or concept-parity acceptance',source:{asset:'boulder_01',page:'https://polyhaven.com/a/boulder_01',author:'Rico Cilliers',license:'CC0',licenseUrl:'https://polyhaven.com/license',downloadReceipt:'boulder-source-download-receipt.json',actualDownloadedGltfTriangles:66122,sourceWeldedVertices:33063,sourceBoundaryEdges:0,sourceNonManifoldEdges:0,sourceSignedVolume:.7343846464651433},authoring:{blender:'Blender MCP official bpy 5.2 background host; owned Inkstorm Scanned Geology Lab scene',script:'build_boulder_candidates.py',scriptSha256:hash(await readFile(path.join(root,'build_boulder_candidates.py'))),paint:'1k original diffuse luminance and ARM ambient occlusion sampled into restricted coral/ochre/cream/cool-shadow vertex colors. Source chroma discarded; no photo textures or images shipped or edited.',geometry:'One continuous measured full-volume scan. Seam welding, authored orientation/shear, canonical bounds normalization, Blender collapse decimation. No generated cap, Boolean, disconnected extremum sentinels, overlapping dressing or flat fan closure.',variants:{1:'Original upright orientation with a small broad lean; vertically stretched for a tall layered buttress.',2:'Original long horizontal axis turned upright, with moderate transverse stretch; asymmetric wedge silhouette.'}},comparison:{script:'render_boulder_candidates.py',camera:[165,-220,147],target:[0,0,55],orthographicScale:184,resolution:[1200,1000],engine:'Cycles 16 samples, AgX Medium High Contrast; same sun/fill and camera for all five candidate/LOD/procedural renders',notGameScreenshot:true},limitations:['The same measured rock underlies both orientations; this is two variants, not two independent scans.','The vertex-only paint removes photographed microdetail. Close-range art and runtime lighting still need review.','28k high is 3.5 times the previous 7990-triangle broad buttress. 4.2k LOD is 2.34 times its 1798-triangle LOD; no FPS claim.','Exact normalized bounds preserve the existing placement envelope but do not prove collision-route clearance for a future new placement.'],assets};
await writeFile(path.join(root,'boulder-candidate-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(assets.map(({asset,bytes,triangles,sha256,topology})=>({asset,bytes,triangles,sha256,topology})),null,2));
