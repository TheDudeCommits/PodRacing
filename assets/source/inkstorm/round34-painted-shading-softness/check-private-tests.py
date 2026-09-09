from pathlib import Path
import json,subprocess,shutil,hashlib
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];WORK=HERE/'check-workspace';WORK.mkdir(exist_ok=True)
# Symlink immutable dependencies, copy only candidates. All generated files stay private.
for p in (ROOT/'src').rglob('*.ts'):
 q=WORK/p.relative_to(ROOT);q.parent.mkdir(parents=True,exist_ok=True)
 if not q.exists():q.symlink_to(p)
for name in ['tests/render/vehicleArtFixtures.ts']:
 q=WORK/name;q.parent.mkdir(parents=True,exist_ok=True)
 if not q.exists():q.symlink_to(ROOT/name)
for p in (HERE/'candidate').rglob('*.ts'):
 q=WORK/p.relative_to(HERE/'candidate');q.parent.mkdir(parents=True,exist_ok=True)
 if q.is_symlink():q.unlink()
 shutil.copyfile(p,q)
config=json.loads((ROOT/'tsconfig.json').read_text());config['include']=['src','tests'];config['compilerOptions']['preserveSymlinks']=True
(WORK/'tsconfig.json').write_text(json.dumps(config,indent=2)+'\n')
(WORK/'vitest.config.mts').write_text("import { defineConfig } from 'vitest/config';\nexport default defineConfig({resolve:{preserveSymlinks:true},test:{include:['tests/**/*.test.ts'],maxWorkers:1,fileParallelism:false}});\n")
commands=[['typecheck',[str(ROOT/'node_modules/.bin/tsc'),'--noEmit','--project',str(WORK/'tsconfig.json')]],['tests',[str(ROOT/'node_modules/.bin/vitest'),'run','--root',str(WORK),'--config',str(WORK/'vitest.config.mts')]]]
rows=[]
for label,command in commands:
 run=subprocess.run(command,cwd=WORK,text=True,capture_output=True);log=HERE/(label+'-private-v1.log');log.write_text(run.stdout+run.stderr)
 rows.append({'label':label,'argv':command,'exitCode':run.returncode,'log':str(log),'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()});print(label,run.returncode,run.stdout[-1300:],run.stderr[-1300:])
 if run.returncode:break
receipt={'scope':'Private copied candidate modules and two test files; unchanged runtime dependencies symlinked read-only. No live source/test edits, browser, GLSL execution or project-wide verification.','checks':rows}
(HERE/'private-check-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');raise SystemExit(rows[-1]['exitCode'])
