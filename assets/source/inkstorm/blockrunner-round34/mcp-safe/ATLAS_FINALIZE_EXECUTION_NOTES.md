# Blockrunner atlas material copy V3

Prepared fragment: `11-copy-finalize-atlas-v3.py`. Root owns execution. It creates `PodRacing — Blockrunner Inkstorm finalized atlas round34 V3`, with `blockrunner-body-paint-v3` and `blockrunner-pilot-paint-v3`. It does not modify the actual procedural V2 or its packed images.

Prefix `00-source-reference.py`, `01-source-guard.py`, and `pilot-paint-reference-v1.py`; then inject these exact actual records:

| Variable | File |
| --- | --- |
| `BLOCKRUNNER_AUDIT` | `audit-receipt.json` |
| `BLOCKRUNNER_FIT` | `control-fit-v1-receipt.json` |
| `BLOCKRUNNER_PAINT_AUTHOR` | `paint-author-v2-receipt.json` |
| `BLOCKRUNNER_PAINT_STATE` | `bake-v2-pilot-roughness-receipt.json` |
| `BLOCKRUNNER_ATLAS_RECEIPTS` | List in this exact order: `bake-v2-body-color-receipt.json`, `bake-v2-body-roughness-receipt.json`, `bake-v2-pilot-color-receipt.json`, `bake-v2-pilot-roughness-receipt.json` |

The four bake records, final paint signature, and four image identities are pinned with the same canonical-JSON FNV used by the source guards. `11-atlas-execution-reference.json` provides the readable image names/paths and external receipt SHA-256. These FNV checks do not hash image pixels inside Blender; the root's external image validation remains the file-content evidence.

The copy retains all 44,028 triangles, all UV coordinates, transform matrices, every loop and exact already-encoded corner normals. It runs no UV or normal operator. Body color roles become atlas texels and body faces intentionally map to slot zero. Pilot slots retain the exact suit/helmet/visor/glove index array from the source-face masks. Each destination polygon index is explicitly written after slot replacement to prevent the known material-index reset.

The new materials use white base-color factors and existing sRGB color atlases; Non-Color roughness goes through the green channel. They retain each procedural material's other Principled input defaults and backface-culling policy. This keeps Blender's existing response for matched comparison; proposed runtime CelMaterial coefficients are separate and must not be substituted into Blender's `Specular IOR Level`. No normal map is added. There is one body material and four pilot materials sharing the pilot atlas pair: five material draws before additional renderer passes.

On success the receipt contains fresh `paintSignature`, `paintCornerNormalSignature`, `bodyMeshName`, `pilotMeshName`, `linkedPaintImages`, source/fit/V2 preservation, global context results, material mapping and two-copy lineage. Feed that actual receipt into the generic matched paint renderer with the same real fit cameras. Full source/fit→V2 consolidation lineage is retained, followed by an explicit identity mapping from V2 polygons/loops to V3. On failure only the newly owned scene/objects/meshes/materials are removed; original images remain linked to procedural V2.

Required next evidence is actual V3 material renders and GLB export/reimport checks. This preparation and a successful material-copy receipt alone do not establish style or runtime acceptance.
