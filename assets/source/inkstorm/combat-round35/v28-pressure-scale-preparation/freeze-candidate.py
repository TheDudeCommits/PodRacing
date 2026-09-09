from pathlib import Path
import json,hashlib,difflib,subprocess,math
b=Path(__file__).resolve().parent;r=Path('/Users/amir/Projects/PodRacing')
def rec(p):
 data=p.read_bytes();return {'path':str(p),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
files=[];patch=[]
for p in sorted((b/'candidate').rglob('*.ts')):
 rel=p.relative_to(b/'candidate');old=b/'before'/rel;live=r/rel
 assert (live.read_bytes()==old.read_bytes()) if old.exists() else not live.exists(),str(rel)
 a=old.read_text() if old.exists() else '';z=p.read_text()
 patch.append('diff --git a/'+str(rel)+' b/'+str(rel)+'\n')
 if not old.exists(): patch.append('new file mode 100644\n')
 patch.extend(difflib.unified_diff(a.splitlines(True),z.splitlines(True),fromfile='a/'+str(rel) if old.exists() else '/dev/null',tofile='b/'+str(rel)))
 files.append({'target':str(rel),'before':rec(old) if old.exists() else None,'candidate':rec(p)})
patchfile=b/'v28-pressure-scale.patch';patchfile.write_text(''.join(patch))
result=subprocess.run(['git','apply','--check',str(patchfile)],cwd=r,text=True,capture_output=True)
(b/'apply-check.log').write_text(result.stdout+result.stderr);assert result.returncode==0,result.stderr
check=subprocess.run(['git','apply','--numstat',str(patchfile)],cwd=r,text=True,capture_output=True);assert check.returncode==0
(b/'patch-numstat.txt').write_text(check.stdout)
source=r/'assets/source/inkstorm/combat-round35/v27-flame-atlas-candidate/flame-atlas-raw-v1.png'
public=r/'public/assets/fx/inkstorm/rupture-flame-v1.png'
assert source.read_bytes()==public.read_bytes()
alpha=json.loads((source.parent/'raw-v1-metadata-audit.json').read_text())
metrics={'scope':'CPU optical/geometry contracts only; not native perceptual or ground-visibility acceptance',
 'pressure':{'scale':1.8,'durationSeconds':.085,'radiusAtSeverity2Metres':alpha['frames'][0]['maximumRootRadiusMetresAtSeverity2']*1.8},
 'fire':{'startSeconds':.065,'durationSeconds':2.05,'initialScale':1.6,'terminalScale':1.15,'contractionEndFireAgeSeconds':.60,
 'jetInitialRadiusAtSeverity2Metres':alpha['frames'][1]['maximumRootRadiusMetresAtSeverity2']*1.6,
 'brokenFirstSolidRadiusAtSeverity2Metres':alpha['frames'][2]['maximumRootRadiusMetresAtSeverity2']*(1.6-.45*(20/27)),
 'conservativeAllPhaseRadiusAtSeverity2Metres':max(f['maximumRootRadiusMetresAtSeverity2'] for f in alpha['frames'][1:])*1.6},
 'leaders':{'indices':[1,7,13],'oldSector':[1,1,1],'candidateSector':[0,2,4],'scaleMultiplier':1.15},
 'budgets':{'drawOwners':8,'rupturePlates':4,'birthFragmentSlots':18,'newTextures':0,'newSceneObjects':0,'newTerrainQueries':0}}
(b/'optical-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
manifest={'status':'PRIVATE FROZEN; no live source/public changes by this preparation', 'patch':rec(patchfile),'files':files,
 'rawSource':rec(source),'publicPreserved':rec(public),
 'validation':{'focused':'56 tests / 11 files PASS','typecheck':'PASS','applyCheck':'PASS',
 'tests':rec(b/'focused-v2.log'),'tsc':rec(b/'typecheck-v2.log'),'privateComparison':rec(b/'checks/GenericBeforeParity.test.ts')},
 'metrics':rec(b/'optical-metrics.json'),'nativeGate':'PENDING: actual larger root/phase/depth/ground occlusion and casing punctuation at gameplay framing. V27 remains5/10 FAIL8.'}
(b/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'patch':rec(patchfile),'manifest':rec(b/'manifest.json'),'numstat':check.stdout},indent=2))
