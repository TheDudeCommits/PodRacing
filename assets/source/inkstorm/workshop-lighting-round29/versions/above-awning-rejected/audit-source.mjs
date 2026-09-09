/** Source math checks only. No runtime edits, browser, render or Blender. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { stripTypeScriptTypes } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const read = name => readFile(path.join(here, name), 'utf8');
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
const families = {
  'pit-complex': { aim: [0,-1,.18], cuts:[-25,14], bays:[
    {p:[-50,9.44,-3], range:22, center:[-47,-.2], half:[18.8,19.2], roof:9.45},
    {p:[-8,9.44,-3], range:20, center:[-5,-.2], half:[15.98,18.2], roof:9.45},
    {p:[36,9.44,-6], range:23, center:[39,-3.2], half:[21.62,22.2], roof:9.45},
  ]},
  'pit-district': { aim:[0,-1,-.24], cuts:[-21,18], bays:[
    {p:[-36,11.38,-2], range:21, center:[-39,-2], half:[15.9,10.4], roof:11.39},
    {p:[1,16.38,-6], range:25, center:[-2,-4.5], half:[16.9,11.9], roof:16.39},
    {p:[41,13.18,1], range:22, center:[38,1], half:[15.9,10.4], roof:13.19},
  ]},
};
function response(family, point, normal, scale=[1,1,1]) {
  const f=families[family], b=f.bays[point[0]<f.cuts[0]?0:point[0]<f.cuts[1]?1:2];
  const edge=Math.min(b.half[0]-Math.abs(point[0]-b.center[0]), b.half[1]-Math.abs(point[2]-b.center[1]));
  const receiver=smooth(0,.7,edge)*smooth(-.05,.10,point[1])*(1-smooth(b.roof-.15,b.roof,point[1]));
  const source=[b.p[0]+Math.max(-1.05,Math.min(1.05,point[0]-b.p[0])),b.p[1],b.p[2]];
  const delta=new Vector3(...source).sub(new Vector3(...point)).multiply(new Vector3(...scale));
  const d2=Math.max(delta.lengthSq(),.04), l=delta.clone().multiplyScalar(1/Math.sqrt(d2));
  const n=new Vector3(...normal).divide(new Vector3(...scale)).normalize();
  const aim=new Vector3(...f.aim).multiply(new Vector3(...scale)).normalize();
  const diffuse=Math.max(0,n.dot(l));
  const cone=smooth(.08,.48,-l.dot(aim));
  const cutoff=Math.max(0,1-d2/(b.range*b.range));
  return Math.min(.66,receiver*diffuse*cone*cutoff*cutoff/(1+d2/64)*1.10);
}

// Meaningful spatial boundaries: the lamp never fills a back-facing aperture,
// road, back exterior, roof exterior, or neighboring family's geometry.
const examples=[
  ['pit first bay floor','pit-complex',[-47,1,-3],[0,1,0]],
  ['pit first engine top','pit-complex',[-49.1,4.6,-4],[0,1,0]],
  ['pit first engine aperture','pit-complex',[-49.1,3.3,-.15],[0,0,1]],
  ['pit first rear cabinet face','pit-complex',[-47,4,-16.19],[0,0,1]],
  ['pit original rear exterior','pit-complex',[-47,4,-20.5],[0,0,-1]],
  ['pit roof exterior','pit-complex',[-47,19.2,-3],[0,1,0]],
  ['pit apron mouth engine top','pit-complex',[-47,5,10],[0,1,0]],
  ['pit road beyond apron','pit-complex',[-47,1,35],[0,1,0]],
  ['district first floor','pit-district',[-39,.4,-6],[0,1,0]],
  ['district first engine top','pit-district',[-40,4.1,-6],[0,1,0]],
  ['district second bench top','pit-district',[0,2.425,-14],[0,1,0]],
  ['district roof exterior','pit-district',[-39,14,-6],[0,1,0]],
];
const samples=examples.map(([label,family,p,n])=>({label, family, point:p, normal:n, diffuseStrength:response(family,p,n)}));
for(const label of ['pit first engine aperture','pit original rear exterior','pit roof exterior','pit road beyond apron','district roof exterior'])
  assert.equal(samples.find(s=>s.label===label).diffuseStrength,0,label);
for(const sample of samples) assert(sample.diffuseStrength>=0&&sample.diffuseStrength<=.66);
assert(samples.find(s=>s.label==='pit first engine top').diffuseStrength>.2);
assert(samples.find(s=>s.label==='district first engine top').diffuseStrength>.1);

// Compare inverse-scale local normals with an independent world-space normal
// matrix, including yaw and unequal scale; this catches erroneous scaled normals.
let maximumTransformError=0;
for(const s of [[1,1,1],[.78,1,1],[1.3,.65,1.12]]) for(const yaw of [0,.4,Math.PI/2,2.3]) {
  const m=new Matrix4().compose(new Vector3(147,18,-93),new Quaternion().setFromAxisAngle(new Vector3(0,1,0),yaw),new Vector3(...s));
  const normalMatrix=new Matrix3().getNormalMatrix(m);
  const p=new Vector3(-47,4.6,-4), lamp=new Vector3(-48.95,9.44,-3), n=new Vector3(.23,.83,.51).normalize();
  const worldL=lamp.clone().applyMatrix4(m).sub(p.clone().applyMatrix4(m)).normalize();
  const worldN=n.clone().applyMatrix3(normalMatrix).normalize();
  const localL=lamp.clone().sub(p).multiply(new Vector3(...s)).normalize();
  const localN=n.clone().divide(new Vector3(...s)).normalize();
  maximumTransformError=Math.max(maximumTransformError,Math.abs(worldN.dot(worldL)-localN.dot(localL)));
}
assert(maximumTransformError<1e-12);

const syntax=[];
for(const name of ['InkstormSurfaceMaterial.ts.candidate','InkstormWorld.ts.candidate']) {
  const code=await read(name);
  stripTypeScriptTypes(code,{mode:'transform',sourceUrl:name});
  syntax.push({file:name,typescriptSyntaxErrors:0,scope:'Node syntax transform; not TypeScript semantic checking'});
}
const glsl=await read('workshop-lighting.glsl');
assert(!/texture(?:2D|Cube|Lod|Grad)?\s*\(/.test(glsl));
assert(!/for\s*\(/.test(glsl));
const anchorPath=path.join(root,'assets/source/inkstorm/grid-construction-round29/task-light-anchors.json');
const anchorBytes=await readFile(anchorPath);
const anchors=JSON.parse(anchorBytes);
const shaderAnchors=[...glsl.matchAll(/center = vec3\(([-\d., ]+)\)/g)].map(m=>m[1].split(',').map(Number));
assert.deepEqual(shaderAnchors,anchors.fixtures.map(f=>f.emitterGLB),'Shader/visible-fixture anchor equality');
assert.deepEqual(anchors.geometry.lensSizeBlender,[2.1,.68,.07]);
assert.deepEqual(anchors.geometry.lensCenterOffsetBlender,[0,0,.035]);
const receipt={status:'SOURCE_MATH_CHECKS_PASS_NOT_RENDER_ACCEPTANCE',maximumTransformError,syntax,samples,
  sharedAnchors:{file:path.relative(root,anchorPath),sha256:createHash('sha256').update(anchorBytes).digest('hex'),matchingEmitterCount:shaderAnchors.length},
  checks:['Finite bounded intensity','Roof/backface/road rejection at stated samples','World-space comparison for 12 orthogonal transforms','TypeScript candidate syntax','No new texture reads or light loops','All six shader anchors equal shared visible fixture anchors'],
  unavailableEvidence:['GPU shader compilation','Actual visual A/B','Local occluder shadows','Runtime frame cost'],
  shaderSha256:createHash('sha256').update(glsl).digest('hex')};
await writeFile(path.join(here,'source-audit.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
