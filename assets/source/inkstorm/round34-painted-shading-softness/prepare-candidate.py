from pathlib import Path
import difflib, hashlib, json
ROOT = Path('/Users/amir/Projects/PodRacing')
OUT = Path(__file__).resolve().parent
FILES = ['src/render/materials/celRamp.ts', 'src/render/materials/celShaders.ts', 'src/render/materials/CelMaterial.ts', 'src/render/vehicles/ImportedVehiclePresentation.ts', 'src/game/vehicleAppearance.ts']

def replace(text, old, new):
    assert text.count(old) == 1, (old[:100], text.count(old))
    return text.replace(old, new)

before = {}
for name in FILES:
    target = OUT/'baseline'/name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists(): target.write_bytes((ROOT/name).read_bytes())
    before[name] = target.read_text()
    assert (ROOT/name).read_bytes() == target.read_bytes(), 'Live input changed; prepare a new version: '+name
result = dict(before)
s = result[FILES[0]]
s = replace(s, '  readonly thresholds: readonly number[];\n', '  readonly thresholds: readonly number[];\n  /** CPU-authored transition width; omitted/zero preserves exact hard-band bytes. */\n  readonly paintedShadingSoftness?: number;\n')
s = replace(s, '  const resolution = config.resolution ?? DEFAULT_RAMP_RESOLUTION;\n  if (!Number.isInteger', '''  const softness = config.paintedShadingSoftness ?? 0;
  if (!Number.isFinite(softness) || softness < 0 || softness > 1) {
    throw new RangeError('Cel paintedShadingSoftness must be finite and between 0 and 1.');
  }
  const resolution = config.resolution ?? DEFAULT_RAMP_RESOLUTION;
  if (!Number.isInteger''')
s = replace(s, '\n  for (let x = 0; x < resolution; x += 1) {', '''
  const softness = config.paintedShadingSoftness ?? 0;
  // Only opted ramps allocate interpolation colors. Work in linear RGB so
  // authored pigment multiplication and the existing transfer stay unchanged.
  const colors = softness > 0 ? config.bands.map(color => new Color(color)) : [];
  for (let x = 0; x < resolution; x += 1) {''')
