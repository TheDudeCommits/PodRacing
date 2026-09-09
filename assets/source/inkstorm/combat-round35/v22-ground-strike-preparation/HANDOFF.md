# V22 broad casing contact — private handoff

**Frozen private candidate, 2026-09-09. Native visual acceptance is pending.** V21 remains the actual baseline: unchanged fresh critic **5/10, FAIL at 8**, with apparently suspended machinery and a weak ground strike. No V22 browser, build, Blender operation or live source edit was performed here.

- Main six-file patch: `v22-broad-contact.patch`, SHA-256 `4f88e8b9dc1f4ae8260ebeb4ecf13a73e07c5cc3821caf09276693bf588020cb`, 28,286 bytes.
- Separate parent-owned GameApp one-line adapter: `v22-gameapp-footprint-adapter.patch`, SHA-256 `29fae18abcd1b67fabb60d6a8c458e6048f0d8745c84a6ad935eaeb027691270`, 597 bytes.
- Combined apply-check and private TypeScript check pass. `candidate-inputs.json` pins the preserved inputs and desired outputs. Root centrally applies both patches.

## Causal diagnosis

The prior geometric acceptance tracked the lowest source vertex. It could pass while most of an engine was held above the sand. On the exact hero source, the rear’s 90-degree roll had only **0.363 m** of its 10.275 m length within a 0.30 m flat-ground band. Returning its original belly downward gives a **10.025 m** band and lowers triangle-area-weighted mean surface height from **2.428 m to 1.671 m**. These are source surface measurements, not mass-center or visual measurements.

Flat-plane bank selection alone was insufficient for the long left engine. The first actual-terrain test failed: its tail tip touched at 0.18 m while the nose stayed about 1.15 m above terrain. The candidate now balances the lowest fore and aft cached source supports, applies a bounded pitch correction around the current world-space center, and resamples the same complete support cache before vertical clearance correction. It does not lower geometry through the terrain to manufacture contact.

An independent terrain/shadow audit found no metre-scale floor mismatch. Near-grid interpolation error stayed below 7 cm in the two measured native neighborhoods, and runtime course offsets were included in the existing geometry fixture. Directional shadow bias can suppress a narrow contact patch at these clearances; it is a secondary contributor and is unchanged. Details and scope are in `terrain-shadow-audit.md`.

## Concrete change

The rear progressively settles belly-down, the long left casing banks to −15 degrees and balances its fore/aft support, and the front section turns onto its broader roof. Front roof support points are prepared at bind time. The V21 event-relative planar path, moving simulation-base transport, source meshes/materials/pilot, recovery reset, camera behavior and simulation authority remain unchanged.

The actual near-ground rear source band now supplies an optional footprint: center sampled on terrain, horizontal long-axis direction and measured half-extents. Its original minimum-clearance witness remains separate. The same **two existing plates and ten sparks** distribute along that contact region. The plates form a rooted sand sheet along the casing instead of a small point fan hidden underneath it. The shader gains an instance mode in the same material/program; its cache key advances. No new pool, draw, mesh, texture, emitter timer or scene object is added. Omitted or invalid footprints retain the prior point emission. The one-line GameApp adapter forwards this optional footprint only.

## Validation and explicit cost

`focused-v2.log`: **40 tests / 6 files PASS**. Coverage includes actual hero/rival geometry, broad contact extent, original pilot/reset, relevant existing FX/contact tests, optional-footprint fallback, finite inputs, cached event data and existing pool ownership. `typecheck-final-remap.log` is successful empty output. A receipt-only rerun of the same two geometry cases wrote the measurements below; it introduced no tuning.

| Measured actual fixture | Hero | Rival |
| --- | ---: | ---: |
| Source positions checked across 11 wreck/recovery frames | 978,858 | 498,328 |
| Minimum source clearance | 0.096256 m | 0.100000 m |
| Left near-ground longitudinal band, frame 984 | 15.182 m | 14.624 m |
| Front band | 6.862 m | 6.857 m |
| Rear band | 9.769 m | 9.977 m |
| Maximum cached terrain queries, V21 → V22 | 244 → 348 | 203 → 300 |

The extra front roof samples, one additional left balancing pass and one footprint-center terrain sample increase CPU work. The existing test ceilings explicitly change **296/222 → 348/300**; source no-burial, projection, birth and reset criteria are unchanged. No per-frame source vertex traversal/allocation is introduced. Root’s full suite and native cadence must evaluate this cost; the private fixtures do not establish frame-rate acceptance. This is not a full new exhaustive terrain sweep.

Preserved preparation failures include the two roll-only actual-terrain support failures (`focused-initial.log`), private TypeScript import remaps to the old interface (`typecheck-initial.log`, `typecheck-final.log`), and the initial new-file diff headers. The broad-contact criteria were retained; the pitch correction fixed the actual support failure. Final portable tests compile against the new interface. No failed result was relabeled as a pass.

Use the unchanged actual six-phase sequence/reference/critic protocol and separate high-speed case after integration. Judge a visibly grounded casing and dominant local scrape, not just minimum clearance. Confirm the wider sheet does not hide the tear/pilot, the extra queries meet cadence, protected recovery remains clean and all authored geometry returns intact. The V21 criticism remains valid until those images demonstrate otherwise.
