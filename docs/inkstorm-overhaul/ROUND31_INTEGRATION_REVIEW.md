# Round 31 source integration review

Reviewed the installed course-9 launch field, fork guidance hook, open-cockpit asset definition, and edition archive boundary. This is a source/code review with bounded CPU checks; it does not establish visual readability, physical driving quality, browser lifecycle behavior, or performance acceptance. No browser, Blender, GPU, network, runtime, or public-asset writes were used for this review. The fork source was authored by this reviewer earlier; its integration was checked here, not treated as an independent visual critique.

## Finding resolved: preserve the old edition outside the intentional launch edit

Replacing the single whole-route SHA with a course-9 SHA would allow unrelated lane changes to enter the new snapshot unnoticed. The three edited historical tests themselves are narrow: `tests/terrain/connectedLaunchRidge.test.ts:7` selects the new edition fixture; `tests/terrain/erodedLaunchRidge.test.ts:51` changes only the bowl expectation while retaining the old finish-grid SHA; `tests/terrain/launchElevationProfile.test.ts:13` deliberately changes the descent to 137–139 m and maximum grade to <0.49. Its floor, return, branch, checkpoint, and CPU/render-height checks remain. The old fixture and pre-edit test copies remain present. The salt sightline thresholds were not weakened.

Added `tests/terrain/launchEdition31.test.ts:10` with independently derived **course-8** expectations from the preserved baseline binary grids, rather than deriving expectations from the installed candidate. Fixed old profile endpoints and an explicit 18 m sampling guard prevent the exclusion region silently growing with future edits (`:16`, `:30`). Results:

| Protected samples | Count | Old/current SHA-256 | Largest difference |
| --- | ---: | --- | ---: |
| Main lanes, shoulders and .85/1.15 m normal taps outside the fixed launch extent | 195,426 | `8fc5f08e149c6fa0eec54c1818342342460abda936109726cb57ec570114681a` | 0 |
| All alternate routes, shoulders and normal taps | 16,200 | `b1ec55ed08e4f71d4eaf345a5441995b10113397e29981af9161d9a12cf03b64` | 0 |

These are sampled drivable-corridor invariants, not a claim that all off-road launch texels are unchanged. The new throat intentionally changes off-road terrain. The original launch-grid input SHA is `0cb508909165f1c2fda5fbcd9c01c2a7b9db6915f78b8578b03571a8a96b649b`; the original and installed finish grid both hash to `bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`.

## Integration observations

- **Physical field and texture contract:** `src/game/race/CourseGulfField.ts:453` moves the crest/floor 20 m earlier and deepens the floor 44 m; start/return endpoints remain fixed. `:470` preserves the original texel origin. The throat uses an eight-cell fade outside protected segments (`:320`, `:333`); the local leading-radius correction rejoins within 30 m (`:102`). CPU bilinear sampling and signed-field composition are unchanged (`:46`, `:63`). Both R32F layouts remain 417²/257² at 6 m, totaling the same 959,752 data bytes. The new test pins their origins, sizes and byte counts. The steeper physical descent requires root's driving checks; source hashes cannot establish its feel.
- **Fork ownership and material contract:** the installed module matches the staged source exactly after import relocation. `src/render/inkstorm/InkstormWorld.ts:121` adds its mesh to the existing owned `roads` list, whose geometry and both materials are disposed on course replacement (`:109`, `:20`) and world disposal (`:231`). Shadow clones borrow the source resources (`:190`). `src/render/inkstorm/InkstormForkWayfinding.ts:155` disposes temporary box and merge geometries; its two groups use world-space machinery shading and opaque vertex-color graphics (`:170`). It adds no textures, UV dependency, or frame callback. Earlier source audit measured 780 triangles, 84,240 attribute bytes, two beauty draws, and minimum full-box XZ route clearance 4.186820 m. That geometric evidence does not prove the advance board is visible at chase speed or clear of every scenery triangle.
- **Open cockpit budget, maps and cache identity:** `src/game/vehicleAppearance.ts:87` changes both revision and URL while keeping pilot prefix, attachments and surface styles. The actual installed GLB hashes to `e7fe0097061d6af30a73538e10608ed8956c6565c3c9fd1fe745d8bf521c03b0`, with 57,234 triangles, 11 referenced opaque primitive draws (5 body/6 pilot), authored positions/normals and the required texture UV channels. No skins/animations were found. Compared with V4C, this is 2,090 fewer triangles, two more draws and 933,072 more file bytes; unchanged limits are 60,000 triangles and 12 total/6 body/6 pilot draws. Runtime validation still rejects unsupported surfaces and exceeded limits (`src/render/vehicles/ImportedVehiclePresentation.ts:359`, `:385`). The library keys templates by id/revision/URL (`src/render/vehicles/VehicleArtLibrary.ts:48`); stale requests release leases (`ImportedVehiclePresentation.ts:273`), replacements release old prepared resources (`:340`), and template disposal deduplicates shared geometries/materials/textures (`VehicleArtLibrary.ts:56`). No new ownership regression was identified from the definition-only change.
- **Edition archives:** `src/game/mastery/events.ts:6` advances the generator to course 9; drive/rules identities remain unchanged. Existing parser logic archives mismatched records with `ghost: null` and separates old favorites (`src/game/mastery/storage.ts:106`, `:118`), retains history (`:122`), and deduplicates bounded archives (`:150`). Thus old PB/ghosts cannot become current comparison targets. This is the existing global edition rule, so it also archives records for other seeds; it is not a per-seed migration. Focused archive tests passed, including repeated save/load and quota fallback.
- **Asset test discovery:** `vitest.config.ts:6` now includes both `.ts` and `.mjs` tests under `tests/`, so the published-asset hash/triangle checks actually execute. The new hero expectations are at `tests/settings/vehicleAppearanceAssets.test.mjs:26`; prior pilot/material and attachment checks remain, and rival/Sebulba contracts remain covered.

