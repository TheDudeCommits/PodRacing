import {createServer} from 'vite';import{writeFileSync}from'node:fs';import{resolve}from'node:path';
const base='assets/source/inkstorm/combat-round35/v30-contact-volume-preparation';
const server=await createServer({configFile:resolve(base,'vitest.config.ts'),server:{host:'127.0.0.1',port:0,watch:null},logLevel:'error'});
await server.listen();const address=server.httpServer.address();writeFileSync(base+'/component-server.json',JSON.stringify({pid:process.pid,url:`http://127.0.0.1:${address.port}/${base}/component-preview.html`},null,2)+'\n');
process.on('SIGTERM',async()=>{await server.close();process.exit(0);});
