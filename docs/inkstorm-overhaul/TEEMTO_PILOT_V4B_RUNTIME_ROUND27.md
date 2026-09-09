# Teemto pilot V4B runtime integration — round27

The V4B hero passes the current 14-stage functional vehicle appearance check and is wired into the local game. **Art acceptance remains FAIL; no current-revision full-race performance claim is made.** The new public filename preserves the old hero and rival files. This report records integration evidence, not target parity or a release.

## Exact runtime candidate

| Item | Verified value |
| --- | --- |
| Hero metadata | `src/game/vehicleAppearance.ts`: revision `teemto-pilot-v4b` |
| Runtime asset | `public/assets/inkstorm/vehicles/teemto-hero-v4b.glb` |
| Asset SHA256 | `838d71f3ac2e79dda66ada37ac367fe66f0d9885b166b7fe12829416befcfa6c` |
| Asset bytes | 5,518,932 |
| Geometry | 59,324 triangles; nine primitives; eight materials |
| Original pilot | 15,779 triangles; six primitives and six separate materials |
| Captured build | `dist/assets/index-RpVKPyUw.js`, 1,563,500 bytes |
| Build SHA256 | `13c08579eae363aad38564be38c003f243e3c5d8fbe7047b0cf8b6be97450e24` |

The public asset is byte-identical to `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b/teemto-pilot-v4b-runtime.glb`. The rival remains revision `teemto-v1` at `teemto-rival.glb`. Sebulba metadata and assets are unchanged. The two families still have four logical hero/rival variants; five public GLB files are preserved because Teemto has both its historical and current hero revisions.

## Source and construction provenance

The licensed body comes from Teemto Pagalies' Podracer, UID `4eff45899ada40bb920c5c744663db90`, by Rafael Fernández Calvo (`rafarelo`). Saved official model/license receipts record CC BY 4.0, and public attribution remains in `public/assets/inkstorm/vehicles/ATTRIBUTION.md`. The original imported-source GLB is 69,550,360 bytes with SHA256 `b7e2cc046fd392659886b1af88bdda1117037009351493f69dccdf78c4c53836`. This is a preserved Blender MCP imported-source export; no untouched artist archive is claimed. The inspected source cockpit is empty.

The helmeted static pilot is original procedural geometry built through Blender MCP against the existing Inkstorm imagegen guide. V4B uses actual triangular garment panels, seams clipped to the rendered surface, a compact rounded collar, and revised cuff overlap. It is not an animated or rigged driver. The study scenes, source scripts, map bakes, three matching review views, and seven context-restoration receipts are documented in the isolated [V4B handoff](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b/HANDOFF.md). V4 and all earlier candidates remain preserved.

## Body, names, anchors, and maps

The runtime contract retains `teemto-cockpit-body`, `teemto-engine-left-body`, and `teemto-engine-right-body`, with groups `teemto-cockpit.001`, `teemto-engine-left.001`, and `teemto-engine-right.001`. All six pilot mesh names begin `teemto-pilot-`. Runtime attachment metadata is unchanged, including the pilot anchor `(0,2.2,-5.2)` and existing exhaust/coupling anchors.

[Decoded runtime validation](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b/runtime-validation.json) compares every ordered indexed body triangle corner against the preserved public V1 hero. All hierarchy transforms are exactly identity. World-space positions, normals, and UVs have **zero absolute component error** across 19,965 cockpit triangles and 11,790 triangles in each engine, totaling 43,545. The same Y-up, +Z-forward runtime basis, licensed seats, controls, hoses, and body placement are retained. All 15,779 pilot triangles also compare exactly before and after packaging.

The six pilot materials share a 2048×2048 WebP color atlas, a 1024×1024 PNG tangent-space normal atlas, and a 1024×1024 PNG roughness atlas. Every map uses UV0 without texture transforms. Normal scale and roughness factor are 1; the actual roughness image has varying green values 64–255 and red/blue values 255. All six pilot primitives carry authored MikkTSpace tangents. Twelve tiny rubber triangle corners required a stable perpendicular fallback when MikkTSpace returned zero; their near-zero UV determinants and areas are recorded in the source audit. Geometry and normals were not changed for that fallback.

