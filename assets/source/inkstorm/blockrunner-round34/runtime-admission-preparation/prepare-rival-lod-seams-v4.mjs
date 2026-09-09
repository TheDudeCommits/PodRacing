#!/usr/bin/env node
/** Source-only, index-only meshopt rival study. Keeps complete pilot and eight
 * Black_Jets engine/intake/throat components exact, including all source attributes.
 * V4 reduced attribute-weight experiment; no geometry update/reprojection or public writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=require('@gltf-transform/core');
const {ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const {MeshoptSimplifier}=require('meshoptimizer');
const BASE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,v,i,a)=>i%2===0?[...pairs,[v.replace(/^--/,''),a[i+1]]]:pairs,[]));
for(const key of ['input','hero-receipt','output'])if(!args[key])throw Error('Required --'+key);
const input=path.resolve(args.input), output=path.resolve(args.output), outReceipt=output.replace(/\.glb$/,'.lod-receipt.json');
if(!output.startsWith(BASE+path.sep)||input===output||output===outReceipt)throw Error('New private GLB path required');
for(const p of [output,outReceipt]){try{await fs.access(p);throw Error('Refuse overwrite '+p);}catch(e){if(e.code!=='ENOENT')throw e;}}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=await fs.readFile(input),receipt=JSON.parse(await fs.readFile(args['hero-receipt'],'utf8'));
if(receipt.profile!=='hero'||receipt.sha256!==hash(raw)||receipt.triangles!==44028||receipt.bodyTriangles!==39900)throw Error('Exact hero receipt required');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document=await io.readBinary(raw),root=document.getRoot();
const nodes=root.listNodes();
if(nodes.length!==5||nodes.some(n=>JSON.stringify(n.getTranslation())!=='[0,0,0]'||JSON.stringify(n.getScale())!=='[1,1,1]'||JSON.stringify(n.getRotation())!=='[0,0,0,1]'))throw Error('Five identity mesh roots required');
const body=nodes.find(n=>n.getName()==='blockrunner-body').getMesh().listPrimitives()[0];
const indices=Uint32Array.from(body.getIndices().getArray()),positions=body.getAttribute('POSITION').getArray();
const normals=body.getAttribute('NORMAL').getArray(),uv=body.getAttribute('TEXCOORD_0').getArray();
const beforePilot=nodes.filter(n=>n.getName().startsWith('blockrunner-pilot-'));
const fingerprint=p=>JSON.stringify({indices:hash(Buffer.from(p.getIndices().getArray().buffer,p.getIndices().getArray().byteOffset,p.getIndices().getArray().byteLength)),attributes:p.listSemantics().sort().map(s=>{const a=p.getAttribute(s).getArray();return[s,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))];})});
const pilotFingerprints=beforePilot.map(n=>[n.getName(),fingerprint(n.getMesh().listPrimitives()[0])]);
const bodyAttributes=body.listSemantics().sort().map(s=>{const a=body.getAttribute(s).getArray();return[s,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))];});
const protectedRows=receipt.sourceLineage.filter(r=>r.sourceObject.includes('Black_Jets'));
if(protectedRows.length!==8||protectedRows.reduce((s,r)=>s+r.polygonCount,0)!==8952||protectedRows.some(r=>!r.sourcePolygonOrderRetained))throw Error('Expected all eight recorded engine component ranges');
// Independently verify every protected range against the immutable actual fitted
// native export. Never infer safe source ranges solely from their names/indices.
const fitPath=path.join(BASE,'blockrunner-fit-v1-native.glb'),fitRaw=await fs.readFile(fitPath);
if(hash(fitRaw)!=='264f6b241cf7a690dc2814e5356118c0d13475fc1ef2cfe5690b8d67f87f80bf')throw Error('Native fit source hash mismatch');
const fit=await io.readBinary(fitRaw),fitNodes=new Map(fit.getRoot().listNodes().map(n=>[n.getName(),n]));
const norm=JSON.parse(await fs.readFile(path.join(BASE,'normalization-candidate-v1.json'),'utf8'));
const scale=norm.blenderWorldUniformScale,t=norm.blenderWorldTranslation,gameT=[t[0],t[2],-t[1]];
const transform=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]].map((v,k)=>v*scale+gameT[k]);
const point=(arr,i)=>[arr[i*3],arr[i*3+1],arr[i*3+2]];
let maxProtectedSourceDelta=0;
const locks=new Uint8Array(positions.length/3), protectedTriangles=[];
for(const r of protectedRows){
 const node=fitNodes.get('Blockrunner fit V1 '+r.sourceObject);if(!node)throw Error('Missing source engine '+r.sourceObject);
 const p=node.getMesh().listPrimitives();if(p.length!==1)throw Error('Unexpected native engine primitives');
 const sp=p[0].getAttribute('POSITION').getArray(),si=p[0].getIndices().getArray(),m=node.getWorldMatrix();
 if(si.length/3!==r.polygonCount)throw Error('Native source triangle count differs');
 for(let f=0;f<r.polygonCount;f++){
  const offset=(r.firstCopiedPolygon+f)*3,idx=Array.from(indices.slice(offset,offset+3));
  const cornerOrder=r.copiedCornerOrderFromSource;
  if(JSON.stringify(cornerOrder)!==JSON.stringify(r.sourceTransformMirrored?[0,2,1]:[0,1,2]))throw Error('Unrecognized recorded source corner lineage');
  const src=cornerOrder.map(k=>transform(m,point(sp,si[f*3+k]))),actual=idx.map(i=>point(positions,i));
  const error=Math.min(...[0,1,2].map(rotation=>Math.max(...[0,1,2].flatMap(k=>[0,1,2].map(a=>Math.abs(actual[k][a]-src[(k+rotation)%3][a]))))));
  maxProtectedSourceDelta=Math.max(maxProtectedSourceDelta,error);
  if(error>2e-5)throw Error('Protected engine range fails source coordinate check at '+r.sourceObject+' face '+f+': '+error);
  idx.forEach(i=>locks[i]=1);protectedTriangles.push(idx);
 }
}
await MeshoptSimplifier.ready;
const attributes=new Float32Array(positions.length/3*5);
for(let i=0;i<positions.length/3;i++)attributes.set([normals[i*3],normals[i*3+1],normals[i*3+2],uv[i*2],uv[i*2+1]],i*5);
// 24,000 body target + unchanged 4,128 pilot = 28,128 target; hard cap 30,000.
// Absolute geometric error cap 2 cm, normal weight .025 m, UV weight .15 m.
const [simplified,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attributes,5,[.025,.025,.025,.15,.15],locks,24000*3,.02,['LockBorder','ErrorAbsolute','Permissive']);
const canonical=t=>{const rotations=[t,t.slice(1).concat(t[0]),t.slice(2).concat(t.slice(0,2))];return rotations.map(v=>v.join(',')).sort()[0];};
const actualKeys=new Set();for(let i=0;i<simplified.length;i+=3)actualKeys.add(canonical(Array.from(simplified.slice(i,i+3))));
const protectedExact=protectedTriangles.every(t=>actualKeys.has(canonical(t)));
const total=simplified.length/3+4128;
const diagnostic={stage:'private rival index-only attribute-seam-aware simplification V4',attributeWeights:[.025,.025,.025,.15,.15],flags:['LockBorder','ErrorAbsolute','Permissive'],targetBodyTriangles:24000,bodyTriangles:simplified.length/3,pilotTriangles:4128,totalTriangles:total,maximumAbsoluteErrorMeters:.02,reportedAbsoluteErrorMeters:error,protectedSourceTriangles:protectedTriangles.length,lockedVertices:locks.reduce((a,b)=>a+b,0),maximumProtectedSourceCoordinateDeltaMeters:maxProtectedSourceDelta,protectedSurfaceTrianglesExact:protectedExact};
if(total>30000||!protectedExact||error>.02){console.log(JSON.stringify({...diagnostic,status:'FAILED; no candidate written; original thresholds retained'},null,2));throw Error('Rival target/protected surface guard failed');}
const newAccessor=document.createAccessor('Blockrunner rival body indices').setType('SCALAR').setArray(simplified).setBuffer(body.getIndices().getBuffer());
body.setIndices(newAccessor);
const afterAttrs=body.listSemantics().sort().map(s=>{const a=body.getAttribute(s).getArray();return[s,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))];});
if(JSON.stringify(afterAttrs)!==JSON.stringify(bodyAttributes))throw Error('Body attributes changed');
const out=await io.writeBinary(document),check=await io.readBinary(out),checkNodes=new Map(check.getRoot().listNodes().map(n=>[n.getName(),n]));
if(pilotFingerprints.some(([name,f])=>fingerprint(checkNodes.get(name).getMesh().listPrimitives()[0])!==f))throw Error('Pilot accessor bytes changed');
const rebody=checkNodes.get('blockrunner-body').getMesh().listPrimitives()[0];
if(JSON.stringify(rebody.listSemantics().sort().map(s=>{const a=rebody.getAttribute(s).getArray();return[s,hash(Buffer.from(a.buffer,a.byteOffset,a.byteLength))];}))!==JSON.stringify(bodyAttributes))throw Error('Reimported body attributes changed');
if(hash(await fs.readFile(input))!==receipt.sha256)throw Error('Hero source changed');
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,out,{flag:'wx'});
await fs.writeFile(outReceipt,JSON.stringify({...diagnostic,status:'private rival geometry candidate; actual silhouette/texture review pending',input,inputSha256:hash(raw),output,outputSha256:hash(out),bytes:out.byteLength,pilotAccessorBytesExact:true,bodyPositionNormalUvAccessorBytesExact:true,runtimeReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...diagnostic,output,sha256:hash(out),bytes:out.byteLength,runtimeReady:false},null,2));
