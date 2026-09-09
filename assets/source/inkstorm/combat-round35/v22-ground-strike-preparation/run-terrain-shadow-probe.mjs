import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
const base='assets/source/inkstorm/combat-round35/v22-ground-strike-preparation';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try {
 const mod=await server.ssrLoadModule('/'+base+'/terrain-shadow-probe.ts');
 writeFileSync(base+'/terrain-shadow-probe.json',JSON.stringify(mod.default,null,2)+'\n');
 console.log(JSON.stringify(mod.default,null,2));
}finally{await server.close();}
