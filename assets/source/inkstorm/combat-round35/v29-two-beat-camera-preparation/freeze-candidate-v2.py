from pathlib import Path
import hashlib,json,difflib,subprocess,datetime
b=Path(__file__).resolve().parent;r=Path('/Users/amir/Projects/PodRacing')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
rows=[];patch=[]
for p in sorted((b/'candidate').rglob('*.ts')):
 rel=p.relative_to(b/'candidate');before=b/'before'/rel;live=r/rel
 assert sha(live)==sha(before),(rel,'live before mismatch')
 old=before.read_text() if before.exists() else '';new=p.read_text()
 if old==new:continue
 patch.append(f'diff --git a/{rel} b/{rel}\n')
 if not before.exists():patch.append('new file mode 100644\n')
 patch.extend(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile=f'a/{rel}' if before.exists() else '/dev/null',tofile=f'b/{rel}'))
 rows.append({'path':str(rel),'before':{'bytes':before.stat().st_size,'sha256':sha(before)} if before.exists() else None,'candidate':{'bytes':p.stat().st_size,'sha256':sha(p)}})
p=b/'v29-two-beat-camera-v2.patch';p.write_text(''.join(patch))
res=subprocess.run(['git','apply','--check',str(p)],cwd=r,text=True,capture_output=True)
(b/'apply-check-v2.log').write_text(res.stdout+res.stderr)
assert res.returncode==0,res.stderr
manifest={'stage':'PRIVATE V29 camera v2; not applied, native untested','createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':'V28 77f0ed1228afb3909953ae940451e2b1b3cd76b552688ea7d1a154a68debd87d','scope':['three production files plus explicit changed composition contract test and new age/reuse/recovery tests','No GameApp adapter needed: existing object pass-through','No FX/contact/terrain/source asset/simulation/network/HUD/build/public edits'],'patch':{'path':str(p.relative_to(r)),'bytes':p.stat().st_size,'sha256':sha(p)},'files':rows,'validation':{'focused':'39 tests / 7 files PASS; includes 2 private same-source projection checks','typecheck':'typecheck-final-v2b.log PASS','applyCheck':'apply-check-v2.log PASS','native':'NOT EXECUTED','sizeBeat':'Source-projected distinction established with explicit .88-to-.74 margin during age .13-.65: desktop held width 79.6-82.6%, settled 63.8%; portrait comparable, short landscape remains vertically constrained. Native visual effect untested.'}}
(b/'candidate-v2-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
