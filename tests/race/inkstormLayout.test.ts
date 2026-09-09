import { describe,it,expect } from 'vitest';
import { createPodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout,getInkstormObstacleContact } from '../../src/game/race/inkstormLayout';
const terrain={heightAt:()=>0};
describe('Inkstorm authored scenery collision',()=>{
 it('preserves every canonical racing corridor for a full-size craft',()=>{
  const course=createPodraceCourse(terrain);
  for(let i=0;i<512;i++){const p=course.sampleAtProgress(i/512);for(const side of [-1,0,1]){
   const x=p.x+p.rightX*side*(p.width-8),z=p.z+p.rightZ*side*(p.width-8);
   expect(getInkstormObstacleContact(course,x,z,7,2,terrain.heightAt),`route ${i} lane ${side}`).toBeNull();
  }}
 });
 it('collides with authored roadside rocks and clears their airspace',()=>{
  const course=createPodraceCourse(terrain),rock=getInkstormLayout(course).find(p=>p.family==='roadside-shard')!;
  const contact=getInkstormObstacleContact(course,rock.x,rock.z,3,2,terrain.heightAt);
  expect(contact?.id).toBe(rock.id);expect(contact?.penetration).toBeGreaterThan(0);
  expect(getInkstormObstacleContact(course,rock.x,rock.z,3,500,terrain.heightAt)).toBeNull();
 });
});
