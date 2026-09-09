import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
const root=process.cwd();
const candidate=path.join(root,'assets/source/inkstorm/launch-reveal-round31');
export async function resolve(specifier, context, next){
 let parent=context.parentURL;
 if(parent?.startsWith(pathToFileURL(candidate).href)&&parent.endsWith('/CourseGulfField.ts')&&specifier.startsWith('.')) parent=pathToFileURL(path.join(root,'src/game/race/CourseGulfField.ts')).href;
 if(parent?.startsWith(pathToFileURL(candidate).href)&&parent.endsWith('/events.ts')&&specifier.startsWith('.')) parent=pathToFileURL(path.join(root,'src/game/mastery/events.ts')).href;
 if(specifier.startsWith('.')&&parent){
  let file=fileURLToPath(new URL(specifier,parent));
  for(const ext of ['', '.ts', '/index.ts']) if(existsSync(file+ext)&&statSync(file+ext).isFile()) { const resolved=file+ext; const selected=process.env.LAUNCH_CANDIDATE==='1' && resolved===path.join(root,'src/game/race/CourseGulfField.ts') ? path.join(candidate,'CourseGulfField.ts') : process.env.LAUNCH_CANDIDATE==='1' && resolved===path.join(root,'src/game/mastery/events.ts') ? path.join(candidate,'events.ts') : resolved; return {url:pathToFileURL(selected).href,shortCircuit:true}; }
 }
 return next(specifier,context);
}
export async function load(url,context,next){
 if(url.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(fileURLToPath(url),'utf8'),{mode:'transform'}),shortCircuit:true};
 return next(url,context);
}
