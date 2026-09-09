import {readFileSync} from 'node:fs';
import {createProceduralPodraceCourse} from '../../../../src/game/race/course';
import {sampleTerrainHeight} from '../../../../src/render/terrain/terrainMath';
const j=JSON.parse(readFileSync('assets/source/inkstorm/launch-reveal-round31/baseline-trace.json','utf8')),a=j.anchor;
const course=createProceduralPodraceCourse({heightAt:sampleTerrainHeight},0x494e4b53);
for(const f of [100,150,200,240,260,280,300,350,450]){const x=a.x+a.tangentX*f,z=a.z+a.tangentZ*f;let best:any=null;
 for(let d=1100;d<=2300;d+=2){const p=course.sampleAtDistance(d),dist=Math.hypot(x-p.x,z-p.z);if(!best||dist<best.dist)best={f,d,dist,width:p.width,clear:dist-p.width};}console.log(best);}
