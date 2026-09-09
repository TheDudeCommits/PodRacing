import {writeFileSync} from 'node:fs';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {createCourseGulfField} from '../../../../src/game/race/CourseGulfField';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
import {createInkstormBridge as before} from '../../../../src/render/inkstorm/InkstormBridge';
import {createInkstormBridge as candidate} from './InkstormBridge.candidate';
let field:ReturnType<typeof createCourseGulfField>=null;
const ground=(x:number,z:number)=>sampleTerrainHeight(x,z,field),course=createProceduralPodraceCourse({heightAt:ground},0x494e4b53);
field=createCourseGulfField(course);course.refreshTerrainHeights({heightAt:sampleTerrainHeight});
const branch=course.branches.find(b=>b.elevated)!,old=before(branch,ground),start=performance.now(),next=candidate(branch,ground,course),elapsedMs=performance.now()-start;
const attributes=Object.entries(old.geometry.attributes).map(([name,a])=>{const b=next.geometry.getAttribute(name);return {name,originalComponents:a.array.length,candidateComponents:b.array.length,byteExactPrefix:Array.from(a.array).every((v,i)=>v===b.array[i])};});
const fallback=candidate(branch,ground);
const fallbackExact=Object.entries(old.geometry.attributes).every(([name,a])=>{const b=fallback.geometry.getAttribute(name);return a.array.length===b.array.length&&Array.from(a.array).every((v,i)=>v===b.array[i]);});
const materialCount=Array.isArray(next.material)?next.material.length:1;
const receipt={status:attributes.every(a=>a.byteExactPrefix)&&fallbackExact&&materialCount===2&&next.geometry.groups.length===2?'PASS':'FAIL',attributes,fallbackExact,materialCount,groups:next.geometry.groups,originalTriangles:old.geometry.getAttribute('position').count/3,candidateTriangles:next.geometry.getAttribute('position').count/3,constructionMilliseconds:elapsedMs,limits:'CPU source candidate instantiation and buffer preservation; no GPU compile or actual racing-view acceptance.'};
writeFileSync('assets/source/inkstorm/fork-entry-round30/hook-audit.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
for(const mesh of [old,next,fallback]){mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.dispose();}
