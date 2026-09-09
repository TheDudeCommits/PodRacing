# Frozen-build regression — round 15

Four functional probes passed: WebGL context recovery, two-peer multiplayer, procedural course rotation, and missing-scenery fallback. The resource probe's strict assertion **FAILED**; its bounded peak counts levelled off, but corresponding section counts did not become identical. That result is **inconclusive about a continuing leak**. The fallback remained playable but its persistent warning overlaps part of the race HUD.

## Build and environment

All probes loaded the same frozen production bundle, `dist/assets/index-zFbiBUHH.js`, SHA-256 `88aa8415b3601e7aa4d3b0594fe13abd628cc5e2450716ead2ec46caaf6e4633`. Each receipt hashes the actual script bytes served to its page and asserts that hash. No runtime code, public assets, dist files, or HANDOVER content was edited during this regression task; no rebuild was run.

Runs completed on 2026-09-07 between 11:48 and 11:52 UTC on macOS 26.6.2 (25G83), Darwin 25.6.0 arm64, Node v24.19.0 and headless Chrome 152.0.7977.77. Pages used a 1440 × 900 CSS viewport, hardwareConcurrency 10, and device scale factor 2 except the fallback probe, which used 1. Adaptive renderer settings were retained. These runs are functional checks, **not FPS or cross-device performance evidence**. Other agents could perform light non-browser work.

Browsers ran sequentially and each script closed its browser in `finally` immediately after its probe. The scripts also stopped only their own preview processes. Their ports were 60437, 60548, 60686, 60825 and 60895. The unrelated service on port 5211 was left untouched.

## Results and evidence

| Probe | Result | Verified behavior | Raw evidence |
| --- | --- | --- | --- |
| Context recovery | PASS | Explicit context loss for three seconds, restoration, scenery shadow atlas rebake, measurement reset, rendered world restored | [Receipt](../../output/gauntlet/round-15-regression/context/receipt.json), [restored frame](../../output/gauntlet/round-15-regression/context/restored.png) |
| Two peers | PASS | Room creation/join, locked host rules, guest vehicle sync, text/paste controls, transmitted driving/combat input and state convergence | [Receipt](../../output/gauntlet/round-15-regression/multiplayer/multiplayer-receipt.json), [live race frame](../../output/gauntlet/round-15-regression/multiplayer/multiplayer-race-heat.png) |
| Course rotation | PASS | Fixed Time Attack retry, Expedition retry/rotation, deterministic same-seed minimaps, host/guest course agreement | [Receipt](../../output/gauntlet/round-15-regression/procedural/procedural-course-receipt.json) |
| Asset fallback | PASS, visual limitation | One blocked GLB gives truthful loading failure status and the base course remains drivable | [Receipt](../../output/gauntlet/round-15-regression/asset-fallback/receipt.json), [driving frame](../../output/gauntlet/round-15-regression/asset-fallback/fallback-driving.png) |
| Repeated resource counts | Raw FAIL; leak interpretation inconclusive | Three identical staged section cycles and garage returns completed; strict section-by-section plateau assertion failed | [Unmodified failure receipt](../../output/gauntlet/round-15-regression/resources/receipt.json), [third launch visit](../../output/gauntlet/round-15-regression/resources/cycle-3-launch.png), [final garage](../../output/gauntlet/round-15-regression/resources/final-garage.png) |

### Context recovery

The scenery shadow atlas had 16 casters, a 4096-square target, and `failure: null`. Its bake count advanced from 2 before loss to 3 after restoration, with `failure: null` still present. At the explicit restoration boundary, the governor reported `workEmaMs: 0`, `cadenceEmaMs: 0`, `cadenceSamples: 0` and `cadenceLastMs: 0`. Later frames accumulated new samples, confirming measurement restart rather than retaining the suspended interval. The first resumed work can include reupload/recompile costs; this is not evidence of steady-state frame rate. There were no page or console errors, and the restored screenshot contains the world, racer and HUD.

### Multiplayer and course rotation

The multiplayer probe used actual PeerJS signaling/data channels between two browser peers. Both selected roles and the six-character room code worked. One-lap host rules and the guest's skim-speeder selection synchronized. Room text, bound-key characters and native paste remained usable. Remote driving moved 153.84 m, with convergence error 1.12 m at a three-step gap. Redline heat and eight mines were observed. Browser errors were empty. This does not exercise separate physical devices, adverse networks or all NAT configurations.

