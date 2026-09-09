from pathlib import Path
import subprocess,json,os,signal,hashlib,time
root=Path('/Users/amir/Projects/PodRacing');p=root/'assets/source/inkstorm/combat-round35/v31-contact-billow-preparation';out=root/'output/playwright/round35-combat-v31-depth-check';out.mkdir(exist_ok=False)
server=json.loads((p/'depth-server.json').read_text());wrapper='/Users/amir/.codex/skills/playwright/scripts/playwright_cli.sh';session='v31-contact-depth';logs=[]
def run(*args):
 command=[wrapper,'--session',session,*args];r=subprocess.run(command,cwd=root,text=True,capture_output=True,timeout=90);logs.append({'argv':command,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr});(out/'commands.json').write_text(json.dumps(logs,indent=2)+'\n');print(r.stdout,flush=True);assert r.returncode==0,r.stderr;return r.stdout
try:
 run('open',server['url'])
 run('eval','async () => { for(let i=0;i<100&&!window.previewReady;i++) await new Promise(r=>setTimeout(r,100)); return {ready:window.previewReady,state:window.previewState}; }')
 run('resize','1280','850')
 run('snapshot')
 run('eval','() => window.checkDepth()')
 run('eval',"() => { const r=window.depthResult; if(r.visiblePixels<100 || r.foregroundDifferences!==0 || r.terrainCoveredPixels<100 || r.terrainLeaks!==0 || r.programErrors!==0 || r.glError!==0) throw Error(JSON.stringify(r)); return r; }")
 run('screenshot','--filename',str(out/'depth-checked-cloud.png'))
 run('console','error')
finally:
 try:run('close')
 finally:os.kill(server['pid'],signal.SIGTERM)
(out/'scope.txt').write_text('Private component only: observed V30 eye position and reconstructed rear contact plus terrain; camera look target chosen to view the isolated effect. No vehicle/casing occlusion/native pixels/gameplay/FPS acceptance. Neutral foreground occluder and test-only buried carriers independently verify depth with nonzero visible-cloud controls. Browser closed, owned temporary server terminated.\n')
