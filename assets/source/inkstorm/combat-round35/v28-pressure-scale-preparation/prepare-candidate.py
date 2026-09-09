from pathlib import Path
import shutil
b=Path(__file__).resolve().parent;r=Path('/Users/amir/Projects/PodRacing')
rels=['src/render/galactic/GalacticEffectsView.ts','src/render/galactic/RuptureFlameAtlas.ts','tests/render/RuptureAtlasPixels.test.ts','tests/render/RuptureAtlasIntegration.test.ts']
def replace(s,a,z):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,z)
for rel in rels:
 p=b/'before'/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists(): shutil.copy2(r/rel,p)
 assert p.read_bytes()==(r/rel).read_bytes(), 'source moved: '+rel
 p=b/'candidate'/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(r/rel,p)
p=b/'candidate/src/render/galactic/RuptureFlameAtlas.ts';s=p.read_text()
s=replace(s,'  // At severity2 one source pixel spans1/120m. The same scale applies to all\n  // four drawings despite their unequal rectangles and existing plate pulses.', '  // Base sampling scale: at severity2 one source pixel spans1/120m, before\n  // the authored pressure/fire optical envelope below. Original pixels/roots\n  // remain immutable; the three fire drawings share the same event-age scale.')
needle='export interface RuptureAtlasOptions {'
s=replace(s,needle,'''/** Optical extent only; pressure/fire clocks and roots stay in the FX owner.
 * The larger short pressure gives way to a smaller lingering burn. */
export function ruptureArtworkScale(pressure: boolean, age: number): number {
  if (pressure) return 1.8;
  const t = Number.isFinite(age) ? Math.max(0, Math.min(1, age / .60)) : 0;
  return 1.6 - .45 * t * t * (3 - 2 * t);
}

'''+needle);p.write_text(s)
p=b/'candidate/src/render/galactic/GalacticEffectsView.ts';s=p.read_text()
s=replace(s,'RUPTURE_FLAME_ATLAS, RuptureFlameAtlas, type', 'RUPTURE_FLAME_ATLAS, RuptureFlameAtlas, ruptureArtworkScale, type')
s=replace(s,'        const azimuth = (fragment % 6 + .15 + hash01(seed + 17) * .7) * Math.PI / 3;', '''        // Leaders1/7/13 previously shared sector1, hiding their silhouette
        // punctuation in one lane. Keep satellites unchanged; place the three
        // leaders in separate outward sectors of the same source-normal cone.
        const sector = fragment % 6 === 1 ? Math.floor(fragment / 6) * 2 : fragment % 6;
        const azimuth = (sector + .15 + hash01(seed + 17) * .7) * Math.PI / 3;''')
s=replace(s,'slot.scale = (fragment % 6 === 1 ? .91 + hash01(seed + 10) * .16', 'slot.scale = (fragment % 6 === 1 ? (.91 + hash01(seed + 10) * .16) * 1.15')
s=replace(s,'          const size = slot.scale * (smoke ? .74 + progress * .62 : flash ? .78 + progress * .22 : .90 + Math.sin(age * 19) * .05);', '''          const opticalScale = smoke ? 1 : ruptureArtworkScale(flash, age);
          // Enlarge the existing plate/cull volume together. Changing only UV
          // scale would clip the artwork against the previous quad boundary.
          const size = slot.scale * (smoke ? .74 + progress * .62 : flash ? .78 + progress * .22 : .90 + Math.sin(age * 19) * .05) * opticalScale;''')
s=replace(s,'          const pixelsPerWorld = RUPTURE_FLAME_ATLAS.pixelsPerWorldAtUnitSeverity / severity;', '''          const pixelsPerWorld = RUPTURE_FLAME_ATLAS.pixelsPerWorldAtUnitSeverity / (severity * opticalScale);''')
p.write_text(s)
p=b/'candidate/tests/render/RuptureAtlasPixels.test.ts';s=p.read_text()
s=replace(s,'fits all artwork within existing hot plate/ground envelopes', 'fits all artwork within the hot quads without borrowing the generic ground clamp')
s=replace(s,'      // Existing source-ground hot-volume clearance .64*3.6 per severity.\n      expect(e.radius / 240).toBeLessThan(3.6 * .64);', '''      // Authored roots do not use the generic .64*3.6 birth ground clamp.
      // Optical growth scales quad and culling sphere together, so normalized
      // containment is unchanged. Natural terrain/depth occlusion is allowed.
      expect(e.radius).toBeLessThan(halfX * 1.9 - 1);''');p.write_text(s)
p=b/'candidate/tests/render/RuptureAtlasIntegration.test.ts';s=p.read_text()
s=replace(s,"import { type RuptureAtlasOptions }", "import { ruptureArtworkScale, type RuptureAtlasOptions }")
s=replace(s,'with shared pixels/world despite unequal rectangles and pulse/stretch', 'with one animated optical scale despite unequal rectangles and pulse/stretch')
s=replace(s,'          expect(metresPerPixelX).toBeCloseTo(1 / 120, 7); expect(metresPerPixelY).toBeCloseTo(1 / 120, 7);', '''          const fireAge = kind.getX(i) === 6 ? age : age - .065;
          const scale = ruptureArtworkScale(kind.getX(i) === 6, fireAge);
          expect(metresPerPixelX).toBeCloseTo(scale / 120, 7); expect(metresPerPixelY).toBeCloseTo(scale / 120, 7);''');p.write_text(s)
print('Private V28 candidate prepared; no live source/public changes.')