s = replace(s, '    scratchColor.set(color);\n', '''    scratchColor.set(color);
    if (softness > 0) {
      for (let boundary = 0; boundary < config.thresholds.length; boundary += 1) {
        const threshold = config.thresholds[boundary]!;
        const previous = config.thresholds[boundary - 1] ?? 0;
        const next = config.thresholds[boundary + 1] ?? 1;
        // Leave a plateau between adjacent transitions, including closely
        // spaced custom thresholds. Maximum full transition width is .2.
        const halfWidth = softness * Math.min(.10, (threshold - previous) * .45, (next - threshold) * .45);
        if (halfWidth > 0 && sample > threshold - halfWidth && sample < threshold + halfWidth) {
          const t = (sample - (threshold - halfWidth)) / (halfWidth * 2);
          scratchColor.copy(colors[boundary]!).lerp(colors[boundary + 1]!, t * t * (3 - 2 * t));
          break;
        }
      }
    }
''')
result[FILES[0]] = s
# Keep the exported legacy shader byte-identical. The positive option selects
# a separately derived program; no extra uniform/define enters legacy leases.
s = result[FILES[1]]
blur = '''  if (uWear > 0.0) {
    vec3 paintedRamp = (texture2D(uRamp, vec2(clamp(diffuseTerm-.07,0.,1.),.5)).rgb
      + texture2D(uRamp, vec2(clamp(diffuseTerm+.07,0.,1.),.5)).rgb) * .5;
    color = mix(color, paintedRamp*uTint, uWear*.8);
  }
'''
spec = '  float specularBand = mix(step(uSpecularCutoff, specularLobe),smoothstep(uSpecularCutoff*.5,uSpecularCutoff*1.6,specularLobe),uWear);'
assert s.count(blur) == 1 and s.count(spec) == 1
s += '''
/** Separate opt-in program keeps the exported legacy shader byte-identical.
 * Soft diffuse transitions are already in the same ramp texture: one fetch.
 * Procedural pigment wear remains controlled only by uWear.
 */
function paintedFragmentSource(): string {
  const wearRamp = ''' + json.dumps(blur) + ''';
  const hardSpecular = ''' + json.dumps(spec) + ''';
  if (!CEL_FRAGMENT_SHADER.includes(wearRamp) || !CEL_FRAGMENT_SHADER.includes(hardSpecular)) {
    throw new Error('Cel painted-shading shader anchors changed; review the opt-in variant.');
  }
  return CEL_FRAGMENT_SHADER
    .replace('uniform float uWear;', 'uniform float uWear;\\nuniform float uPaintedShadingSoftness;')
    .replace(wearRamp, '')
    .replace(hardSpecular, `  float specularWidth = max(.0001, uPaintedShadingSoftness * max(.015, uSpecularCutoff * .65));
  float specularBand = smoothstep(max(0., uSpecularCutoff - specularWidth), uSpecularCutoff + specularWidth, specularLobe);`);
}

export const CEL_PAINTED_FRAGMENT_SHADER = paintedFragmentSource();
'''
result[FILES[1]] = s
s = result[FILES[2]]
s = replace(s, "import { CEL_FRAGMENT_SHADER, CEL_VERTEX_SHADER } from './celShaders';", "import { CEL_FRAGMENT_SHADER, CEL_PAINTED_FRAGMENT_SHADER, CEL_VERTEX_SHADER } from './celShaders';")
s = replace(s, '  readonly wear?: number;\n', '  readonly wear?: number;\n  /** Opt-in [0,1] diffuse/specular softness independent of procedural pigment wear. */\n  readonly paintedShadingSoftness?: number;\n')
s = replace(s, '  private paletteValue: CelPalette;\n', '  private paletteValue: CelPalette;\n  private readonly paintedShadingSoftness: number;\n')
s = replace(s, '  constructor(options: CelMaterialOptions = {}) {\n', '''  constructor(options: CelMaterialOptions = {}) {
    const paintedShadingSoftness = options.paintedShadingSoftness ?? 0;
    if (!Number.isFinite(paintedShadingSoftness) || paintedShadingSoftness < 0 || paintedShadingSoftness > 1) {
      throw new RangeError('Cel paintedShadingSoftness must be finite and between 0 and 1.');
    }
''')
s = replace(s, '    const ramp = createCelRampTexture({ bands: palette.diffuseBands, thresholds });', '    const ramp = createCelRampTexture({ bands: palette.diffuseBands, thresholds, paintedShadingSoftness });')
s = replace(s, '      uWear: { value: options.wear ?? 0 },', '''      uWear: { value: options.wear ?? 0 },
      ...(paintedShadingSoftness > 0 ? { uPaintedShadingSoftness: { value: paintedShadingSoftness } } : {}),''')
s = replace(s, '      fragmentShader: CEL_FRAGMENT_SHADER,', '      fragmentShader: paintedShadingSoftness > 0 ? CEL_PAINTED_FRAGMENT_SHADER : CEL_FRAGMENT_SHADER,')
s = replace(s, '    this.paletteValue = palette;\n  }\n\n  get palette', '    this.paletteValue = palette;\n    this.paintedShadingSoftness = paintedShadingSoftness;\n  }\n\n  get palette')
s = replace(s, '      resolution: image.width,\n', '      resolution: image.width,\n      paintedShadingSoftness: this.paintedShadingSoftness,\n')
result[FILES[2]] = s
s = result[FILES[3]]
s = replace(s, '  readonly baseColorStrength?: number;\n', '  readonly baseColorStrength?: number;\n  /** Independent diffuse/specular transition softness, finite in [0,1]. */\n  readonly paintedShadingSoftness?: number;\n')
s = replace(s, "['palette', 'baseColorStrength', ...scalars]", "['palette', 'baseColorStrength', 'paintedShadingSoftness', ...scalars]")
s = replace(s, '    // Pick only supported values:', '''    if (style.paintedShadingSoftness !== undefined && (!Number.isFinite(style.paintedShadingSoftness)
      || style.paintedShadingSoftness < 0 || style.paintedShadingSoftness > 1)) {
      throw new Error(`Imported vehicle surface style "${name}" paintedShadingSoftness must be finite and between 0 and 1.`);
    }
    // Pick only supported values:''')
