import {createServer} from 'vite';import{writeFileSync}from'node:fs';
const base='assets/source/inkstorm/combat-round35/v29-contact-consequence-preparation';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try{const{default:result}=await server.ssrLoadModule('/'+base+'/diagnose.ts');writeFileSync(base+'/diagnosis.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.rows.map(r=>({age:r.age,halfLength:r.footprint?.halfLength,halfWidth:r.footprint?.halfWidth,plates:r.plates?.map(p=>({age:p.effectAge,size:p.fullDimensions,face:p.absoluteFaceCosine,kind:p.kind}))})),null,2));}finally{await server.close();}
