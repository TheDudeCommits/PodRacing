import {describe,expect,it} from 'vitest';
import {createProceduralPodraceCourse} from '../../src/game/race/course';
import {createCourseGulfField,getLaunchBasinAnchor} from '../../src/game/race/CourseGulfField';
import {launchRidgeSurface} from '../../src/game/race/LaunchBasinPlan';
import {launchRidgeSurface as round26Surface} from '../../assets/source/inkstorm/launch-escarpment-v27/LaunchBasinPlan.round26';
import {sampleTerrainHeight} from '../../src/render/terrain/terrainMath';

const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
const field=createCourseGulfField(course)!,anchor=getLaunchBasinAnchor(course)!;
const height=(forward:number,right:number):number=>sampleTerrainHeight(
 anchor.x+anchor.tangentX*forward-anchor.rightX*right,
 anchor.z+anchor.tangentZ*forward-anchor.rightZ*right,field);

describe('broken leading launch escarpments',()=>{
 it('opens deep connected recesses in the previously solid visible fronts',()=>{
  // These physical probes sit on the visible first-hit front, before the
  // earlier crown-only ravines. Round26 has 123–152m rock at the west probes.
  for(const forward of [780,800,830,850])expect(height(forward,-340)).toBeLessThan(0);
  expect(height(930,-560)).toBeLessThan(0);
  expect(height(650,530)).toBeLessThan(0);
  expect(height(730,565)).toBeLessThan(0);
  // The broad bay includes a higher broken shelf. Retain the full-depth
  // floor beside it, rather than requiring an uninterrupted vertical slot.
  expect(height(850,-460)-height(800,-340)).toBeGreaterThan(170);
  expect(height(850,-340)-height(800,-340)).toBeGreaterThan(40);
  expect(height(650,385)-height(650,530)).toBeGreaterThan(90);
 });

 it('retains unequal projecting shelves and connected ridge material beside the bays',()=>{
  expect(height(850,-420)).toBeGreaterThan(45);
  expect(height(850,-420)).toBeLessThan(75);
  expect(height(850,-460)).toBeGreaterThan(130);
  expect(height(500,430)).toBeGreaterThan(40);
  expect(height(500,430)).toBeLessThan(60);
  // A repeated contour staircase or uniform lowering would erase this
  // terminated shelf and the adjoining much taller surviving buttress.
  expect(height(850,-460)-height(850,-420)).toBeGreaterThan(65);
 });

 it('retains near-west, central opening and rear ranges exactly outside the two leading edits',()=>{
  for(let f=-230;f<=630;f+=13.7)for(let r=-900;r<=50;r+=17.3)
   expect(launchRidgeSurface(f,r)).toEqual(round26Surface(f,r));
  for(let f=300;f<=1500;f+=11.9)for(const r of [-100,0,100])
   expect(launchRidgeSurface(f,r)).toEqual(round26Surface(f,r));
  for(let f=1148;f<=1740;f+=17.9)for(let r=-800;r<=720;r+=23.7)
   expect(launchRidgeSurface(f,r)).toEqual(round26Surface(f,r));
 });
});