The final GLB has five total textures, only `EXT_texture_webp`, and no skin, animation, extras, camera, or light payload. [Khronos validation](../../assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b/gltf-validator-runtime.json) reports **0 errors, 0 warnings**, and two informational notices for the pre-existing 1254×1254 body maps.

## Actual browser evidence

Both browser receipts identify the exact build above, Chrome 152.0.7977.77, macOS arm64, and a 1440×900 CSS viewport. The world capture requested DPR 1.5; the appearance harness requested DPR 2. These are local functional captures, not a full-race benchmark.

- `output/gauntlet/round27-v4b/receipts.json`: SHA256 `4fd42918a5e610f1ab62a56f99b5b87e51af48934e9ed86e32759639aea478c6`. Twelve images cover seven course sections, launch crest/descent, arch underside, garage, and ordinary live drive. The receipt contains zero browser errors.
- `output/playwright/vehicle-appearance-round27-v4b/receipt.json`: SHA256 `13bfb65c1796b173a084af8ca425d4f2f1f9dac5cded7d00bfc594c3a2f28796`. Outcome **PASS**, 2026-09-07 18:54:18.076–18:54:53.504 UTC. Harness SHA256 `051b20d839cd2393e15f5af75e0ff9608195e7afd73945fe858421fe3d7425eb`.

The 14 appearance stages are `garage-teemto`, `garage-classic`, `garage-teemto-return`, `live-teemto`, `restored-teemto`, `http-fallback`, `http-retry-teemto`, `sebulba-late-load-cancelled`, `garage-sebulba`, `garage-sebulba-angle-90`, `garage-sebulba-angle-180`, `live-sebulba`, `sebulba-http-fallback`, and `sebulba-http-retry`.

Ready V4B stages show the actual embedded pilot, nine visible/registered MRT prepasses, three body draws, six pilot draws, and 59,324 triangles. The body shadow remains three draws over the same 43,545 body triangles. The rival still reports seven meshes and four pilot draws. Actual Teemto WebGL restoration, Classic/Teemto selection persistence, late Sebulba cancellation, and explicit fallback/Retry pass. The only two errors are the deliberately injected HTTP 503 responses, one per model. The delayed Sebulba preview changes from Preparing to ready while the simulation frame remains **0→0**. This is not evidence of Sebulba-specific WebGL restoration.

The [surface-map GPU comparison](../../output/gauntlet/surface-map-validation-round27-retry/report.json) passes all 13 cases with no errors: authored and derived tangent frames, mirrored/transformed UVs, back faces, mirrored/nonuniform models, collapsed-UV finite fallback, and green-channel roughness. This proves the tested shader semantics, not the pilot's visual quality. `output/gauntlet/round27-v4b-verify.log` records 550 passing tests in 98 files, typecheck, and build; the integration diff check passed.

## Unfinished acceptance

The fresh [round27 blind art review](BLIND_ART_ROUND27_CURRENT.md) rated source-render V4 A **6.5/10** and V4B B **6.0/10**. B's shorter neck transition and construction corrections help, but its smoother gray torso, sleeves, cuffs, and gloves lose textile character and read as rubber or a toy. The critic prefers A overall as a material result, while noting A's weave is itself too coarse. Neither reaches 8/10.

Those source renders do not establish the result under the game's Cel material. Actual in-world driver closeups are still being gathered before a material restoration decision. V4B remains the integrated review candidate; no further asset change is implied by this report. The full-race round26 PASS remains historical and does **not** apply to this new asset/build. No art parity, current 40–60 FPS, full game acceptance, or deployment is claimed.

## Manifest preservation

The manifest update changes only Teemto's current export/runtime record, appends its prior records to history, updates the timestamp, and adds the separate physical-file counter. All 28 other model entries, acquisition state, existing global history/checkpoints, old rival metadata, and the complete historical round26 performance object compare unchanged. Logical variant counts remain Teemto 2 / total 4; physical GLB counts are Teemto 3 / total 5. Pre-update manifest SHA256: `cce7d8fd81923543407b6fd8ab148fc3e0e5c57acf29407a18716e903f89cef4`; resulting SHA256: `f9fde6cbf075d399a97dbd1a1eb06b2263828e93da507bd82e5c171c4dc8e61e`.
