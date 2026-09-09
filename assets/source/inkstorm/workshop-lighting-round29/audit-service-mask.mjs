/** Ground truth from actual COLOR_0 hues, independent of the shader thresholds. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const io=new NodeIO(),sha=b=>createHash('sha256').update(b).digest('hex');
const signatures=[[.1,.87,.79],[.13,.78,.74]];
const expectedCyan=rgb=>signatures.some(s=>Math.abs(rgb[0]/rgb[1]-s[0]/s[1])<1e-5&&Math.abs(rgb[2]/rgb[1]-s[2]/s[1])<1e-5);
const corrected=rgb=>rgb[1]>=.50&&rgb[2]>=.45&&rgb[1]>=3*rgb[0]&&rgb[2]>=3*rgb[0];
const old=rgb=>rgb[1]>=1.65*rgb[0]&&rgb[2]>=1.65*rgb[0];
const extent=rows=>[0,1,2].map(i=>[Math.min(...rows.map(r=>r.rgb[i])),Math.max(...rows.map(r=>r.rgb[i]))]);
const assets=[], allColors=new Map(),representatives=[];
for(const family of ['pit-complex','pit-district','foundry-gantry','pipe-bank','finish-tower','refinery-stack']) {
  const relative=`public/assets/inkstorm/${family}.glb`,bytes=await readFile(path.join(root,relative)),doc=await io.readBinary(bytes),colors=new Map();
  let vertexCount=0,falsePositiveVertices=0,falseNegativeVertices=0,oldFalsePositiveVertices=0,cyanVertices=0;
  for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()) {
    const a=p.getAttribute('COLOR_0');assert(a);
    for(let i=0;i<a.getCount();i++) {
      const rgb=a.getElement(i,[]).slice(0,3),key=rgb.map(x=>x.toFixed(7)).join(',');
      const expected=expectedCyan(rgb), actual=corrected(rgb);
      vertexCount++;cyanVertices+=+expected;falsePositiveVertices+=+(actual&&!expected);falseNegativeVertices+=+(!actual&&expected);oldFalsePositiveVertices+=+(old(rgb)&&!expected);
      const row=colors.get(key)??{rgb,vertices:0,expectedCyan:expected,oldEmissive:old(rgb),correctedEmissive:actual};row.vertices++;colors.set(key,row);
      if(!allColors.has(key))allColors.set(key,{id:allColors.size,family,...row});
    }
  }
  const unique=[...colors.values()],cyan=unique.filter(c=>c.expectedCyan),muted=unique.filter(c=>c.oldEmissive&&!c.expectedCyan);
  assert.equal(falsePositiveVertices,0,family);assert.equal(falseNegativeVertices,0,family);
  // The predicate sees authored RGB, so every procedural modulation value is
  // irrelevant to classification; validate the actual export first, not a mock.
  for(const c of cyan)for(const modulation of [.82,.9,1,1.05])assert(corrected(c.rgb),`${family} cyan remains classified before ${modulation} paint multiplication`);
  const pick=(rows,label)=>{
    if(!rows.length)return;
    const sorted=rows.slice().sort((a,b)=>a.rgb[1]-b.rgb[1]);
    for(const [name,r] of [['darkest',sorted[0]],['brightest',sorted.at(-1)]])representatives.push({name:`${family} ${label} ${name}`,family,label,rgb:r.rgb});
  };
  pick(cyan,'cyan');pick(muted,'cobalt');
  assets.push({family,path:relative,sha256:sha(bytes),vertexCount,uniqueColors:unique.length,cyanVertices,oldFalsePositiveVertices,falsePositiveVertices,falseNegativeVertices,cyanRange:cyan.length?extent(cyan):null,mutedBlueRange:muted.length?extent(muted):null});
}
const palette=[...allColors.values()];
const current=await readFile(path.join(root,'src/render/inkstorm/InkstormSurfaceMaterial.ts'));
const original=await readFile(path.join(here,'versions/initial-lighting/InkstormSurfaceMaterial.ts'));
const report={status:'ACTUAL_EXPORTED_PALETTE_PASS',groundTruth:'Authored cyan hue rays (.1,.87,.79) and (.13,.78,.74), allowing exported scalar face shading; independent of brightness threshold',thresholds:{minimumG:.50,minimumB:.45,minimumGreenRedRatio:3,minimumBlueRedRatio:3,classificationStage:'Before broad/brush/wear modulation'},currentMaterialSha256:sha(current),originalMaterialSha256:sha(original),assets,uniqueColorCount:palette.length,cyanColorCount:palette.filter(c=>c.expectedCyan).length,mutedBlueColorCount:palette.filter(c=>c.oldEmissive&&!c.expectedCyan).length,representatives};
await writeFile(path.join(here,'service-mask-audit.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(here,'service-probe-palette.json'),JSON.stringify({representatives,allCyan:palette.filter(c=>c.expectedCyan),allMutedBlue:palette.filter(c=>c.oldEmissive&&!c.expectedCyan),materialSha256:report.currentMaterialSha256,assets},null,2)+'\n');
await writeFile(path.join(here,'service-probe-original.ts'),original.toString().replaceAll("from './","from '/src/render/inkstorm/"));
console.log(JSON.stringify({status:report.status,uniqueColors:report.uniqueColorCount,cyanColors:report.cyanColorCount,mutedBlueColors:report.mutedBlueColorCount,assets:assets.map(({family,vertexCount,cyanVertices,oldFalsePositiveVertices,falsePositiveVertices,falseNegativeVertices})=>({family,vertexCount,cyanVertices,oldFalsePositiveVertices,falsePositiveVertices,falseNegativeVertices}))},null,2));