## Verification and handoff

`npx --no-install vitest run tests/terrain/launchEdition31.test.ts tests/race/masteryArchive.test.ts tests/settings/vehicleAppearanceAssets.test.mjs` — **3 files / 10 tests passed**, 596 ms. Independent baseline/current comparison above also completed with zero protected-sample differences. Full browser diagnostics, final driving runs and build acceptance remain root-owned; this review makes no blanket acceptance claim. No additional concrete runtime regression was found in the reviewed changes.

Files written by this review: this report and `tests/terrain/launchEdition31.test.ts` only.

Reviewed source hashes:

```text
8b76e3a68e5e613484bc3d4cf46ab94b7d4781161dee1300cba5190a2c71bc48  src/game/race/CourseGulfField.ts
3ad51b6d470d18dd85f9ab8c778f0c3c6602aeaf9f3fd557bcf7f8e074066353  src/render/inkstorm/InkstormForkWayfinding.ts
a9dd34b0e6c97eb09f4cae4be6fd96dd42b8c74d0588c22a7a4643c1da12e72d  src/game/mastery/events.ts
1cee8a57ddd0d8e61af961a6d925ccd2d75b34ac3c41d858e68d34874b7b4e10  src/game/vehicleAppearance.ts
f30ae215194f07e427403854680a60df4f489ac3ce6cbac0d637ad6b05793762  tests/terrain/launchEdition31.test.ts
```

## Final31 V2 addendum — bounded source review

This addendum supersedes only the V1 asset observations above. It does not replace the earlier terrain isolation results. Root reported the final `npm run verify` pass; this reviewer did not repeat it or run browsers, Blender, timing, or broad audits. Only small source and GLB header/payload reads were performed, with no runtime/test/public changes.

The actual `public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb` is byte-identical to `assets/source/inkstorm/teemto-open-cockpit-round31/v2/teemto-open-cockpit-round31-v2-candidate.glb`: SHA-256 `af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e`, 7,698,824 bytes. A traversal from the default glTF scene reaches all 14 nodes and references every one of the ten mesh definitions exactly once. It yields 41,839 body + 15,779 pilot = 57,618 triangles and 4 body + 6 pilot = 10 opaque draws, matching the source packaging receipt, metadata, asset test and acceptance harness. This stays within the unchanged 60,000-triangle / 6-body / 6-pilot / 12-total limits. Relative to V1: +384 triangles, one fewer draw, and 8,660 fewer delivery bytes.

