# Polwo source production plan — round 32

Prepared 2026-09-08 from local source receipts, GLB headers/accessors, the round32 concept, and the current import adapter. This is a production plan and a source packaging workflow, not visual acceptance or a runtime integration receipt. The fitted assets and all original source files remain unchanged by this task. Blender driver fitting is owned by the root task; this task did not use Blender or a browser.

The hero already fits the geometry budget. Optimize the texture payload first, preserve the fitted geometry and mapped surface detail, then validate the smaller derivative in the actual garage and race. A separate rival mesh LOD is required: even the vehicle without its driver exceeds the rival triangle cap.

## Source and identity

The stored official metadata identifies [Anakin's pod Star Wars](https://sketchfab.com/3d-models/anakins-pod-star-wars-5a3422df6f894b48b846d590cdc2bf4c), by [Nolan “Polwo” Zannato](https://sketchfab.com/polwo), UID `5a3422df6f894b48b846d590cdc2bf4c`. “Polwo” is the creator handle used for the internal asset key, not the model's original title. Metadata retrieved at `2026-09-08T07:17:15.574718+00:00` reports CC Attribution, links [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/), and requires author credit. Preserve that title, author, model URL, license link, and a description of the adaptation in the eventual attribution entry.

Authoritative local inputs:

- `assets/source/inkstorm/vehicles/5a3422df6f894b48b846d590cdc2bf4c/source-imported.glb`
- Its `official-metadata-20260908.json` and `mcp-download-20260908.json` receipts.
- `assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1.glb`, SHA-256 `613150987120ca89f9bb2c2085441f6fb0af0c56e77111dbe027348be260e49b`.
- V2 fit `polwo-driver-fit-v2.glb`, SHA-256 `15f8713535806584ca90cb2b2f8aa7099b752170de937cb35108a6224d39d31f` at inspection. V2 driver acceptance is still a separate gate.
- `docs/inkstorm-overhaul/concepts/10-polwo-vehicle-round32.png`, a styling target, not evidence of the fitted source's geometry or material quality.

The metadata's 33,088 faces and 19,097 vertices describe the upstream listing. The actual fit's indexed primitive counts below control admission; do not substitute listing counts or assume why they differ.

## Measured fit snapshot

| Item | V1 fit | V2 fit observed during this plan |
|---|---:|---:|
| GLB file bytes | 55,185,416 | 56,729,644 |
| Referenced triangles | 48,843 | 48,843 |
| Body triangles | 33,064 | 33,064 |
| Pilot triangles | 15,779 | 15,779 |
| Meshes / materials / opaque primitive draws | 8 / 8 / 8 | 8 / 8 / 8 |
| Body / pilot draws with correct prefix | 2 / 6 | 2 / 6 |
| Unique image payloads / texture definitions | 6 / 21 | 6 / 21 |
| Tangent attributes | Missing on all eight meshes | Present on all eight meshes |

Body mesh 0 contains 32,520 triangles and spans the entire normalized vehicle. Mesh 1 is the untextured antenna, 544 triangles. The source materials are `Material_6` and `antenne_low__0`. There are six separate pilot material parts: accent, hardware, rubber, shell, suit, webbing. Pilot suit alone is 9,359 triangles.

The main-body bounds in the fit are approximately 10.695 m wide, 5.573 m high, and 30 m long, in the documented +Z-forward/+Y-up basis. Do not infer an additional pitch correction, change dimensions, or move engines during packaging. The V1 receipt's pilot root position `[0, 4.35253238678, -5.20000076294]` is historical fit evidence; it is not the approved V2 attachment contract.

The eight mesh nodes are flat scene roots with identity transforms. No engine pivot, seat, nozzle, or coupling anchors are exported. V2 carries Blender suffixes such as `polwo-pilot-suit.014 fit-v2`; normalize these deliberately at the packaging boundary and record the old-to-new names.

## Texture cost and derivative budgets

V1's six embedded images account for **52,794,426 bytes**, approximately 95.7% of its GLB. The three vehicle maps alone total 49,785,553 bytes. Geometry, JSON, and alignment account for the remaining 2,390,990 bytes. V2's added tangents increase geometry storage; they do not solve the image cost.

| Embedded image | Dimensions | Encoded bytes | Conservative RGBA8 + full mip estimate |
|---|---:|---:|---:|
| Vehicle base color, PNG | 4096² | 14,630,282 | 85.33 MiB |
| Vehicle normal, PNG | 4096² | 14,704,802 | 85.33 MiB |
| Vehicle ORM, PNG | 4096² | 20,450,469 | 85.33 MiB |
| Pilot base color, WebP | 2048² | 1,521,750 | 21.33 MiB |
| Pilot normal, PNG | 1024² | 931,598 | 5.33 MiB |
| Pilot roughness/metallic map, PNG | 1024² | 555,525 | 5.33 MiB |
| **Total** | | **52,794,426** | **about 288 MiB** |

This estimates unique decoded image storage, not measured GPU allocation. Encoded WebP/PNG size is not GPU memory. Texture wrappers, sharing, driver formats, and other render resources require actual renderer measurement.

The root task requests a **24 MiB decoded cap** for this derivative. Interpret that conservatively as RGBA8 with the entire mip chain. The staged packager uses vehicle color/normal/ORM at 1024² each, pilot color at 1024², and pilot normal/roughness at 512² each. For these square maps, the estimate is 25,165,816 bytes, just below 24 MiB. Keep the 2048² painted body bake as a separate source master; it cannot remain 2048² in this six-map runtime package under this cap. Reduced map resolution is an explicit visual tradeoff requiring close inspection.

| Variant | Geometry ceiling / target | Draw ceiling / target | Texture target | Encoded file target |
|---|---|---|---|---|
| Hero | Hard 60,000; preserve current 48,843 | Hard 6 body + 6 pilot / 12 total; current 2 + 6 / 8 | ≤24 MiB including mips; map caps above | ≤12 MiB |
| Rival | Hard 30,000; target ≤29,000 | Same hard ceilings; prefer ≤8 total | Root tightened to ≤6 MiB including mips; body color/normal/ORM 512², pilot color 512² + normal/roughness 256² | ≤4 MiB |

The table records production budgets; the final source results below now meet them. Hiding the pilot at a lower display LOD does not bypass the import admission count. The unsimplified body alone exceeds 30,000 by 3,064 triangles; the original combined fit exceeds it by 18,843. Do not raise the runtime limit to accept it.

## Material and glTF issues

1. The 21 texture definitions refer to only six image payloads. The repeated pilot texture records have equivalent sampler/image bindings. Deduplicate exact records and remap material texture indices, preserving texture transforms and UV channel choices. This reduces redundant definitions; measure actual loader/renderer texture sharing rather than claiming an allocation reduction from JSON counts alone.
2. The source's three maps share the vehicle atlas. Its normal and ORM maps use linear data; base color uses sRGB. Keep ORM channels R=occlusion, G=roughness, B=metallic. The current `CelMaterial` samples roughness from **G** and retains its authored factor; the imported adapter does not transfer AO or metallic maps into corresponding shader inputs. Normal and color survive conversion. Retain the original ORM payload in source even when runtime currently uses only roughness.
3. V1 has no tangents. The importer permits missing tangents and uses derivative tangent calculation; V2 now exports tangents. Preserve those V2 tangent bytes, including handedness, along with positions, normals, UVs, and indices. Do not regenerate or green-flip normal maps during packaging.
4. All eight materials are opaque and double-sided. Do not enable blending, cutout, or alpha tricks. Evaluate whether closed surfaces can become front-sided in a separately reviewed derivative; do not globally change this on thin fins, cockpit panels, or the antenna.
5. `Material_6` has default metallic/roughness factors of 1 and a mapped ORM. Broad neutral surfaces can look overly reflective in the current shader. A localized derivative roughness correction belongs in the **G** channel or reviewed material response, not a color-map highlight painted over the issue. The proposed .45 roughness floor must preserve useful local contrast and be reviewed on the control panel and exposed engine metal. The packager itself adds no floor.
6. The antenna is untextured and has a separate .6 roughness material. Preserve it as hardware; a global livery tint is not an appropriate mapping strategy.

## Ordered source work

1. Freeze the accepted V2 driver fit and its source receipt after seat support, hand contact, intersections, and unchanged source silhouette have been checked. Hash the original download, V1, V2, and the accepted bake input. Work in new named source derivatives only.
2. Create a separate painted body base-color master from the original atlas with the **same UV layout**. Use source paint masks: yellow paint becomes burnt orange, blue paint becomes cobalt, and selected pale paint becomes warm ivory. Protect bare machinery, grime, shadows, bolts, stripes, and panel seams. Neutral metal may receive restrained cool-violet shadow color; do not turn every neutral panel ivory or recolor AO into paint. Preserve relative luminance and localized wear detail instead of applying one global saturated tint.
3. Match the concept's paint hierarchy and worn edges: cobalt/orange/ivory panels over dark articulated machinery, small edge chips and fastener wear, and a visibly supported driver in the open cockpit. The concept does not authorize replacing the source engine/cockpit geometry or inventing a new scale. Keep its mechanical detail legible and avoid broad mirror-like control panels.
4. Preserve original normal and ORM master maps. If adjusting roughness, save a named derivative and channel statistics; retain red/blue channels and document the green-channel change. Do not bake light/shadow effects into the original files. Review the 2048² painted master before downsampling.
5. Export the baked fit from the isolated Blender source scene with tangents. Package that **explicit input** with the staged script below. PNG output preserves resized channels losslessly. Color is filtered in linear light then stored as sRGB; normal vectors are filtered and renormalized without changing convention; ORM remains linear scalar data. No mesh accessor or existing transform changes are allowed.
6. Create a rival derivative later using protected UV/normal seams and explicit silhouette checks. Spend simplification first on hidden/redundant internal detail and dense pilot cloth; retain cockpit mouth, controls, cables, front spars, turbine/fin silhouette, and visible helmet/hands. A ratio-only decimator run is not approval. Preserve canonical nodes, material identities, attachments, and basis in both LODs.
7. Review original/master/packaged maps at identical close and full-vehicle framing. Then use actual garage, grid, launch, and chase captures with the unchanged game camera. Compare visible driver scale/contact, texture detail, surface wear, silhouette, and shading with the concept. Fresh critique and measured runtime behavior decide acceptance.

## Staged packaging tools

These new files are under `assets/source/inkstorm/polwo-driver-round32/`:

- `package-polwo-runtime.py`: explicit baked input → new named source-only GLB plus package receipt. Refuses overwrite and output outside this source directory (named subdirectories are allowed). Preserves all geometry/accessor bytes and existing node transforms/hierarchy, normalizes canonical node/pilot material names, repacks resized image payloads, removes obsolete WebP declarations, and deduplicates equivalent texture records.
- `diagnose-polwo-runtime.py`: read-only JSON report, with optional `--baseline` to compare geometry, transforms, material factors, UV/texture binding semantics, and image channel roles. Rejects bad indices, non-finite/incomplete attributes, malformed tangent vectors, missing mapped UVs, opaque/draw/triangle/texture budget failures, and unused mesh definitions. It does not prove browser import or visual quality.
- `_polwo_glb.py`: shared GLB reader and checks.
- `selftest-polwo-runtime.py`: synthetic linear-light color, ORM channel, normal renormalization, mip accounting, node-contract, and budget guard tests. These seven checks pass.

The root subsequently authorized a trial against `polwo-inkstorm-paint-v1-native.glb`, with output reserved under `packaged-paint-v1/`. Its first preflight stopped before any candidate write: the native bake contains **25 zero-length tangent vectors** (4 body, 20 pilot rubber, 1 pilot suit). Their W components are valid, but their XYZ vectors violate the current runtime import contract. See `paint-v1-tangent-failure-receipt.json`. Root then authorized `repair-polwo-zero-tangents.py` as a separate derivative. All 25 XYZ vectors were recovered from valid adjacent UV triangles, with no arbitrary fallback and W unchanged. Only 203 BIN bytes changed; all positions, normals, UVs, indices, images, and nonzero tangents remained exact. The subsequent paint trial packaged successfully, with its known shoulder holes still unaccepted.

Root's later shoulder V1 closed the geometry but had visible incorrect atlas samples. It is preserved as a failed source. The corrected `polwo-inkstorm-shoulders-v2-native.glb` keeps 132 new cap triangles and correct cloth UVs. The final source packages use this V2 source, not either failed shoulder/paint trial.

Use the bundled workspace Python, which supplies Pillow/numpy; the default shell Python lacks Pillow. A representative command after the corrected bake exists is:

```sh
/Users/amir/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/source/inkstorm/polwo-driver-round32/package-polwo-runtime.py --input assets/source/inkstorm/polwo-driver-round32/APPROVED-BAKED-INPUT.glb --output assets/source/inkstorm/polwo-driver-round32/polwo-hero-candidate-v1.glb
/Users/amir/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 assets/source/inkstorm/polwo-driver-round32/diagnose-polwo-runtime.py assets/source/inkstorm/polwo-driver-round32/polwo-hero-candidate-v1.glb --baseline assets/source/inkstorm/polwo-driver-round32/APPROVED-BAKED-INPUT.glb
```

`APPROVED-BAKED-INPUT.glb` is a placeholder, not an instruction to use the unstyled fit. The completed V2-source outputs and exact receipts are below.

## Completed source packages, pending root visual/runtime acceptance

Both are under `assets/source/inkstorm/polwo-driver-round32/packaged-shoulders-v2/`:

| File | Bytes | Referenced triangles | Body + pilot draws | Unique images / texture definitions | RGBA8 including full mips |
|---|---:|---:|---:|---:|---:|
| `polwo-hero-v1.glb` | 10,189,760 | 48,975 | 2 + 6 | 6 / 6 | 25,165,816 bytes (<24 MiB) |
| `polwo-rival-v1.glb` | 4,188,076 | 28,830 | 2 + 6 | 6 / 6 | 6,291,448 bytes (<6 MiB) |

Hero SHA-256: `17e117cd9cbf86a2cf096ca6cdc0e46413b391395577b5f0774203ce7987f39f`.

Rival SHA-256: `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`.

Both independent source preflights pass. Khronos validation reports 0 errors and 0 warnings for each. Seven informational messages identify retained unused antenna UV/tangent attributes and five intentional empty anchor nodes.

The hero's geometry/accessors are exact against its separately named tangent-repaired V2 baseline. The original V2 native file and all prior source/master files remain unchanged. Rival reduction is real geometry LOD: a conservative locked-border trial stopped at 36,079 triangles and is retained as failed. The attribute-aware trial, with normal weights `.1` per component, UV weights `1` per component, and positional/attribute error cap `.006`, reached 28,830 triangles. Every retained vertex contains original hero position/normal/UV/tangent values, without interpolation. All **132 shoulder-cap triangles retain exact attributes and winding**. Independent before/after reorder triangle-multiset checks also pass. See `rival-lod/lod-receipt.json`, `lod-lineage-receipt.json`, both `*-source-preflight.json`, and both `*.khronos.json` reports.

This task performed no public/runtime copy, browser use, Blender mutation, or render. Root owns the final source reimport/render, attachment/nozzle confirmation, actual game installation, visual critic, and quiet performance evidence. Texture resolution loss remains a real tradeoff: the final runtime body map is 1024² and rival map is 512²; original 2048² painted masters and 4096² imported maps remain intact.

## Runtime contract work required after source acceptance

The packaging contract is `polwo-body-0`, `polwo-body-1`, and `polwo-pilot-{accent,hardware,rubber,shell,suit,webbing}`. The six pilot material names become `Pilot atlas v4c runtime <part>` without Blender suffixes. Configure `embeddedPilotNodePrefix: 'polwo-pilot-'`; otherwise the adapter counts eight body draws and rejects the asset despite its eight-draw total.

Measure pilot, exhaustLeft/exhaustRight, and couplingLeft/couplingRight positions and orientations in the accepted normalized model's coordinates. Do not copy Teemto/Sebulba coordinates or accept nozzle centers from whole-mesh bounds. The optional packager attachment input requires all five positions plus a measurement-provenance string (or explicit study scope/basis), and optional normalized xyzw rotation quaternions. It adds zero-geometry `polwo-anchor-*` roots and emits exact node-bound attachment definitions. Root supplied `attachments-study.json`: these DCC-derived positions include bounding-center estimates for the exhaust and require opening-center confirmation. They are eligible for a clearly marked study package, not an accepted effects contract. The emitted receipt retains the basis and `visuallyAccepted: false`. With no input it emits no anchors and marks the contract pending. The rigid source has no separate engine pivots; do not attach engine animation to arbitrary portions of its shared body mesh.

Later runtime integration must add the appearance ID, label, storage validation, hero/rival source definitions, versioned URLs, attribution, selector/preview paths, and relevant allowlists/tests in `src/game/vehicleAppearance.ts` and its consumers. Appearance must remain independent of simulation class, balance, records, and workshop loadout. Keep existing Teemto/Sebulba art and fallbacks intact. Do not make Polwo the default or represent a missing rival as an optimized variant without a separate decision and source evidence.

Use exact pilot material names for suit/webbing/rubber surface styles. The present per-surface contract supports palette, normal/specular/rim/reflection strength, and wear; it does **not** expose an arbitrary per-material tint. Source atlas recoloring is necessary for selective orange/cobalt/ivory regions. Do not silently pass an unsupported field.

The current effect path includes Teemto-sized nozzle lips (outer radius .95 m, throat .44 m), flame width multipliers .54, and a fixed longitudinal offset. Polwo's finned engine ends are different. Measure nozzle center/radius/orientation and either parameterize these dimensions per asset or opt out of inappropriate added lips while retaining correctly anchored exhaust. Validate both nozzle views and coupling cables before claiming attachment completion. Extra effect/prepass/shadow submissions must be measured separately from the eight imported opaque draws.

After installation by the root task: run asset-contract tests, actual GLTFLoader/CelMaterial import, mapped-color/normal/roughness checks, selector persistence/fallback/error paths, resource release/context recovery, and a quiet full-race performance run. Repeated appearance switches must not multiply texture allocations. Confirm source hashes remain unchanged and close any browser immediately after its task. Strict concept parity, finished driver fit, and playable performance remain independent acceptance gates.
