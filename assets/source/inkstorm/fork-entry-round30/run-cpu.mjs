import {rolldown} from 'rolldown';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const input=process.argv[2]??'study.ts',output=input.replace(/\.ts$/,'.bundle.mjs');
const bundle=await rolldown({input:path.join(here,input),platform:'node',external:['three',/^three\//,/^node:/]});
await bundle.write({file:path.join(here,output),format:'esm'});await bundle.close();
await import(path.join(here,output));
