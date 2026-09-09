# Blockrunner exact opposing-face cleanup review

2026-09-08. **Prepared only; neither stage 04 nor stage 05 has run.** Root owns Blender MCP execution. The source GLB, imported source scene, original neutral PNGs and all runtime/public files remain unchanged.

The [measured findings](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/MEASURED_SOURCE_FINDINGS.md) and [all-mesh JSON](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/all-mesh-topology-analysis.json) support one narrow trial: 48,384 → 43,556 occurrence triangles by removing 4,828 exact opposed duplicates in five meshes. All 59 meshes are copied. The selected face's authored split normals remain, so this trial can still show normal defects. It is not an accepted cleanup or a gameplay-ready derivative.

## Inputs and shared-session guards

- Preserved GLB: `/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb`.
- Source SHA-256, checked externally: `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`.
- Exact source scene: `PodRacing — source a6f14ae799ab40d7ac425f043f824ff8 retry 20260908`.
- Source hierarchy FNV-1a-64: `25b9eb9de1488bd3`; actual audit object FNV-1a-64: `d85efeecc74d9485`.
- Successful audit: `/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/mcp-safe/audit-receipt.json`. It records 268 objects, 59 meshes, 48,384 occurrence triangles and 140 original scenes preserved.
- Both stages prefix `/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/mcp-safe/00-source-reference.py` and then `01-source-guard.py`. The fragments must be concatenated into the same MCP call; do not use filesystem reads or `exec` inside Blender MCP.

Both stages require Object mode, an idle render job, the exact saved source hierarchy and a source signature matching the actual audit. Each captures every preexisting scene, collection membership, active window/view layer, active object and selection. No original source object is relinked or modified. No shared `.blend` is saved. Signatures are canonical-JSON FNV-1a-64 structural comparisons, not cryptographic byte proofs of Blender state. The GLB SHA-256 is an external provenance check.

## Stage 04: create the isolated cleanup trial

Review and concatenate the two safe prefix files, inject `BLOCKRUNNER_AUDIT` as a Python literal, and append:

`/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/mcp-safe/04-copy-exact-opposed-cleanup.py`

The injected audit may be reduced to its actual `status`, `sourceUid`, `sourcePreservation`, `sourceReference`, `sourceSignature` and `globalPreservation` fields. Keep JSON booleans/null converted to Python literal syntax by an external assembler, not inside MCP.

It creates the new scene `PodRacing — Blockrunner exact opposing face cleanup round34 V1`, guarded against name reuse. Every source mesh and material is copied. Only the five named exact-pair meshes are rebuilt. Each group must contain exactly two reversed coordinate-identical triangles; the lower original polygon index is retained. Every original vertex coordinate and the unique unoriented triangle-coordinate set must compare exactly. Retained polygon smooth/material flags and split corner normals are preserved, with at most 0.001 normal-vector encoding error. Material inputs must match the source copies exactly. No normal recalculation, coordinate welding, hole filling, pose, paint, root normalization or export occurs.

The receipt records source object/parent/world-matrix provenance, source/copy mesh names, retained polygon order and every kept/removed original polygon pair. Original vertex lists deliberately retain unused seam-split vertices. Consequently, this is not a vertex-count or runtime draw-call optimization. The stage retains its new scene only on success and removes its owned copies if geometry preparation fails. All preexisting scenes and context are verified afterward. Store the actual receipt externally as `mcp-safe/cleanup-v1-receipt.json`; do not replace source/audit receipts.

Success is explicitly `isolated cleanup scene created; neutral comparison pending`, not visual acceptance. Expected new scene inventory is 141 when starting from the audited 140, with all 140 preexisting scenes preserved.

## Stage 05: one matched neutral comparison at a time

Review and concatenate the two safe prefix files, inject the following Python literals, and append:

`/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/mcp-safe/05-render-cleanup-comparison.py`

- `BLOCKRUNNER_AUDIT`: the same successful source-audit fields.
- `BLOCKRUNNER_CLEANUP`: actual successful stage-04 receipt; no invented signature/lineage.
- `BLOCKRUNNER_SOURCE_RENDER`: actual matching `mcp-safe/driver-render-receipt.json`, `rear-render-receipt.json`, `front-render-receipt.json` or `fullcraft-render-receipt.json`.
- `BLOCKRUNNER_VIEW`: `driver`, `rear`, `front` or `fullcraft`, matching that source receipt.
- `BLOCKRUNNER_RENDER_TOKEN`: a fresh 6–64 character alphanumeric/hyphen suffix. Before calling MCP, verify externally that `/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/cleanup-v1-<view>-<token>.png` does not exist. Never overwrite an earlier PNG.

The render stage checks source/cleanup geometry, material and cleanup corner-normal signatures. It makes temporary copies from the cleanup scene, reuses the actual original camera location/Euler rotation/horizontal orthographic span, and places neutral lights from the original receipt's source bounds. Cleanup bounds must remain within 0.00001 m of the source after transform encoding. Source settings remain Standard/None, exposure 0, gamma 1, a neutral grey world, white lights, 1280×960 and CPU Cycles at 16 samples. This matches the four completed source views. There is no repainting or camera refit.

Run driver first. Inspect the actual PNG individually against `source-driver-20260908-round34-source-v1.png`. Preserve any remaining shading defects in the report; duplicate removal may not fix near-tangent source normals. Then inspect rear/front/fullcraft separately. Check minifigure helmet/visor/fingers, leg stripes, cockpit surfaces, intake fans, true exhaust holes and complete silhouette. The stage removes only its temporary render scene/data and verifies the persistent cleanup trial and every prior scene/context remain unchanged. Store each actual receipt separately.

## Review boundary

No blanket outward-normal solve is included. The diagnostic face-edge analysis has 470 open components across the craft; their absolute side cannot be inferred from closed volume. Any orientation/normal repair should become a separate lineage-preserving trial after these comparisons. Pose, hand contact, seat/exhaust anchors, palette styling and gameplay normalization remain later stages. Concept 12's rear inset is not source geometry evidence.

The MCP fragments pass static AST checks for the reported policy: no `hashlib`, `pathlib`, `os`, file opening, `exec`, `eval`, `globals`, lambdas or dunder access. This is static validation, not a claim that Blender executed successfully. Original earlier script versions and neutral source renders are retained.
