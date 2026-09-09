import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {createCourseGulfField as createBaselineField,getLaunchBasinAnchor} from '../../../../src/game/race/CourseGulfField';
import {createCourseGulfField as createCandidateField} from './CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';

const dir='assets/source/inkstorm/launch-composition-round28';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const original=JSON.parse(readFileSync('assets/source/inkstorm/launch-escarpment-v27/candidate2-field.json','utf8'));
const cameraSource='output/gauntlet/round27-cliff-normal/receipts.json';
const captured=JSON.parse(readFileSync(cameraSource,'utf8'));
for(const saved of original.cameras){
 const receipt=[...captured.receipts,...captured.supplemental].find(r=>(r.section??r.view).id===saved.id);
 assert(receipt,`missing camera ${saved.id}`);
 assert(Math.hypot(...saved.position.map((v:number,i:number)=>v-receipt.game.cameraPosition[i]))<1e-7);
}
for(const [mode,makeField] of [['baseline',createBaselineField],['candidate',createCandidateField]] as const){
 const field=makeField(course)!;
 const grids=field.grids.map(grid=>{
  const {values,...description}=grid,bytes=new Uint8Array(values.buffer);
  const filename=`${mode}-${grid.name}.f32`;
  writeFileSync(`${dir}/${filename}`,bytes);
  return {...description,filename,sha256:sha(bytes)};
 });
 const path=mode==='baseline'?'src/game/race/LaunchBasinPlan.ts':`${dir}/LaunchBasinPlan.ts`;
 const report={mode,sourceSha256:sha(readFileSync(path)),signature:course.signature,grids,launchProfile:field.launchProfile,
  anchor:getLaunchBasinAnchor(course),cameras:original.cameras,cameraSource,cameraSourceSha256:sha(readFileSync(cameraSource)),
  cameraPositionsConfirmedAgainstCurrentActualCapture:true,
  limitation:'Isolated CPU field bake; no runtime source, browser or build mutation.'};
 writeFileSync(`${dir}/${mode}-field.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