The procedural probe kept the fixed Time Attack seed `0x494e4b53` and rules on retry. Open Expedition changed from seed 1364030134 / signature `bd9962df` to seed 4247717558 / signature `a3412bdd` for the next race, while retry retained its exact geometry. Rotation-invariant turn-profile RMS was 0.46684 radians and 97.996% of minimap pixels differed. The much larger centerline RMS also contains world-region translation and is not sufficient alone to establish a changed route. Fresh same-seed capture sessions produced equal geometry and pixel-identical minimaps. A real room produced the same course signature `49d891b4` for host and guest. Browser errors were empty.

### Missing scenery

The fallback probe intentionally aborted one `canyon-buttress.glb` request. Loading remained truthfully failed and the visible status read “SCENERY UNAVAILABLE. RELOAD TO RETRY; THE BASE COURSE REMAINS PLAYABLE.” An ordinary Start Race click followed by eight seconds of W input moved the player 529.16 m; the race clock passed approximately 5.16 seconds after countdown. There were no page errors. Console errors were limited to the intentional failed request and reported scenery fetch failure.

Visual inspection found that this persistent notice overlaps the lower-right heat/damage/resource HUD in the driving frame. This is a concrete fallback-only UI limitation, reported to the parent and UI owner. It does not invalidate the scoped loading/playability assertion, and the functional PASS is not a visual acceptance claim. Other missing-file combinations and a complete race under fallback were not tested.

## Resource probe: retain the failure

The selected event stayed `cup-canyon`, seed 1229867859, signature `2dacfc90`, across all 25 samples. Each cycle used Start Race, capture mode, chase camera, all seven section positions, staged finish, and the real Back to Hangar button. Two simulation steps and two animation callbacks settled each section; the garage waited for all five previews plus 400 ms. This is a bounded resource-lifetime probe, not input-driven racing.

| Sample group | Geometry peak | Texture peak | Program peak | Garage geometries / textures / programs |
| --- | ---: | ---: | ---: | --- |
| Initial garage | 177 | 78 | 40 | 177 / 78 / 40 |
| Cycle 1 | 189 | 78 | 42 | 189 / 78 / 42 |
| Cycle 2 | 192 | 78 | 42 | 192 / 78 / 42 |
| Cycle 3 | 192 | 78 | 42 | 192 / 78 / 42 |

Cycle 3 had **three more geometries at each matching section** than cycle 2. The final garage delta was zero, and texture/program deltas were zero at every corresponding stage. The strict assertion required matching section counts, so the raw receipt correctly says `outcome: "FAIL"`, `plateau: false`, and “Identical second and third cycles did not reach a resource-count plateau.” The assertion and failure evidence were not relaxed or overwritten after observing the result.

Equal cycle-2/cycle-3 peak and garage counts support bounded late-upload warming as a possibility. They do not prove that no leak exists. The short staged visits do not establish whether another live race would allocate more resources. Capture staging changes the competition profile from clean-race to chaos and cancels records, although the selected event and course remain fixed. Subsequent starts restore the race profile, so the sequence includes actual rebuilds; atlas bake counts progressed 4, 6, 8 with no atlas failures.

The live Cup benchmark's separate rise from 316 geometries / 136 textures to 377 / 166 around 54.87 s is a different workload. These lower staged counts cannot explain or disprove that observation. `renderer.info` counts are not GPU bytes, JavaScript heap measurements, a complete leak proof, or FPS. No runtime repair was justified from this probe alone, and no unbounded stress loop was started.

## Reproduction and task changes

Each run used `INKSTORM_EXPECTED_BUILD=88aa8415b3601e7aa4d3b0594fe13abd628cc5e2450716ead2ec46caaf6e4633` and a unique `INKSTORM_OUTPUT` under `output/gauntlet/round-15-regression/`. Commands were `node scripts/inkstorm-context-recovery.mjs`, `node scripts/multiplayer.mjs`, `node scripts/procedural-courses.mjs`, `node scripts/inkstorm-asset-fallback.mjs` and `node scripts/inkstorm-resource-cycles.mjs`, in that order. Use a new output directory for any repeat to preserve these receipts.

Harness changes added output overrides and served-build/environment receipts to the existing four scripts, strengthened the context-recovery atlas assertions, and added the bounded resource-cycle script plus `scripts/lib/frozen-build-receipt.mjs`. Previous reports remain untouched. Captured frames were inspected for the tested renderer/fallback behavior; this report makes no concept-parity or general AAA-quality claim.
