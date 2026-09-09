/** CPU-only metrics for the frozen v4 lightmap feasibility study. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {Vector3} from 'three';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const prior=path.join(root,'assets/source/inkstorm/grid-construction-round29');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io=new NodeIO(),sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(await readFile(path.join(prior,'candidate-receipt.json'))),anchorBytes=await readFile(path.join(prior,'task-light-anchors.json'));
assert.equal(receipt.revision,4);
const anchors=JSON.parse(anchorBytes),assets=[];
for(const family of ['pit-complex','pit-district']) {
  const entry=receipt.assets.find(a=>a.family===family),bytes=await readFile(path.join(root,entry.candidatePath));assert.equal(sha(bytes),entry.candidateSha256);
  const doc=await io.readBinary(bytes),p=doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),color=p.getAttribute('COLOR_0'),indices=p.getIndices().getArray();
  assert(position&&normal&&color);assert(!p.getAttribute('TEXCOORD_0')&&!p.getAttribute('TEXCOORD_1'));
  const sources=anchors.fixtures.filter(f=>f.family===family).map(f=>new Vector3(...f.emitterGLB));
  let surfaceArea=0,priorityArea=0,priorityTriangles=0;const triangleAreas=[];
  for(let i=0;i<indices.length;i+=3) {
    const v=Array.from(indices.subarray(i,i+3),j=>new Vector3(...position.getElement(j,[])));
    const cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),area=cross.length()/2;
    const n=v.reduce((sum,_,k)=>sum.add(new Vector3(...normal.getElement(indices[i+k],[]))),new Vector3()).normalize();
    const center=v.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(1/3);
    surfaceArea+=area;triangleAreas.push(area);
    // Priority only, NOT a visibility or clipping test: near lamps, below their
    // hoods, with some front-facing direct response. All faces remain in bake.
    const priority=sources.some(l=>{
      const d=l.clone().sub(center),d2=d.lengthSq();if(d2>.0001)d.normalize();
      return center.y<l.y+.05&&d2<32*32&&n.dot(d)>.05;
    });
    if(priority){priorityArea+=area;priorityTriangles++;}
  }
  const densityEstimates=[1024,2048].map(resolution=>({resolution,rgba8WithMipsMiB:resolution*resolution*4*4/3/1048576,
    uniformTexelsPerMetreAt65PercentPacking:Math.sqrt(resolution*resolution*.65/surfaceArea),
    priorityTexelsPerMetreIf80PercentUsableAreaIsDedicated:Math.sqrt(resolution*resolution*.65*.8/priorityArea)}));
  assets.push({family,path:entry.candidatePath,sha256:sha(bytes),bytes:bytes.length,triangles:indices.length/3,vertices:position.getCount(),surfaceAreaSquareMetres:surfaceArea,
    priorityAreaSquareMetres:priorityArea,priorityTriangles,minimumTriangleArea:Math.min(...triangleAreas),medianTriangleArea:triangleAreas.slice().sort((a,b)=>a-b)[Math.floor(triangleAreas.length/2)],
    originalAttributes:p.listSemantics(),sourcesGLB:sources.map(v=>v.toArray()),densityEstimates});
}
const report={status:'SOURCE_ONLY_FEASIBILITY_METRICS_NOT_BAKED',candidateRevision:4,anchorSha256:sha(anchorBytes),assets,
  note:'Priority is a conservative source-facing centroid bucket, not actual irradiance/occlusion or a final UV allocation; area includes two-sided duplicate source surfaces.'};
await writeFile(path.join(here,'source-metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
