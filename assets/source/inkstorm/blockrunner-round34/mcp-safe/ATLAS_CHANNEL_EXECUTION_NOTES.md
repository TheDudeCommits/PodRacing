# Blockrunner atlas channel preparation

Prepared only. The root agent owns Blender execution. Do not bake the rejected paint V1. Proceed only after the replacement paint copy passes its source preservation, winding, requested-normal encoding and matched visual checks.

Fragment: `10-bake-atlas-channel-v1.py`. Static result: `atlas-channel-preparation-static-validation.json`. No Blender execution or image quality is established by this record.

For each call, concatenate `00-source-reference.py`, `01-source-guard.py`, then inject:

- `BLOCKRUNNER_AUDIT`: the actual `audit-receipt.json`.
- `BLOCKRUNNER_FIT`: the actual `control-fit-v1-receipt.json`.
- `BLOCKRUNNER_PAINT_STATE`: the actual accepted paint-author receipt for the first channel; the immediately previous successful atlas-channel receipt for every subsequent channel. It must include explicit `bodyMeshName` and `pilotMeshName` along with `sourceUid`, `targetScene`, `meshObjects`, `triangles`, `paintSignature`, and `paintCornerNormalSignature`.
- `BLOCKRUNNER_ATLAS_OWNER`: `body` or `pilot`.
- `BLOCKRUNNER_ATLAS_CHANNEL`: `color` or `roughness`.
- `BLOCKRUNNER_BAKE_TOKEN`: a fresh 6–32-character token, letters/digits/hyphens only. The caller confirms that the exact output path is absent before execution. The Blender fragment separately refuses an existing image datablock name.

Run body color, body roughness, pilot color, pilot roughness sequentially. Each call emits one channel, saves a new PNG, packs its new image, restores procedural surface links, removes temporary emission nodes, and leaves only the new unlinked image target nodes active on the owner's materials. It never clears material slots. It rejects owner materials shared with any other object before graph routing begins. Body uses 2048²; pilot uses 1024². Color is sRGB; roughness is Non-Color grayscale, including the green channel consumed by glTF/runtime roughness.

Output path is `blockrunner-{owner}-{channel}-v1-{token}.png` in this source folder. Here `v1` identifies the first atlas protocol, independently of the accepted paint scene's version. Image identity is `Blockrunner {owner} {channel} {token}`. Returned `bodyMeshName`/`pilotMeshName`, fresh paint signatures and `linkedPaintImages` allow the next call and matched renderer to use the actual current state.

On a failed bake, only newly created temporary/image nodes and the new unreferenced image are removed. The script does not delete files. If writing began, a partial PNG may remain; the receipt flags this. Preserve or quarantine that failed artifact and use a fresh token. Do not retry onto an existing master image/path. Graph comparison failures are recorded and asserted only after context restoration.

Before final atlas material replacement, check each real receipt, PNG dimensions/data content, source/fit and paint UV/normal preservation, and file SHA-256 externally. These four private masters consume about 53.3 MiB as uncompressed RGBA8 with full mip chains; they are authoring artifacts. Shipping resolution and actual decoded-memory accounting remain a separate packaging decision. No normal map is produced in this stage.
