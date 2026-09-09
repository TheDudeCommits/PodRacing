from pathlib import Path
import subprocess,json,os,signal,hashlib,time
root=Path('/Users/amir/Projects/PodRacing');p=root/'assets/source/inkstorm/combat-round35/v31-contact-billow-preparation';out=root/'output/playwright/round35-combat-v31-component';out.mkdir(exist_ok=False)
server=json.loads((p/'component-server.json').read_text());wrapper='/Users/amir/.codex/skills/playwright/scripts/playwright_cli.sh';session='v31-contact-component';logs=[]
def run(*args):
 command=[wrapper,'--session',session,*args];r=subprocess.run(command,cwd=root,text=True,capture_output=True,timeout=90);logs.append({'argv':command,'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr});(out/'commands.json').write_text(json.dumps(logs,indent=2)+'\n');print(r.stdout,flush=True);assert r.returncode==0,r.stderr;return r.stdout
try:
 run('open',server['url'])
 run('eval','async () => { for(let i=0;i<100&&!window.previewReady;i++) await new Promise(r=>setTimeout(r,100)); return {ready:window.previewReady,state:window.previewState}; }')
 run('resize','1280','850')
 run('snapshot')
 for age in [.058333333333,.14,.408333333333,1.208333333333]:
  run('eval',f'() => window.setPreviewAge({age})');run('screenshot','--filename',str(out/f'component-age{age:.2f}.png'))
 run('eval','async () => await window.cyclePreviewContext()')
 run('console','error')
finally:
 try:run('close')
 finally:os.kill(server['pid'],signal.SIGTERM)
(out/'scope.txt').write_text('Private component only: observed V30 eye position and reconstructed rear contact plus terrain; camera look target chosen to view the isolated effect. No vehicle/casing occlusion/native pixels/gameplay/FPS acceptance. Four phases and real WebGL context loss/restore. Browser closed, owned temporary server terminated.\n')