- **References and fault harness agree.** `src/game/vehicleAppearance.ts:87` uses revision `teemto-open-cockpit-v2` and the V2 URL; the pilot prefix, attachments and style definitions stay intact. `tests/settings/vehicleAppearanceAssets.test.mjs:26` pins 57,618 and the exact V2 hash. `scripts/vehicle-appearance-acceptance.mjs:219` hashes the served V2 bytes against the source fixture; `:247` checks the same geometry/body/pilot counts, with ten prepass registrations at `:250` and `:277`. Its cancellation case also expects ten (`:100`). Injection and removal both target `**/assets/inkstorm/vehicles/teemto-hero-open-v2.glb` (`:327`, `:340`), and request allowlists include V2 (`:204`, `:348`). `scripts/inkstorm-pilot-detail.mjs:16` hashes the current V2 artifact. Remaining V1 URLs found in this bounded scope belong to preserved `runtime-before` evidence, not the active harness.
- **Material and UV contracts pass the independent header check.** All ten primitives are opaque triangles with positions/normals; each referenced base/normal/roughness/occlusion/emissive texture channel, including any UV-channel override, has the corresponding UV accessor with the matching vertex count. All six pilot primitives retain tangents, normal maps and metallic/roughness maps. There are nine used material definitions, no skins and no animations. The package retains the original V4C BIN chunk's 6,763,760 bytes exactly as its prefix, independently checked against the preserved public V4C file. Public V1 still hashes to `e7fe0097061d6af30a73538e10608ed8956c6565c3c9fd1fe745d8bf521c03b0`. The source `uv-area-receipt.json` reports 234 inherited zero-area hull UV triangles in both V1 and V2; that receipt was read, not recalculated here. Valid UV references do not establish attractive atlas mapping or rendered material quality.
- **Fork ownership is unchanged.** The installed module still hashes to `3ad51b6d470d18dd85f9ab8c778f0c3c6602aeaf9f3fd557bcf7f8e074066353`. The hook remains in the owned roads list at `src/render/inkstorm/InkstormWorld.ts:121`; course replacement and disposal still release its geometry and both materials (`:109`, `:231`, helper `:20`). Shadow clones continue to borrow those resources (`:194`). There is no V2 coupling to the fork's geometry, update path or material ownership.

**No concrete V2 integration or fork ownership bug was identified in this bounded review.** The source README's residual visual concerns and the fresh image critic remain separate from these contract checks. This addendum does not assert that cockpit appearance, driver visibility or FPS is accepted.

```text
220bfa4ed9fb0375c0a22efcc3fe1d1dcd77d25db95bb71cdaa609100ab1fb5f  src/game/vehicleAppearance.ts
1a08d342602d069d75d78b58dc70338e13d1e6203c45e06a883fd84ad22c2b39  scripts/vehicle-appearance-acceptance.mjs
8f7c4bdf2054788b74960dcd9fbbe8458d715303132e5557ab194ffadb9c3149  tests/settings/vehicleAppearanceAssets.test.mjs
74ac21c8367fc74c51036d1bb1fa897bae0abbdbc4ed795d35253f36be9eaee0  src/render/inkstorm/InkstormWorld.ts
```


## Final V2 follow-up — root review, 8 September 2026

This follow-up is a direct root source/runtime review, not a new blind or independent agent verdict. The requested independent worker hit its account usage limit. The earlier independent field/fork review above remains intact.

The installed `teemto-hero-open-v2.glb` matches source package SHA256 `af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e`. Its 10 referenced opaque primitives contain 57,618 triangles: four body primitives / 41,839 triangles and six pilot primitives / 15,779 triangles. All mesh definitions are referenced; position/normal/UV accessor counts agree. The source preservation receipt separately retains original engine/pilot arrays, atlas bytes and hierarchy. Budgets remain 60,000 triangles, six body draws, six pilot draws and twelve total. Runtime revision and both asset-failure URLs point to V2.

A real browser diagnostic caught a missed harness update: the initial `vehicle-appearance-round31-final` run still required V4C's 59,324 triangles, three body draws, nine prepasses and 43,545 shadow triangles. Its failed receipt and the old harness are preserved. The corrected fixture independently pins the served V2 SHA256 and its authored counts; no runtime budget or fallback threshold was relaxed. `vehicle-appearance-round31-final-v2-counts` passes all 14 stages, including selection persistence, late-load cancellation, return-to-Teemto registration, four-body-mesh shadow submission, context restoration, and intentional HTTP503 fallback/Retry for both families. Only the two intentionally injected 503 console errors appear.

Final context recovery and incomplete-framebuffer fallback pass on the installed V2; four body casters submit 41,839 triangles. Three restart cycles plateau at 212 geometries, 112 textures and 49 programs, with no browser errors. These are renderer counters, not GPU memory-byte or leak-freedom proof. All four diagnostic ports, including the failed attempt, are closed. The full verification log records 600 tests / 108 files, typecheck and production build PASS; the fixture-only correction does not alter that bundle. Exact full-race evidence is recorded separately.

The fresh cockpit image critic retains V2 over V1 but rejects finished cockpit acceptance (6/10), and the fresh seven-section critic reports strict parity FAIL, 0/7, mean 4.79/10. Technical admission and reliable loading do not change either art verdict.
