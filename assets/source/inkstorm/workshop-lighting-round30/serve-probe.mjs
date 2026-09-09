import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const server=await createServer({root:here,publicDir:false,server:{host:'127.0.0.1',port:5198,strictPort:true,fs:{allow:[path.resolve(here,'../../../..')]}},plugins:[{name:'round30-source-probe',configureServer(vite){vite.middlewares.use('/__result',(req,res)=>{let bytes='';req.on('data',chunk=>bytes+=chunk);req.on('end',async()=>{try{const {report,preview}=JSON.parse(bytes);await writeFile(path.join(here,'gpu-bake-probe.json'),JSON.stringify(report,null,2)+'\n');if(preview)await writeFile(path.join(here,'gpu-bake-probe.png'),Buffer.from(preview.split(',')[1],'base64'));res.end('saved');console.log(JSON.stringify({status:report.status,checks:report.checks}));}catch(e){res.statusCode=500;res.end(String(e));}});});}}]});
await server.listen();console.log('Round30 source probe http://127.0.0.1:5198/probe.html');
const close=async()=>{await server.close();process.exit();};process.once('SIGINT',close);process.once('SIGTERM',close);
