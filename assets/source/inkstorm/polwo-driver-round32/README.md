# Polwo source and local runtime history — round 32

The current hero/rival pair is technically packaged and locally integrated. Root's decoded garage check and all seven actual race capture sections pass. **Strict source review remains REVISE; lifecycle and full-race performance are pending.** These results do not establish AAA acceptance or replace the frozen round31 checkpoint.

## Original source and preservation

Source: [Anakin's pod Star Wars](https://sketchfab.com/3d-models/anakins-pod-star-wars-5a3422df6f894b48b846d590cdc2bf4c), by [Nolan “Polwo” Zannato](https://sketchfab.com/polwo), UID `5a3422df6f894b48b846d590cdc2bf4c`. “Polwo” is the creator handle used for the internal appearance key. Stored official metadata reports [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) and requires author credit; root updated `public/assets/inkstorm/vehicles/ATTRIBUTION.md` for the named Inkstorm/driver adaptation.

The MCP-imported source is `../vehicles/5a3422df6f894b48b846d590cdc2bf4c/source-imported.glb`, SHA-256 `b0cc30db26ddb532629439378407e5ec86ce603c27038f0539ace5c99484b03c`. It remains byte-exact. The original download archive was not preserved; the imported-source GLB is not an archive substitute. Source metadata/download receipts remain beside that GLB.

Original 4096² source maps, the 2048² painted RGB/ORM masters, fitted source GLBs, failed candidates, source images, and authoring receipts are retained. Source Blender work used isolated scenes with context/membership preservation receipts. Packaging and this bookkeeping task used no Blender/browser and made no public/runtime code changes; root separately performed the recorded public copy and runtime integration.

## Retained stages

| Stage | Evidence and disposition |
|---|---|
| Empty source cockpit | Original quarter-a/quarter-b inspection confirmed no driver. See `../catalogue-inspection-round32/inspection-notes.json` and source inspection renders. |
| Driver fit V1 | `polwo-driver-fit-v1.glb` and `author-fit-receipt.json`; initial copied static driver. Preserved as an unaccepted scale/contact study. |
| Driver fit V2 | `polwo-driver-fit-v2.glb` and `author-fit-v2-receipt.json`; larger, straighter driver and revised grip fit. Existing source body preserved. Fit/pose was not accepted as final. |
| Driver fit V3 | `polwo-driver-fit-v3.glb`, fit/cutaway receipts, and `polwo-contact-v3-*` images; later control-contact work. Topology inspection established open shoulder boundaries; a dark image patch alone was not the diagnosis. |
| Paint V1 | `polwo-inkstorm-paint-v1-native.glb`; cobalt/orange/ivory adaptation through the original UV layout, with separate painted masters. Its first packaging attempt rejected 25 zero tangent XYZ vectors. `paint-v1-tangent-failure-receipt.json` preserves that failure. |
| Separate tangent repair | `repair-polwo-zero-tangents.py` creates a new derivative only. All 25 zero XYZ vectors were reconstructed from valid adjacent UV triangles, with 0 fallback bases; W was preserved. Exactly 203 BIN bytes changed. All positions/normals/UVs/indices/images/nonzero tangents remain exact. |
| Packaged paint study | `packaged-paint-v1/` passes numerical package checks but retains unaccepted shoulder holes. It is historical, not the current pair. |
| Shoulder repair V1 | `polwo-inkstorm-shoulders-v1-native.glb` closes 44 boundary edges with 132 triangles / 46 vertices. Its new cap UVs sampled inappropriate white/brown atlas islands; root/critic rejected that visible patchwork. Preserved, with its separate tangent baseline under `packaged-shoulders-v1/`. |
| Shoulder repair V2 | `polwo-inkstorm-shoulders-v2-native.glb`; the same cap construction with per-donor-triangle-island cloth UVs. Source views show continuous blue cloth. Previous geometry/UV/normal prefixes remain exact. This is the current packaging source. |
| Final hero and real rival | `packaged-shoulders-v2/`; source and Khronos checks pass. Rival uses real geometry reduction and smaller maps, with all 132 cap triangles retaining exact UVs, normals, tangents, and winding. |

Detailed topology history is in `docs/inkstorm-overhaul/POLWO_V3_MESH_TOPOLOGY_ROUND32.md`. The production plan is `docs/inkstorm-overhaul/POLWO_PRODUCTION_PLAN_ROUND32.md`; repeatable packaging, repair, LOD, synthetic self-test, and independent lineage tools are retained in this directory.

## Current artifact pair

| Variant | Source package / matching public file | Bytes | Triangles | Body + pilot draws | RGBA8 full-mip estimate |
|---|---|---:|---:|---:|---:|
| Hero | `packaged-shoulders-v2/polwo-hero-v1.glb` → `public/assets/inkstorm/vehicles/polwo-hero-v1.glb` | 10,189,760 | 48,975 | 2 + 6 | 25,165,816 bytes (<24 MiB) |
| Rival | `packaged-shoulders-v2/polwo-rival-v1.glb` → `public/assets/inkstorm/vehicles/polwo-rival-v1.glb` | 4,188,076 | 28,830 | 2 + 6 | 6,291,448 bytes (<6 MiB) |

Hero SHA-256: `17e117cd9cbf86a2cf096ca6cdc0e46413b391395577b5f0774203ce7987f39f`.

Rival SHA-256: `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`.

Each has 6 unique images, 6 texture definitions, and 8 opaque draws. Hero and rival satisfy the existing 60k/30k triangle and 6-body/6-pilot/12-total draw caps. Both Khronos reports have 0 errors and 0 warnings. Informational messages identify retained unused antenna UV/tangent attributes and five intentional anchor nodes. Decoded texture estimates are not measured GPU allocations.

The rival's conservative locked-border trial stopped at 36,079 triangles and remains in `rival-lod/01-topology-locked.glb`. The attribute-weighted trial reached 28,830; subsequent reorder preserves its exact oriented triangle multiset. Every rival vertex retains original hero attributes. See `packaged-shoulders-v2/lod-lineage-receipt.json` and `source-preservation-receipt.json`.

Root's exact-copy evidence is `packaged-shoulders-v2/public-copy-receipt.json`. Current appearance revision is `polwo-inkstorm-v1`, with the `polwo-pilot-` prefix. The five attachment nodes use `attachments-study.json`; nozzle centers/radii/orientations still need actual opening/effect confirmation. Their presence does not establish accepted nozzle placement or hidden body support.

## Verified in-world scope and remaining gates

`output/gauntlet/round-32-polwo/receipts.json` has `errors: []`. All seven sections — grid, salt run, canyon, fork, launch, foundry, finish — report Polwo `ready`, embedded pilot true, 48,975 triangles, 2 body + 6 pilot draws. Root also verified the decoded selected garage preview; `garage.png`, `live-drive.png`, and all seven section PNGs are retained. This is functional loading and capture evidence, not complete races or strict world-art acceptance.

The first build was reported by root as **608 tests / 109 files passed**. Its captured bundle is `index-C1kHmeEv.js`, SHA-256 `cbb59d8fdfeb4eb660cc8072dec1b66f1fe267bd6184afc7883670bbda089c2a`. `cleanup.json` reports successful harness exit and port 5186 no longer listening; root confirms the browser closed.

`docs/inkstorm-overhaul/POLWO_SOURCE_REVIEW_ROUND32.md` is explicitly implementation-aware, not fresh or blind. It scores material/construction **6.0**, fit/pose **6.5**, and palette/detail **5.5**. All remain below the strict 8/10 gate: **REVISE / FAIL**, not AAA accepted. The review retains the successful shoulder repair while requesting a demonstrated supported posture, more resolved cockpit assembly, and deliberate palette/wear distribution. It cannot certify hidden pelvis/back/knee/foot contact, runtime visual parity, lifecycle, or performance.

Polwo-specific lifecycle/resource/context-recovery checks and a quiet full-race performance freeze remain pending at this bookkeeping checkpoint. The manifest's round31 `acceptanceCheckpoint` and `latestPerformanceReceipt` were preserved unchanged. Root owns later handover/freeze updates when those tests finish.

The manifest now records 3 stylized source studies, 3 exported families, 3 functional runtime integrations, 3 added drivers, 6 logical hero/rival variants, and 10 physical public GLBs. Driver inspections remain 5 and source visual inspections 26. The complete prior manifest is preserved as `vehicle-manifest-before-polwo-runtime-20260908T082750Z.json`, SHA-256 `b83bf550b0c00d26650d706ecb62a816af90f8ba75383a24ae34275c913f062a`.
