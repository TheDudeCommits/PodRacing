import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
const base='assets/source/inkstorm/combat-round35/settled-pose-diagnosis';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try{
 const {default:result}=await server.ssrLoadModule('/'+base+'/probe.ts');
 writeFileSync(base+'/result.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({positionError:result.sourcePositionErrorBeforeRecordedPositionOverride,rays:result.visibilityRays,engines:result.reports.map(r=>({mesh:r.mesh,minimumGap:r.minimumGap,minVisibility:r.minimumPointVisibility,near:r.nearGroundVertexCount,frontVisible:r.verifiedFrontLowerSurfaceCandidates,frontGapRange:r.frontLowerGapRange}))},null,2));
}finally{await server.close();}
