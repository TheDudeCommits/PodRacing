import ts from '../../../../node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const here=path.dirname(new URL(import.meta.url).pathname),root=path.resolve(here,'../../../..');
const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
const host=ts.createCompilerHost(parsed.options);
const read=host.readFile.bind(host),exists=host.fileExists.bind(host);
const overrides=new Map(fs.readdirSync(path.join(here,'candidate/src/render/inkstorm')).map(name=>[
 path.join(root,'src/render/inkstorm',name),path.join(here,'candidate/src/render/inkstorm',name)]));
host.fileExists=file=>overrides.has(path.resolve(file))||exists(file);
host.readFile=file=>read(overrides.get(path.resolve(file))??file);
host.getSourceFile=(file,languageVersion)=>{
 const text=host.readFile(file);return text===undefined?undefined:ts.createSourceFile(file,text,languageVersion,true);
};
const program=ts.createProgram(parsed.fileNames,parsed.options,host);
const diagnostics=ts.getPreEmitDiagnostics(program);
const format={getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'};
const receipt={status:diagnostics.length?'FAIL':'PASS',scope:'Virtual TypeScript compiler host substitutes only three staged Foundry files; no emitted files and no live source writes.',diagnostics:ts.formatDiagnosticsWithColorAndContext(diagnostics,format),filesSubstituted:[...overrides.keys()].map(x=>path.relative(root,x))};
fs.writeFileSync(path.join(here,'typecheck-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));process.exitCode=diagnostics.length?1:0;