s = replace(s, '      ...(style.baseColorStrength === undefined ? {} : { baseColorStrength: style.baseColorStrength }),', '''      ...(style.baseColorStrength === undefined ? {} : { baseColorStrength: style.baseColorStrength }),
      ...(style.paintedShadingSoftness === undefined ? {} : { paintedShadingSoftness: style.paintedShadingSoftness }),''')
result[FILES[3]] = s
s = result[FILES[4]]
s = replace(s, "  'Blockrunner Inkstorm body atlas v1': Object.freeze({\n    palette: BLOCKRUNNER_PALETTE,", "  'Blockrunner Inkstorm body atlas v1': Object.freeze({\n    palette: BLOCKRUNNER_PALETTE, paintedShadingSoftness: .85,")
s = replace(s, '    palette: BLOCKRUNNER_SUIT_PALETTE, baseColorStrength: .86,', '    palette: BLOCKRUNNER_SUIT_PALETTE, baseColorStrength: .86, paintedShadingSoftness: .45,')
s = replace(s, '    palette: BLOCKRUNNER_HELMET_PALETTE, baseColorStrength: .94,', '    palette: BLOCKRUNNER_HELMET_PALETTE, baseColorStrength: .94, paintedShadingSoftness: .75,')
result[FILES[4]] = s
for name, text in result.items():
    target = OUT/'candidate'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text)
patch = ''.join(''.join(difflib.unified_diff(before[n].splitlines(True),result[n].splitlines(True),fromfile='a/'+n,tofile='b/'+n)) for n in FILES)
(OUT/'blockrunner-painted-shading-v1.patch').write_text(patch)
def rec(name,text):return {'path':name,'bytes':len(text.encode()),'sha256':hashlib.sha256(text.encode()).hexdigest()}
(OUT/'candidate-inputs.json').write_text(json.dumps({'scope':'Private source candidate only; no live source edits/GPU/browser','baseline':[rec(n,s) for n,s in before.items()],'candidate':[rec(n,s) for n,s in result.items()],'patch':rec('blockrunner-painted-shading-v1.patch',patch)},indent=2)+'\n')
print('Prepared five-file private source patch',len(patch.encode()),'bytes')
# Integrate independent prepared tests into the same reviewable private patch.
name='tests/render/importedVehiclePresentation.test.ts'
target=OUT/'baseline'/name;target.parent.mkdir(parents=True,exist_ok=True)
if not target.exists():target.write_bytes((ROOT/name).read_bytes())
assert target.read_bytes()==(ROOT/name).read_bytes(), 'Importer tests changed; prepare a new version'
before[name]=target.read_text()
result[name]=before[name]+'\n'+(OUT/'prepared-tests/importedVehiclePresentation.paintedShading.fragment.txt').read_text()
name='tests/materials/celPaintedShading.test.ts'
assert not (ROOT/name).exists(), 'New test destination already exists'
result[name]=(OUT/'prepared-tests/celPaintedShading.test.ts').read_text()
for name in list(result)[5:]:
    target=OUT/'candidate'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result[name])
patch=''.join(''.join(difflib.unified_diff(before.get(n,'').splitlines(True),result[n].splitlines(True),fromfile='a/'+n if n in before else '/dev/null',tofile='b/'+n)) for n in result)
(OUT/'blockrunner-painted-shading-v1.patch').write_text(patch)
(OUT/'candidate-inputs.json').write_text(json.dumps({'scope':'Private source/test candidate only; no live source edits/GPU/browser','baseline':[rec(n,s) for n,s in before.items()],'candidate':[rec(n,s) for n,s in result.items()],'patch':rec('blockrunner-painted-shading-v1.patch',patch)},indent=2)+'\n')
print('Integrated seven-file source/test patch',len(patch.encode()),'bytes')
