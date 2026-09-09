from pathlib import Path
import difflib,hashlib,json
OUT=Path(__file__).resolve().parent
before=OUT/'before'
candidate=OUT/'candidate'
rel=Path('src/render/inkstorm/InkstormSurfaceMaterial.ts')
s=(before/rel).read_text()
s="import { INKSTORM_FOUNDRY_FINISH_GLSL, type InkstormFoundryFinish } from './InkstormFoundryFinish';\n"+s
s=s.replace('foundryEmission = false, foundationPaint = false)', 'foundryEmission = false, foundationPaint = false, foundryFinish: InkstormFoundryFinish = null)')
s=s.replace('defines: { ', 'defines: { ...(!stone && foundryFinish ? { INKSTORM_FOUNDRY_FINISH: foundryFinish === \'pipe-bank\' ? 1 : 2 } : {}), ',1)
s=s.replace('varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;', '''varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;
        #ifdef INKSTORM_FOUNDRY_FINISH
        varying vec3 vFoundryScale;
        #endif''',1)
s=s.replace('          // Unit-box foundations need', '''          #ifdef INKSTORM_FOUNDRY_FINISH
          mat4 foundryTransform=modelMatrix;
          #ifdef USE_INSTANCING
          foundryTransform=modelMatrix*instanceMatrix;
          #endif
          vFoundryScale=vec3(length(foundryTransform[0].xyz),length(foundryTransform[1].xyz),length(foundryTransform[2].xyz));
          #endif
          // Unit-box foundations need''',1)
s=s.replace('        uniform float uStone;', '        ${INKSTORM_FOUNDRY_FINISH_GLSL}\n        uniform float uStone;',1)
s=s.replace('          // Painted service lights', '''          #ifdef INKSTORM_FOUNDRY_FINISH
          vec2 foundryFinish=inkstormFoundryFinish();
          // Broad contact separation remains legible when micro-wear mips out.
          // Preserve both authored glass palettes and the existing sun shadows.
          float foundryPaint=(1.-service)*(1.-warmService);
          color*=1.-foundryFinish.y*.46*foundryPaint;
          // A localized cyan receiver response, in linear color before haze.
          // Exposed sunlight reduces its prominence; no global ambient lift.
          color+=base*vec3(.16,.90,1.15)*foundryFinish.x*3.2
            *mix(1.,.45,lit)*foundryPaint;
          #endif
          // Painted service lights''',1)
(candidate/rel).write_text(s)
rel=Path('src/render/inkstorm/InkstormWorld.ts')
s=(before/rel).read_text().replace('family===INKSTORM_SERVICE_GANTRY),512)', "family===INKSTORM_SERVICE_GANTRY, false, family==='pipe-bank'?'pipe-bank':family===INKSTORM_SERVICE_GANTRY?'service-gantry':null),512)")
assert s!=(before/rel).read_text()
(candidate/rel).write_text(s)
patch=''
for p in sorted(candidate.rglob('*.ts')):
 rel=p.relative_to(candidate)
 a=(before/rel).read_text() if (before/rel).exists() else ''
 patch+=''.join(difflib.unified_diff(a.splitlines(True),p.read_text().splitlines(True),fromfile='a/'+str(rel) if a else '/dev/null',tofile='b/'+str(rel)))
(OUT/'foundry-finish-v1.patch').write_text(patch)
print(json.dumps({'candidateFiles':[str(p.relative_to(OUT)) for p in candidate.rglob('*.ts')],'patchBytes':len(patch.encode())},indent=2))
