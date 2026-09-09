# Blockrunner source cleanup — round34

**The isolated cleanup removes the conspicuous driver shading artifacts while preserving the source craft. This is source preparation, not a fourth runtime vehicle.** The coloured Blockrunner retains its original seated minifigure driver. No new driver, paint, gameplay normalization, public GLB, registration or accepted control fit has been added.

The official source is `a6f14ae799ab40d7ac425f043f824ff8`, author **20001748**, CC BY 4.0. Its preserved 2,667,212-byte GLB SHA256 is `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`. The [measured findings](../../assets/source/inkstorm/blockrunner-round34/MEASURED_SOURCE_FINDINGS.md) and [all-mesh analysis](../../assets/source/inkstorm/blockrunner-round34/all-mesh-topology-analysis.json) retain the actual 59-mesh evidence and triangle lineage. Original source assets and failed/prepared attempts remain intact.

## Actual Blender work

The source scene was audited through Blender MCP: 268 objects, 59 mesh occurrences, 48,384 triangles. Four neutral source views were rendered independently at 1280×960, CPU Cycles 16 samples, Standard/None, exposure 0 and gamma 1. All 140 preexisting scenes and the original Cruise scene/view layer/active object/15-object selection were restored. The shared `.blend` was never saved.

The subsequent guarded copy trial removed **4,828 exact reversed duplicates in five meshes**, leaving **43,556 triangles**. The driver changes from 8,256 to 4,128 faces; paired LegoTri8 meshes from 548 to 274 each, paired LegoTri9 meshes from 152 to 76 each. Other meshes are unchanged copies. Each unique triangle-coordinate set and complete source vertex-coordinate list remains exact. Selected original split normals, smooth flags, materials and world transforms are retained; no welding, hole filling, normal recalculation, pose or repainting was performed. Unused seam vertices remain, so this is not yet a vertex or draw-call optimization.

Actual [cleanup receipt](../../assets/source/inkstorm/blockrunner-round34/mcp-safe/cleanup-v1-receipt.json): the persistent scene **PodRacing — Blockrunner exact opposing face cleanup round34 V1** was created successfully, bringing the scene count to 141. All 140 prior scene/collection memberships and source/corner-normal signatures remained unchanged. These are structural FNV comparisons of recorded Blender data, not cryptographic proof of every possible Blender property. The original GLB retains separate SHA256 provenance.

Four matched cleanup comparisons then reused each source view's exact camera and source-bound lighting. Every temporary render scene was removed afterward; all 141 prior scenes, source and cleanup geometry/material/normal signatures and shared context were preserved. Actual receipts are beside the source under `mcp-safe/cleanup-v1-{driver,rear,front,fullcraft}-render-receipt.json`.

## Visible comparison

The fresh [blind review](BLIND_FOUNDATION_AND_SOURCE_CLEANUP_ROUND34.md) accepts the narrow source cleanup at **8.5/10**, and rejects driver/control fit at **3/10**. It inspected six source/comparison images without implementation or prior-review context. That acceptance covers visible cleanup only; final style, topology, all-angle behavior and runtime quality are not accepted.

Original driver, with overlapping-face artifacts:

![Original Blockrunner driver](../../assets/source/inkstorm/blockrunner-round34/source-driver-20260908-round34-source-v1.png)

Actual cleaned copy under the same camera and lighting:

![Cleaned Blockrunner driver](../../assets/source/inkstorm/blockrunner-round34/cleanup-v1-driver-20260908-round34-compare-v1.png)

Root and the source reviewer individually inspected all four cleanup views. The driver's leg stripes and conspicuous helmet/arm triangle patches disappear. Hollow hand grips, helmet opening and foot recesses remain visible. The [rear](../../assets/source/inkstorm/blockrunner-round34/cleanup-v1-rear-20260908-round34-compare-v1.png), [front](../../assets/source/inkstorm/blockrunner-round34/cleanup-v1-front-20260908-round34-compare-v1.png) and [whole-craft view](../../assets/source/inkstorm/blockrunner-round34/cleanup-v1-fullcraft-20260908-round34-compare-v1.png) retain the actual exhaust openings, intake fans, linking beams and silhouette. Original normals still warrant normal runtime inspection; these four views do not prove every surface under every light.

## Next concrete fit step

Both existing controls remain forward of the hands. The [measured fit plan](../../assets/source/inkstorm/blockrunner-round34/NEXT_PILOT_CONTROL_FIT_PLAN.md) preserves the entire pilot and seat height. Its hand openings are approximately 0.070 m in radius and the controls approximately 0.0656 m, leaving about 4.3 mm nominal radial clearance. A rigid rotation about the original control bases cannot align the bars coaxially with the grip openings. Moving the original bars onto the measured hand axes is a candidate only: the shifted bases need leg/floor clearance checks before a copy trial. Three positive 9–10 mm seat samples do not justify lowering the pilot.

Concept12 is the supplemental Inkstorm paint direction. Its generated rear inset is not source geometry evidence. Final material styling, hand contact, runtime anchors, bounded hero/rival assets, driver readability and in-world art/performance acceptance remain open. Main integration counters remain three families and 23 pending.
