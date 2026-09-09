"""Prepare a review-only runtime patch. Never writes runtime/test sources."""
from pathlib import Path
import difflib
import hashlib
import json

ROOT = Path('/Users/amir/Projects/PodRacing')
OUT = ROOT / 'assets/source/inkstorm/round34-pilot-separation'

def replace_once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)

paths = [
    'src/game/vehicleAppearance.ts',
    'src/render/vehicles/ImportedVehiclePresentation.ts',
    'tests/render/importedVehiclePresentation.test.ts',
]
original = {p: (ROOT / p).read_text() for p in paths}
candidate = dict(original)
p = paths[0]
t = candidate[p]
t = replace_once(t, 'const BLOCKRUNNER_SURFACE_STYLES = Object.freeze({', '''/** Slate cloth stays below the titanium helmet; the shared source atlas still
 * supplies pigment and contact detail. No material or texture is repainted. */
const BLOCKRUNNER_SUIT_PALETTE = Object.freeze({
  ...BLOCKRUNNER_PALETTE,
  diffuseBands: ['#8d99ad', '#b3bdc6', '#d4d6d5', '#eee7d8'] as const,
  rim: '#c4cbd0',
});
const BLOCKRUNNER_HELMET_PALETTE = Object.freeze({
  ...BLOCKRUNNER_PALETTE,
  diffuseBands: ['#8b98ac', '#b6c0c9', '#e0e1dd', '#fff4e3'] as const,
});
const BLOCKRUNNER_SURFACE_STYLES = Object.freeze({''')
t = replace_once(t, "  'Blockrunner Inkstorm pilot suit atlas v1': TEEMTO_CLOTH_STYLE,", """  'Blockrunner Inkstorm pilot suit atlas v1': Object.freeze({
    palette: BLOCKRUNNER_SUIT_PALETTE, baseColorStrength: .86,
    normalStrength: .25, specularStrength: .035, rimStrength: .025, reflectionStrength: 0, wear: 0,
  }),""")
t = replace_once(t, """  'Blockrunner Inkstorm pilot helmet atlas v1': Object.freeze({
    palette: BLOCKRUNNER_PALETTE,""", """  'Blockrunner Inkstorm pilot helmet atlas v1': Object.freeze({
    palette: BLOCKRUNNER_HELMET_PALETTE, baseColorStrength: .94,""")
candidate[p] = t
p = paths[1]
t = candidate[p]
t = replace_once(t, 'export interface VehicleArtSurfaceStyle {\n  readonly palette?: CelPalette;', '''export interface VehicleArtSurfaceStyle {
  readonly palette?: CelPalette;
  /** Linear-space atlas modulation, in [0, 1]; 1 keeps its full color/contact contrast. */
  readonly baseColorStrength?: number;''')
t = replace_once(t, "const allowed = new Set<string>(['palette', ...scalars]);", "const allowed = new Set<string>(['palette', 'baseColorStrength', ...scalars]);")
t = replace_once(t, '    // Pick only supported values: never spread a style object into a material', '''    if (style.baseColorStrength !== undefined && (!Number.isFinite(style.baseColorStrength)
      || style.baseColorStrength < 0 || style.baseColorStrength > 1)) {
      throw new Error(`Imported vehicle surface style "${name}" baseColorStrength must be finite and between 0 and 1.`);
    }
    // Pick only supported values: never spread a style object into a material''')
t = replace_once(t, '      ...(style.palette === undefined ? {} : { palette: style.palette }),', '''      ...(style.palette === undefined ? {} : { palette: style.palette }),
      ...(style.baseColorStrength === undefined ? {} : { baseColorStrength: style.baseColorStrength }),''')
candidate[p] = t
p = paths[2]
t = candidate[p]
t = replace_once(t, "      wear: .5, tint: '#a0c0e0',", "      wear: .5, tint: '#a0c0e0', baseColorStrength: .6,")
t = replace_once(t, '        rimStrength: .02, reflectionStrength: .03, wear: .04, normalStrength: .25 },', '        rimStrength: .02, reflectionStrength: .03, wear: .04, normalStrength: .25, baseColorStrength: .86 },')
t = replace_once(t, "      'authored cloth trim': { specularStrength: 0, normalStrength: 0 },", "      'authored cloth trim': { specularStrength: 0, normalStrength: 0, baseColorStrength: .2 },")
t = replace_once(t, "    expect(untouched.palette).toBe(CEL_PALETTES.player);", """    expect(untouched.palette).toBe(CEL_PALETTES.player);
    expect(cloth.uniforms.uBaseColorStrength?.value).toBe(.86);
    expect(untouched.uniforms.uBaseColorStrength?.value).toBe(.6);""")
