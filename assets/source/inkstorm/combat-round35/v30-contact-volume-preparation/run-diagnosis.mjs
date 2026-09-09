import {createServer} from 'vite';import {writeFileSync} from 'node:fs';
const base='assets/source/inkstorm/combat-round35/v30-contact-volume-preparation';
const server=await createServer({configFile:false,server:{middlewareMode:true,watch:null},appType:'custom'});
try{const{default:result}=await server.ssrLoadModule('/'+base+'/diagnose.ts');writeFileSync(base+'/diagnosis.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({birth:result.birth,rows:result.rows.map(r=>({...r,plates:r.plates.map(({samples,...p})=>p)}))},null,2));}finally{await server.close();}
