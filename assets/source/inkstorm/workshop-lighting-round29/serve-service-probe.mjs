import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true},plugins:[{name:'isolated-service-probe-results',configureServer(vite){vite.middlewares.use('/__service_probe_result',(req,res)=>{let bytes='';req.on('data',chunk=>{bytes+=chunk;});req.on('end',async()=>{try{const {report,preview}=JSON.parse(bytes);await writeFile(path.join(here,'gpu-service-probe.json'),JSON.stringify(report,null,2)+'\n');if(preview)await writeFile(path.join(here,'gpu-service-probe.png'),Buffer.from(preview.split(',')[1],'base64'));res.end('saved');console.log(JSON.stringify({status:report.status,checks:report.checks}));}catch(error){res.statusCode=500;res.end(String(error));}});});}}]});
await server.listen();console.log('Service probe ready at http://127.0.0.1:5198/assets/source/inkstorm/workshop-lighting-round29/service-probe.html');
const close=async()=>{await server.close();process.exit();};process.once('SIGINT',close);process.once('SIGTERM',close);
