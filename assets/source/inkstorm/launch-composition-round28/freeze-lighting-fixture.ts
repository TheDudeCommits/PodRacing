import {readFileSync,writeFileSync} from 'node:fs';
import {CourseGulfField,type CourseGulfGrid} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
const dir='assets/source/inkstorm/launch-composition-round28';
const saved=JSON.parse(readFileSync(`${dir}/baseline-field.json`,'utf8'));
const grids=saved.grids.map((g:CourseGulfGrid&{filename:string})=>{
 const b=readFileSync(`${dir}/${g.filename}`);
 return {...g,values:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
}) as [CourseGulfGrid,CourseGulfGrid];
const field=new CourseGulfField(grids,saved.launchProfile);
const sites=[
 [19523.02153188235,1772.6380451778293,19.632079996585205],
 [18836.446409229255,2026.4021929795015,15.342696306203461],
 [19817.37148230598,1868.6662916717785,33.84191180736791],
 [19626.590971778605,1652.0970263284235,23.389752627373127],
 [19087.936799267525,2035.9615432135806,19.86829078449348],
 [19785.48366342169,1776.5267254500698,18.005402972950446],
];
const probes=sites.map(([x,z,e])=>({x,z,broadEpsilon:e,points:[[0,0],[e,0],[0,e],[6,0],[0,6],[.85,0],[-.85,0],[0,.85],[0,-.85]].map(([dx,dz])=>({
 x:x!+dx!,z:z!+dz!,baseHeight:sampleTerrainHeight(x!+dx!,z!+dz!),authoredOffset:field.sampleOffset(x!+dx!,z!+dz!),
}))}));
const fixture={description:'Exact round27 baseline physical-field and base-height probes for six historical shelf-crossing normal failures; independent of later composition edits.',sourceSha256:saved.sourceSha256,launchFieldSha256:saved.grids[0].sha256,probes};
writeFileSync('tests/terrain/authoredTerrainLightingRound27.ts',`export const authoredTerrainLightingRound27 = ${JSON.stringify(fixture,null,2)} as const;\n`);
console.log(JSON.stringify({sites:probes.length,points:probes.reduce((s,p)=>s+p.points.length,0),fieldSha256:saved.grids[0].sha256}));
