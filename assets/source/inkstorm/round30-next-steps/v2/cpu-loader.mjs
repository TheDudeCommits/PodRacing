import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
const root=process.cwd();
const candidate=path.join(root,'assets/source/inkstorm/round30-next-steps/v2');
export async function resolve(specifier, context, next){
 let parent=context.parentURL;
 if(parent?.startsWith(pathToFileURL(candidate).href)&&parent.endsWith('/InkstormFoundry.ts')&&specifier.startsWith('.')) parent=pathToFileURL(path.join(root,'src/render/inkstorm',path.basename(fileURLToPath(parent)))).href;
 if(specifier.startsWith('.')&&parent){
  let file=fileURLToPath(new URL(specifier,parent));
  for(const ext of ['', '.ts', '/index.ts']) if(existsSync(file+ext)&&statSync(file+ext).isFile()) return {url:pathToFileURL(file+ext).href,shortCircuit:true};
 }
 return next(specifier,context);
}
export async function load(url,context,next){
 if(url.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),'utf8'),{mode:'transform'}),shortCircuit:true};
 return next(url,context);
}
