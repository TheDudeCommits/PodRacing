/** Optimize and validate the staged Blender export; --check verifies publication. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const source=path.join(root,'assets/source/inkstorm');
const require=createRequire('/tmp/inkstorm-rock-lod-tools/package.json');
const {NodeIO}=await import(pathToFileURL(require.resolve('@gltf-transform/core')).href);
const {dedup,prune}=await import(pathToFileURL(require.resolve('@gltf-transform/functions')).href);
const validator=require('gltf-validator');const io=new NodeIO();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=await readFile(path.join(source,'pit-district/raw-pit-district.glb'));
const doc=await io.readBinary(raw);
// Stable hierarchy names make repeated Blender exports byte-reproducible.
doc.getRoot().listMeshes().forEach(mesh=>mesh.setName('pit-district-layered-service-mesh'));
doc.getRoot().listNodes().forEach(node=>node.setName('pit-district'));
doc.getRoot().listMaterials().forEach(material=>material.setName('Inkstorm_Pit_District_Paint'));
await doc.transform(dedup(),prune());
const bytes=await io.writeBinary(doc);const validation=await validator.validateBytes(bytes,{uri:'pit-district.glb',maxIssues:1000});
assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
assert.equal(doc.getRoot().listMeshes().length,1);assert.equal(doc.getRoot().listMaterials().length,1);
const primitives=doc.getRoot().listMeshes()[0].listPrimitives();assert.equal(primitives.length,1);
const p=primitives[0];const triangles=p.getIndices().getCount()/3;assert(triangles<15000);
const position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),color=p.getAttribute('COLOR_0');
for(const attr of [position,normal,color]){assert(attr);assert(Array.from(attr.getArray()).every(Number.isFinite));}
assert.deepEqual(position.getMin([]),[-56.81999969482422,0,-18]);
assert.deepEqual(position.getMax([]),[58.25,34.05223083496094,12.535015106201172]);
for(let i=0;i<normal.getCount();i++)assert(Math.abs(Math.hypot(...normal.getElement(i,[]))-1)<.001);
assert(color.getMin([]).every(n=>n>=0)&&color.getMax([]).every(n=>n<=1));
const result={date:'2026-09-07',asset:'pit-district.glb',bytes:bytes.length,sha256:hash(bytes),triangles,vertices:position.getCount(),meshes:1,primitives:1,materials:1,bounds:{min:position.getMin([]),max:position.getMax([])},source:'Original Blender geometry authored through Blender MCP; no downloaded models',sourceScript:'build_pit_district.py',sourceScriptSha256:hash(await readFile(path.join(source,'build_pit_district.py'))),rawSha256:hash(raw),userPrompt:'Use Blender MCP and Codex imagegen skill to generate concept images of the target art style for each section. Keep Iterateing until in-world screenshots look as close as possible to those, at 40-60fps.',optimization:'glTF Transform 4.5.0 dedup/prune and stable hierarchy names',design:'Three unequal open service bays; four sagging painted canopies; supported balcony, access ladders, utility masts, power lines, service signage, spare engines, cases and 14 human-scale crew silhouettes.',preservation:'New objects only in Inkstorm World Kit; active Korostyshiv Fractured Quarry Revision scene and previous objects preserved; scene/render settings restored after export and neutral preview.',preview:'pit-district/district-asset-preview.png is a neutral Blender asset render, not in-game visual or performance evidence',collisionEnvelope:[60,18,35],validation:validation.issues};
const published=path.join(root,'public/assets/inkstorm/pit-district.glb');
if(process.argv.includes('--check'))assert.equal(hash(await readFile(published)),result.sha256);
else{await writeFile(published,bytes);await writeFile(path.join(source,'pit-district-receipt.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({status:'PASS',...result},null,2));
