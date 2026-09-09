from pathlib import Path
import re,json
b=Path(__file__).resolve().parent;root=Path.cwd()
paths=['src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckVisualPose.ts','src/render/combat/TeemtoStrikeMotion.ts','src/render/galactic/GalacticEffectsView.ts']
owned={str(root/rel):'./'+Path(rel).name.removesuffix('.ts') for rel in paths}
def rewrite(text, rel):
 def match(m):
  target=str((root/rel).parent.joinpath(m[2]).resolve())
  return m[1]+owned.get(target,owned.get(target+'.ts',target))+m[3]
 return re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",match,text)
for rel in paths:(b/'test-runtime'/Path(rel).name).write_text(rewrite((b/'candidate'/rel).read_text(),rel))
for rel,name in [('tests/combat/TeemtoAuthoredDamage.test.ts','actualGeometry.test.ts'),('tests/combat/TeemtoStrikeMotion.test.ts','strikeMotion.test.ts'),('tests/render/GalacticEffectsView.test.ts','effectRegression.test.ts')]:
 s=(b/'candidate'/rel).read_text();s=re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",lambda m:m[1]+str((root/rel).parent.joinpath(m[2]).resolve())+m[3],s);(b/name).write_text(s)
