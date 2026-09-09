from pathlib import Path
import re,json
b=Path(__file__).resolve().parent;root=Path.cwd()
changed=['src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckGroundContact.ts','src/render/galactic/GalacticEffectsView.ts']
owned=changed+['src/render/combat/WreckVisualPose.ts','src/render/combat/TeemtoWreckBreakup.ts']
paths={str(root/p):str(b/'test-runtime'/Path(p).name) for p in owned}
def remap(s,base):
 def one(m):
  token=m[2]
  if token.startswith('.'):
   p=str((base/token).resolve());token=paths.get(p,paths.get(p+'.ts',p))
  return m[1]+token+m[3]
 return re.sub(r"((?:from\s+|import\s*)['\"])([^'\"]+)(['\"])",one,s)
for rel in owned:
 target=b/'test-runtime'/Path(rel).name;target.parent.mkdir(exist_ok=True);target.write_text(remap(((b/'candidate'/rel) if rel in changed else root/rel).read_text(),(root/rel).parent))
# A pinned V22 effect class supplies independent default-emitter regression data.
p=b/'before-runtime/GalacticEffectsView.ts';p.parent.mkdir(exist_ok=True);p.write_text(remap((b/'before/src/render/galactic/GalacticEffectsView.ts').read_text(),root/'src/render/galactic'))
for rel in ['tests/render/WreckFootprintEffects.test.ts','tests/combat/TeemtoGroundEdges.test.ts']:
 p=b/'candidate'/rel
 if p.exists():(b/Path(rel).name).write_text(remap(p.read_text(),(root/rel).parent))
(b/'vitest.config.ts').write_text("import { defineConfig } from 'vitest/config';\nimport { dirname,resolve } from 'node:path';\nconst targets=new Map("+json.dumps(list(paths.items()))+");\nexport default defineConfig({plugins:[{name:'v23-private-runtime',enforce:'pre',resolveId(source,importer){const absolute=source.startsWith('.')&&importer?resolve(dirname(importer),source):source;return targets.get(absolute)??targets.get(absolute+'.ts')??null;}}],test:{environment:'node',maxWorkers:1,fileParallelism:false,include:['tests/**/*.test.ts','assets/source/inkstorm/combat-round35/v23-contact-edge-preparation/*.test.ts']}});\n")
(b/'tsconfig.candidate.json').write_text(json.dumps({'extends':str(root/'tsconfig.json'),'include':['test-runtime/*.ts','TeemtoGroundEdges.test.ts','WreckFootprintEffects.test.ts','legacy-emitter-parity.test.ts']},indent=2)+'\n')
