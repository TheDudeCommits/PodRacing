from pathlib import Path
import json,subprocess,shutil
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];WORK=HERE/'typecheck-workspace'
WORK.mkdir(exist_ok=True)
for p in (ROOT/'src').rglob('*.ts'):
 q=WORK/p.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True)
 if not q.exists():q.symlink_to(p)
for p in (HERE/'candidate').rglob('*.ts'):
 q=WORK/p.relative_to(HERE/'candidate');q.parent.mkdir(parents=True,exist_ok=True)
 if q.is_symlink():q.unlink()
 shutil.copyfile(p,q)
config=json.loads((ROOT/'tsconfig.json').read_text());config['include']=['src'];config['compilerOptions']['preserveSymlinks']=True
(WORK/'tsconfig.json').write_text(json.dumps(config,indent=2)+'\n')
r=subprocess.run([str(ROOT/'node_modules/.bin/tsc'),'--noEmit','--project',str(WORK/'tsconfig.json')],cwd=ROOT,text=True,capture_output=True)
receipt={'status':'PASS' if r.returncode==0 else 'FAIL','scope':'TypeScript7 --noEmit against isolated source tree; unchanged source files symlinked, three candidate files copied; no live source writes. Runtime source only, not full suite/browser/GLSL compilation.', 'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr,'earlierPreparationFailure':'TypeScript6 compiler API entrypoint unavailable in installed TypeScript7; prior script retained as failed-typescript6-api-check.mjs. This uses installed native CLI.'}
(HERE/'typecheck-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2));raise SystemExit(r.returncode)