t = replace_once(t, "  it('does not admit untyped texture/source knobs in a surface style', async () => {", """  it.each([0, 1])('accepts atlas modulation boundary %s without changing another lease or the source maps', async (strength) => {
    const f = artFixture(); f.material.name = 'Authored Cloth';
    const roughness = new Texture(); f.material.roughnessMap = roughness; f.material.roughness = .7;
    const roughnessDisposed = vi.spyOn(roughness, 'dispose');
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const styled = new ImportedVehiclePresentation(library);
    const unstyled = new ImportedVehiclePresentation(library);
    expect(await styled.setSource({ ...source('shared'), surfaceStyles: {
      'Authored Cloth': { baseColorStrength: strength },
    } })).toBe('ready');
    expect(await unstyled.setSource(source('shared'))).toBe('ready');
    expect(styled.materials[0]!.uniforms.uBaseColorStrength?.value).toBe(strength);
    expect(unstyled.materials[0]!.uniforms.uBaseColorStrength?.value).toBe(1);
    expect(styled.materials[0]).not.toBe(unstyled.materials[0]);
    for (const presentation of [styled, unstyled]) {
      expect(presentation.geometryMeshes[0]!.geometry).toBe(f.geometry);
      expect(presentation.materials[0]!.uniforms.uBaseColorMap?.value).toBe(f.map);
      expect(presentation.materials[0]!.uniforms.uRoughnessMap?.value).toBe(roughness);
      expect(presentation.materials[0]!.uniforms.uRoughness?.value).toBe(.7);
    }
    expect(f.material.map).toBe(f.map); expect(f.material.roughnessMap).toBe(roughness);
    styled.dispose();
    expect(f.disposed.map).not.toHaveBeenCalled(); expect(roughnessDisposed).not.toHaveBeenCalled();
    expect(unstyled.status).toBe('ready');
    unstyled.dispose(); library.dispose();
    expect(f.disposed.map).toHaveBeenCalledTimes(1); expect(roughnessDisposed).toHaveBeenCalledTimes(1);
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects atlas modulation %s before replacing prior ready art', async (baseColorStrength) => {
      const prior = artFixture(), candidate = artFixture();
      candidate.material.name = 'Authored Cloth';
      const library = new VehicleArtLibrary({ load: vi.fn().mockResolvedValueOnce(prior.root).mockResolvedValueOnce(candidate.root), maxIdleEntries: 0 });
      const changed = vi.fn();
      const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
      await presentation.setSource(source('prior'));
      const liveMeshes = presentation.geometryMeshes;
      expect(await presentation.setSource({ ...source('bad-modulation'), surfaceStyles: {
        'Authored Cloth': { baseColorStrength },
      } })).toBe('error');
      expect(presentation.error?.message).toContain('baseColorStrength must be finite and between 0 and 1');
      expect(presentation.activeSource?.id).toBe('prior');
      expect(presentation.geometryMeshes).toBe(liveMeshes);
      expect(presentation.geometryRevision).toBe(1); expect(changed).toHaveBeenCalledTimes(1);
      expect(prior.disposed.map).not.toHaveBeenCalled();
      for (const disposed of Object.values(candidate.disposed)) expect(disposed).toHaveBeenCalledTimes(1);
      presentation.dispose(); library.dispose();
    },
  );

  it('does not admit untyped texture/source knobs in a surface style', async () => {""")
candidate[p] = t
patch = ''
records = []
for p in paths:
    baseline = OUT / 'baseline' / p
    target = OUT / 'candidate' / p
    baseline.parent.mkdir(parents=True, exist_ok=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    assert not baseline.exists() and not target.exists(), 'Prepared versions are immutable.'
    baseline.write_text(original[p]); target.write_text(candidate[p])
    patch += ''.join(difflib.unified_diff(original[p].splitlines(True), candidate[p].splitlines(True), fromfile='a/'+p, tofile='b/'+p))
    records.append({'runtimePath':p, 'baselineSha256':hashlib.sha256(original[p].encode()).hexdigest(), 'candidateSha256':hashlib.sha256(candidate[p].encode()).hexdigest()})
(OUT / 'blockrunner-pilot-separation-v1.patch').write_text(patch)
(OUT / 'candidate-inputs.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps({'patchBytes':len(patch.encode()), 'patchSha256':hashlib.sha256(patch.encode()).hexdigest(), 'files':records}, indent=2))
