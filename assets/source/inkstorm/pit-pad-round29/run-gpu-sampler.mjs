import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.INKSTORM_OUTPUT;
if (!output) throw new Error('Set a new INKSTORM_OUTPUT directory');
await mkdir(output, {recursive: true});
const server = await createServer({server: {host:'127.0.0.1', port:5197, strictPort:true}, plugins:[{
  name:'pit-sampler-empty-host', configureServer(server) { server.middlewares.use((req,res,next)=>{
    if (req.url === '/__gpu-probe') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Pit sampler GPU diagnostic</title>');}
    else if(req.url === '/favicon.ico') {res.statusCode=204;res.end();} else next();
  }); }
}]});
let browser;
const errors=[];
try {
  await server.listen();
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:5197/__gpu-probe');
  const receipt=await page.evaluate(async()=>await(await import('/assets/source/inkstorm/pit-pad-round29/gpu-sampler-diagnostic.ts')).runGpuSamplerDiagnostic());
  await writeFile(`${output}/receipt.json`,JSON.stringify({browser:browser.version(),errors,receipt},null,2));
  console.log(JSON.stringify({output,errors,status:receipt.status}));
  if(errors.length) process.exitCode=1;
} finally {await browser?.close();await server.close();}
