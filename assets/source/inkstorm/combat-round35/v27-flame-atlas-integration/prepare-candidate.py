from pathlib import Path
import shutil,hashlib,json,re
b=Path(__file__).resolve().parent;r=Path('/Users/amir/Projects/PodRacing')
rels=['src/render/galactic/GalacticEffectsView.ts','src/render/app/GameApp.ts']
for rel in rels:
 p=b/'before'/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists(): shutil.copy2(r/rel,p)
 assert p.read_bytes()==(r/rel).read_bytes(), 'live source moved: '+rel
def replace(s,a,z):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,z)
rel=rels[0];s=(b/'before'/rel).read_text()
s=replace(s,"import type { WreckGroundFootprint }", "import { RUPTURE_ATLAS_GLSL, RUPTURE_FLAME_ATLAS, RuptureFlameAtlas, type RuptureAtlasOptions } from './RuptureFlameAtlas';\nimport type { WreckGroundFootprint }")
s=replace(s,"function createExplosionPlateGeometry(): BufferGeometry {", "function createExplosionPlateGeometry(): BufferGeometry {")
needle="  return geometry;\n}\n\nfunction createCrashDebrisGeometry()"
s=replace(s,needle,"  geometry.setAttribute('aRuptureAtlasSpan', new InstancedBufferAttribute(new Float32Array(\n    (GALACTIC_EFFECT_CAPACITY.explosionPlates + GALACTIC_EFFECT_CAPACITY.hazardPlumes) * 2,\n  ), 2).setUsage(DynamicDrawUsage));\n"+needle)
s=replace(s,'function createAtmosphericMaterial(): MeshBasicMaterial {','function createAtmosphericMaterial(atlas: RuptureFlameAtlas): MeshBasicMaterial {')
s=replace(s,"  result.name = 'Painterly dust and impact wash';\n  result.transparent = true;\n  result.onBeforeCompile = (shader) => {", "  result.name = 'Painterly dust and impact wash';\n  result.transparent = true;\n  result.onBeforeCompile = (shader) => {\n    Object.assign(shader.uniforms, atlas.uniforms);")
s=replace(s,'      attribute vec3 aEffectSurface;','      attribute vec3 aEffectSurface;\n      attribute vec2 aRuptureAtlasSpan;\n      varying vec2 vRuptureAtlasSpan;')
s=replace(s,'      vEffectSurface = aEffectSurface;','      vEffectSurface = aEffectSurface;\n      vRuptureAtlasSpan = aRuptureAtlasSpan;')
s=replace(s,'      float paintHash(vec2 p)', '      ${RUPTURE_ATLAS_GLSL}\n      float paintHash(vec2 p)')
s=replace(s,'      if (vEffectSurface.x > 7.5) {', '''      if (uRuptureAtlasReady > 0.5 && vEffectSurface.x > 5.5 && vEffectSurface.x < 7.5) {
        vec4 ink = ruptureArtwork(vEffectSurface.x, vEffectSurface.z, p);
        alpha = ink.a;
        // Crossfades use premultiplied colors; the material still outputs
        // straight alpha through Three's existing transparent blend state.
        diffuseColor.rgb = ink.rgb / max(ink.a, 0.00001);
      } else if (vEffectSurface.x > 7.5) {''')
s=replace(s,"painterly-atmosphere-curling-rupture-v8", "painterly-atmosphere-rooted-atlas-v9")
s=replace(s,'  readonly explosionPlates = prepare(new InstancedMesh(', '  private readonly ruptureFlameAtlas = new RuptureFlameAtlas();\n\n  readonly explosionPlates = prepare(new InstancedMesh(')
s=replace(s,'    createAtmosphericMaterial(),','    createAtmosphericMaterial(this.ruptureFlameAtlas),')
s=replace(s,'  constructor() {\n    super();', '''  constructor(options?: { readonly flameAtlas?: RuptureAtlasOptions }) {
    super();
    // Boot/warmup request only. Pure CPU/default views perform no image I/O.
    if (options?.flameAtlas) this.ruptureFlameAtlas.load(options.flameAtlas);''')
s=replace(s,'  setState(state: Readonly<GalacticEffectsState>): void {','  get flameAtlasDiagnostics() { return this.ruptureFlameAtlas.diagnostics; }\n\n  setState(state: Readonly<GalacticEffectsState>): void {')
s=replace(s,'  dispose(): void {\n    for (const child', '  dispose(): void {\n    this.ruptureFlameAtlas.dispose();\n    for (const child')
s=replace(s,'          this.writeEffectSurface(plateCount, smoke ? (slot.contactLayer === 2 ? 8 : 9) : flash ? 6 : 7, opacity, age);', '''          const severity = slot.scale / (flash ? RUPTURE_FLASH_SCALE : 2.45);
          const pixelsPerWorld = RUPTURE_FLAME_ATLAS.pixelsPerWorldAtUnitSeverity / severity;
          this.writeEffectSurface(plateCount, smoke ? (slot.contactLayer === 2 ? 8 : 9) : flash ? 6 : 7, opacity, age,
            smoke ? 0 : size * pixelsPerWorld,
            smoke ? 0 : size * (flash ? .82 : .70) * pixelsPerWorld);''')
s=replace(s,"    this.explosionPlates.geometry.getAttribute('aEffectSurface').needsUpdate = true;", "    this.explosionPlates.geometry.getAttribute('aEffectSurface').needsUpdate = true;\n    this.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan').needsUpdate = true;")
s=replace(s,'  private writeEffectSurface(index: number, kind: number, opacity: number, seed: number): void {\n    this.explosionPlates.geometry.getAttribute(\'aEffectSurface\').setXYZ(index, kind, opacity, seed);', '''  private writeEffectSurface(index: number, kind: number, opacity: number, seed: number, spanX = 0, spanY = 0): void {
    this.explosionPlates.geometry.getAttribute('aEffectSurface').setXYZ(index, kind, opacity, seed);
    this.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan').setXY(index, spanX, spanY);''')
p=b/'candidate'/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
rel=rels[1];s=(b/'before'/rel).read_text()
s=replace(s,'private readonly galacticEffects = new GalacticEffectsView();', "private readonly galacticEffects = new GalacticEffectsView({\n    flameAtlas: { url: '/assets/fx/inkstorm/rupture-flame-v1.png' },\n  });")
s=replace(s,'      game: {','      game: {\n        flameAtlas: this.galacticEffects.flameAtlasDiagnostics,')
p=b/'candidate'/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
print('Private candidate written; no live/public files changed.')
