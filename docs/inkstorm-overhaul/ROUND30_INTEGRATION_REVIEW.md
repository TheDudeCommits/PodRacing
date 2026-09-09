# Round 30 integration review

Reviewed 2026-09-08 in `/Users/amir/Projects/PodRacing` against the working-tree integration. Scope: pit atlas ownership/material binding and mastery pursuit/record semantics. No browser, GPU, image acceptance, full-suite, or deployment verification was performed by this reviewer.

## Finding and fix

**[P2, fixed] A new total PB could carry a pursuit against the record it replaced.** `src/game/mastery/RaceMastery.ts:124-127` replaces the stored PB, while `:135` compares finished sectors with the previous PB. Before the fix, the retry target was also derived from those old comparisons for a new PB. A bounded fixture reproduced an old `[50, 50]` record being replaced by `[45, 52]` (97s), yet carrying a sector-2 target of 50s. `src/ui/RaceHud.ts:1165` and `:1255` label that target “PB”; the next run actually uses the new stored sectors (`src/game/mastery/RaceMastery.ts:68`), so pursuit and live pace referred to different records.

The authorized fix at `src/game/mastery/RaceMastery.ts:136-139` permits carried pursuits only for valid runs that do not replace the PB. Historical result deltas remain available. The regression at `tests/race/mastery.test.ts:81-101` first establishes a pursuit, then sets a faster total with a slower sector, checks that the pursuit clears, retains the historical `[-5, +2]` result deltas, and verifies the following run compares a 47s sector against the new 45s PB sector (`+2s`).

No additional concrete regression was established in the reviewed pit integration. This is a scoped source-review result, not acceptance of the visual result or whole release.

## Pit ownership and material evidence

- `src/render/inkstorm/InkstormWorld.ts:55-71` waits for all model results and the atlas outcome. Missing map, model rejection, missing pit UV1, or disposal during loading release the returned atlas and fulfilled model meshes before failing/returning.
- `src/render/inkstorm/InkstormWorld.ts:73-98` retains one per-world atlas, sets `SRGBColorSpace` and `flipY=false`, preserves UV1 through clone/merge, and binds the bake only to the pit-complex family. `:228` releases the owned atlas and clears its reference on disposal.
- Read-only GLB JSON inspection found one mesh/primitive in the installed `public/assets/inkstorm/pit-complex-light-v1.glb`, with `COLOR_0`, `NORMAL`, `POSITION`, `TEXCOORD_0`, and `TEXCOORD_1`, and no embedded images/textures. The district remains unbaked, as configured.
- `src/render/inkstorm/InkstormSurfaceMaterial.ts:39-50` gates the bake shader and UV1 attribute; `:69-70` forwards the paired UVs. `:264-267` multiplies the decoded direct-light response by base color, decode range, and intensity. Source metadata in `assets/source/inkstorm/workshop-lighting-round30/pit-complex-workshop-light.png.json:10-14` specifies the same decode range (4), sRGB encoding, and orientation. This static consistency does not establish shader compilation, filtering quality, or light placement in the final image.

## Verification and remaining useful checks

- Executed `npx vitest run tests/race/mastery.test.ts tests/race/masteryPursuit.test.ts tests/race/masteryArchive.test.ts`: **3 files / 26 tests passed**, 1.73s. Scoped `git diff --check` passed.
- Inspected existing `tests/render/inkstormWorkshopAssets.test.ts:20-79`; it covers UV1 clone/merge/binding, late disposal, missing atlas, and missing UV1. It was not rerun by this reviewer.
- A useful additional ownership test is a **rejected GLB request after the atlas and some other models have fulfilled**, asserting each fulfilled resource is released and no child batches survive. This follows a distinct branch at `InkstormWorld.ts:60-71`; current failure tests cover map/UV failures.
- A useful additional lifecycle test is **one successful world followed by a second successful world**, disposing the first and asserting the second atlas remains owned until its own disposal. This checks per-world texture ownership independently of the intentionally shared paint uniforms.
- GPU shader compilation, real loading failures in the application, final image review, and full-suite verification remain with the integrating agent. No public assets or rendering files were edited by this reviewer; only the authorized mastery source/test fix and this report were written.
