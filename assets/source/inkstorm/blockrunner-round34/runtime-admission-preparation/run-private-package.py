#!/usr/bin/env python3
"""Run a fresh final-atlas private hero/rival package and validator sequence.
Uses calibrated rival indices only on exact geometry-array equality. No public,
runtime, Blender, browser or build actions. All existing candidates preserved.
"""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent;BASE=HERE.parent
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--master',type=Path,required=True);p.add_argument('--expected-master-sha256',required=True)
p.add_argument('--export-receipt',type=Path,required=True);p.add_argument('--output-directory',type=Path,required=True)
a=p.parse_args();out=a.output_directory.resolve()
assert out.is_relative_to(BASE) and not out.exists()
assert hashlib.sha256(a.master.read_bytes()).hexdigest()==a.expected_master_sha256
out.mkdir(parents=True)
steps=[]
def run(label,command):
    r=subprocess.run(command,capture_output=True,text=True)
    with (out/(label+'.log')).open('x') as f:f.write(r.stdout+r.stderr+'\nexit='+str(r.returncode)+'\n')
    print(r.stdout,end='');print(r.stderr,end='',file=sys.stderr)
    steps.append({'step':label,'exitCode':r.returncode})
    if r.returncode:raise RuntimeError(label+' failed; private failure outputs preserved')
hero=out/'blockrunner-hero-v1.glb';rival=out/'blockrunner-rival-v1.glb';lod=out/'blockrunner-rival-calibrated-lod.glb'
common=['--export-receipt',str(a.export_receipt.resolve())]
try:
    run('01-hero',[sys.executable,str(HERE/'package-blockrunner.py'),'--input',str(a.master.resolve()),'--expected-input-sha256',a.expected_master_sha256,*common,'--output',str(hero),'--profile','hero'])
    run('02-protected-lod',['node',str(HERE/'reuse-validated-rival-indices.mjs'),'--input',str(hero),'--hero-receipt',str(hero.with_suffix('.package-receipt.json')),'--output',str(lod)])
    run('03-rival',[sys.executable,str(HERE/'package-blockrunner.py'),'--input',str(lod),'--expected-input-sha256',hashlib.sha256(lod.read_bytes()).hexdigest(),*common,'--output',str(rival),'--profile','rival','--lod-receipt',str(lod.with_suffix('.lod-receipt.json'))])
    code="const fs=require('fs'),v=require('/tmp/inkstorm-rock-lod-tools/node_modules/gltf-validator');const p=process.argv[1];v.validateBytes(new Uint8Array(fs.readFileSync(p)),{uri:p,maxIssues:10000}).then(r=>{fs.writeFileSync(p.replace(/\\.glb$/,'.khronos.json'),JSON.stringify(r,null,2)+'\\n',{flag:'wx'});console.log(JSON.stringify({path:p,issues:r.issues,info:r.info}));if(r.issues.numErrors||r.issues.numWarnings)process.exitCode=1;});"
    for role,asset in [('hero',hero),('rival',rival)]:run('04-validator-'+role,['node','-e',code,str(asset)])
    run('05-fixture',[sys.executable,str(HERE/'make-package-fixture.py'),'--hero',str(hero.with_suffix('.package-receipt.json')),'--rival',str(rival.with_suffix('.package-receipt.json')),'--output',str(out/'blockrunnerPackage.json'),'--scope','Actual private final-atlas package bytes. Runtime and fresh visual admission remain pending.'])
    assert hashlib.sha256(a.master.read_bytes()).hexdigest()==a.expected_master_sha256
    print(json.dumps({'status':'private package/validator sequence PASS; no visual/runtime acceptance','output':str(out),'steps':steps},indent=2))
finally:
    with (out/'pipeline-steps.json').open('x') as f:json.dump({'scope':'private packaging only','master':str(a.master),'expectedMasterSha256':a.expected_master_sha256,'steps':steps},f,indent=2);f.write('\n')
