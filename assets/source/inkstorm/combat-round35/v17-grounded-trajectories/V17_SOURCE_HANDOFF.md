# V17 grounded trajectories and authored rupture — source handoff

This is an implemented renderer candidate, frozen for native review on 2026-09-09. V16b’s fresh critic remains **5/10, FAIL at 8**. CPU validation below does not establish V17 visual acceptance or frame rate. No new Blender stage, GLB, texture, physics change or damage simulation was introduced.

The left engine now rolls and lowers instead of remaining suspended. The front cowl topples outward, rear machinery travels back/inward, and severed tethers follow their own path. Opening reaches its authored spread at .10 simulation seconds; additional distinct yaw/pitch/roll follows through to .52 seconds. Ground settling durations are .34/.22/.14/.18 seconds for left/front/rear/tethers. Every downward adjustment is capped at 8 m and eased by event age. Exact intact birth, release/reassembly, original pilot, material/geometry identities and source fallback remain intact. These are analytic presentation paths, not physical collision reconstruction.

The birth rupture now uses the exact rear cut-loop centroid from the retained hero/rival author receipts, transformed through the current rear fragment. The previous intact exhaust anchor was 9.56 m behind the authored cut. A finite normalized 3D face normal directs existing debris into the exterior half-space; the authored flash remains at the actual world witness rather than receiving the previous terrain-based 4.648 m lift. Existing smoke plates drift along that normal and retain opacity later, with unchanged size, lifetime, slot count and material resources. Ground dust/sparks remain separately tied to the cached actual rear support witness and its departure direction. Invalid/missing normals preserve legacy routing; EMP, shield, energy and recovery behavior remain unchanged.

The new rear roll exposed a 1.09 cm full-source burial missed by its old support set. The failed runs are preserved. Adding global extrema did not fix the local curved surface, so only that rear fragment now also caches the upper vertex of its existing 48 XZ cells at bind time. Its original roof becomes terrain-facing during the roll. Other families retain the exact default support reduction. No runtime mesh traversal, buffer reads, new scene objects or new particle pool were added.

Validation: **88 tests across 10 files PASS**, typecheck PASS and scoped diff check PASS. Installed GLTFLoader tests cover both real admitted hero/rival assets, all visible vertices at every tick 910–1168, four aspect ratios, exact world witness/birth/reset, original pilot, deterministic state, fallback families, ordinary camera behavior, full-3D cone including vertical normals, normal-magnitude invariance, invalid-input legacy equality and fixed-resource reuse. Root owns the integrated build and native gate.

| CPU metric | Hero | Rival |
|---|---:|---:|
| Full visible positions checked | 23,442,946 | 11,808,368 |
| Source/corner camera projections | 18,708,648 | 9,465,688 |
| Maximum fragment terrain queries/update | 238 | 197 |
| Lowest rear source vertex above terrain | 0.05942 m | 0.10000 m |
| Maximum settled rear gap (age .6–1.75) | 0.10000 m | 0.10000 m |
| Maximum settled left/front/tether gap | 0.18000 m | 0.18000 m (no rival tether mass) |

All sampled visible source vertices remained above terrain. Camera snapshots stayed within the existing safe projected limits; the separate dynamic-camera suite also passed. These tests cover the tested route/poses, not arbitrary terrain or a guarantee of perceptual contact.

Next native acceptance: visibly distinct fall trajectories; obvious failure at the torn engine face; localized directional debris and contact consequence; full engine/pilot framing through the held shot and ordinary recovery; unchanged manual/comfort/network camera behavior. Keep the brief V16b post-recovery cockpit crop and plain translucent green recovery disc on the checklist. Neither is claimed fixed here. No further camera change was made in V17.

Evidence: [exact frozen source hashes](source-freeze.json), [full geometry metrics](actual-geometry-metrics.json), [88-test log](targeted-final.log), [rupture/contact audit](authored-rupture-contact-audit.json), [preserved asset hashes](preserved-asset-hashes.json), and [applied delta from preserved V16b helper/FX/tests](v17-trajectory-and-rupture.executed.patch). Root separately applied the narrow [GameApp witness-routing patch](GameApp-authored-rupture.expected.patch). Initial failed geometry and contract logs remain alongside their passing successors.
