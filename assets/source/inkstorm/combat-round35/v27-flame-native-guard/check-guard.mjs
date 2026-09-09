import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const source=await readFile('scripts/inkstorm-combat.mjs','utf8');
const start=source.indexOf('async function flameAtlasReceipt(page) {');
const end=source.indexOf('\nawait mkdir(out,', start);
const raw=await readFile('assets/source/inkstorm/combat-round35/v27-flame-atlas-candidate/flame-atlas-raw-v1.png');
const sha=createHash('sha256').update(raw).digest('hex');
const cases=[['exact ready asset',{}],['wrong checksum',{expected:'0'.repeat(64)}],['wrong width',{width:1024}],['wrong count',{frameCount:3}],['foreign origin',{url:'https://example.com/atlas.png'}],['unsuccessful response',{ok:false}],['not PNG',{mime:'text/html'}],['loader fallback',{status:'error'}],['guard absent',{expected:null}]];
const results=[];
for(const [name,override] of cases){
 const diag={status:'ready',url:'/assets/inkstorm/effects/rupture-atlas-v27.png',width:1254,height:1254,frameCount:4,...override};
 const calls={wait:0,fetch:0}; const page={url:()=> 'http://127.0.0.1:5196/',waitForFunction:async()=>{calls.wait++;if(diag.status!=='ready')throw Error('simulated readiness timeout');}};
 const context={URL,Uint8Array,createHash,expectedFlameAtlasSha:override.expected===undefined?sha:override.expected,
 assert:(v,m)=>{if(!v)throw Error(m)},snapshot:async()=>({game:{flameAtlas:diag}}),fetch:async()=>{calls.fetch++;return {ok:override.ok??true,status:override.ok===false?404:200,headers:{get:()=>override.mime??'image/png'},arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)}}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nthis.testGuard = flameAtlasReceipt;',context);
 let result=null,error=null;try{result=await context.testGuard(page)}catch(e){error=String(e)}
 const shouldPass=name==='exact ready asset'||name==='guard absent';
 if(shouldPass?error!==null:error===null)throw Error(`${name}: unexpected result ${error}`);
 if(name==='guard absent'&&(calls.wait||calls.fetch||result!==null))throw Error('Optional mode modified historical behavior');
 results.push({name,outcome:'PASS',rejected:!!error,error,calls});
}
await writeFile('assets/source/inkstorm/combat-round35/v27-flame-native-guard/GUARD_CHECKS.json',JSON.stringify({outcome:'PASS',scope:'Isolated native harness guard with stubbed loader/network responses; not gameplay or image quality.',sourceSha256:createHash('sha256').update(source).digest('hex'),cases:results},null,2)+'\n');
console.log('PASS9 guard cases; seven intentional false-acceptance cases rejected.');
