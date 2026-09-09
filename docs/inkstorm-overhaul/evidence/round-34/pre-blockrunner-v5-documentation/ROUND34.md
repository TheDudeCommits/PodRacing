# Round34 — Blockrunner V3 tested checkpoint, 8 September 2026

Colour Blockrunner is locally registered with actual V6 hero/rival packages and its original source pilot. The tested revision retains the Foundry corridor, hoist V3, solid effects V2 and foundation material-coordinate correction. **The full overhaul and final art remain incomplete.**

**Dated tested checkpoint — 8 September 2026, V3 attempt 1: INCOMPLETE.** Full Time Attack, Canyon Cup round 1 and Continue, seven staged sections, and Foundry context recovery PASS. The exact resource plateau gate FAILS: cycle 2→3 adds two geometries and two textures at each matching section, with no program increase. Equal final garage totals do not pass that gate; a leak is not established. [Actual technical report](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md).

Tested bundle **index-Cnysa7ZZ.js**, **1,619,624 bytes**, SHA256 `10ef7eb7189f407f530f73e802cdbc59acc1ebd47f5cfb2a26e3341e3b9bb04e`; **671 tests / 120 executed files**, typecheck/build PASS. [Verification](../../output/gauntlet/round34-blockrunner-admission-v1/verify-framing-v3.log). Results apply to the frozen V3 attempt1 only; subsequent edits require their own validation.

## Runtime change and actual admission

Blockrunner uses the existing podracer class and lazy imported-asset path. Its hero/rival retain the original silhouette, physical engine crossbeam and measured nozzle openings: 44,028 / 29,682 triangles, including the same 4,128-triangle pilot. Each package has one body/four pilot material draws, four baked images and no normal map. [Source, LOD and package receipts](BLOCKRUNNER_CLEANUP_ROUND34.md).

An optional per-asset aperture scales the existing procedural exhaust flame; omitted metadata retains the earlier `.54` radial default. Blockrunner uses a conservative 0.34m inside the measured approximately 0.346m inner throat. Authored nozzle hardware and the rigid crossbeam suppress duplicate generic lips and energy coupling. Presentation metadata updates atomically; driving/simulation authority and source geometry remain unchanged. [Independent code review and scope](BLOCKRUNNER_RUNTIME_CODE_REVIEW_ROUND34.md).

V1 chase hid most engine mass; V2 raised chase framing to 4.8 and added front inspection. Tested V3 uses the shallower garage view `(-1.8,.45,.65)`. [Thirteen actual error-free captures](CURRENT_VISUALS.md) show the revision; staged 410KPH/zero-clock stills do not prove normal racing or FPS.

Actual ordinary races decoded the final 44,028-triangle hero and the 29,682-triangle Cup **ai-sola** rival. Both browser-response hashes match the packaged public/dist files and each reports five opaque draws. Rax remains the class-gated procedural landspeeder; Time Attack has no Sola and does not request the absent rival. [Actual admission receipt](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/receipt.json).

## Technical checkpoint — attempt1 incomplete

| Check | Actual result | Scope |
| --- | --- | --- |
| Time Attack | PASS; valid gold, 63.750s, 10 sectors; mean 59.500373Hz, p95 16.8ms | 3,793 racing intervals; 32 over25ms, none over50ms. |
| Canyon Cup round1 / Continue | PASS; valid gold, 129.675s, 20 sectors; mean 59.138075Hz, p95 16.8ms | 8,142 racing intervals; 119 over25ms, none over50ms. Continue reaches Foundry awaiting Start; that second Cup race is not completed. |
| Seven staged sections | PASS; 2,527 intervals, none over25ms | Original 1.5s warmup and six-second sampling; diagnostic placement followed by live W. Ending DPR1–1.75. |
| Foundry context recovery | PASS | Original suspension, frozen simulation, history/shadow reset, injected framebuffer fallback and recovery assertions. Readiness retains >10 samples; restored cadence16.7ms. |
| Three-cycle resources | **FAIL** | Each corresponding grid–finish stage gains +2 geometries/+2 textures/0 programs from cycle2→3; final garage delta is zero. Cause unresolved; leak not established. |

Two ordinary virtual-gamepad races use the original mean≥40Hz, p95≤25ms and 0.05s coverage gates. All 12,270 raw rows and 11,935 racing intervals are retained. Cup classification grace extends the racing-phase collector after the 129.675s player finish: 481 intervals ending after finish total 8,016.2ms; the first may straddle finish. This is not 137.683s of player driving. No frame filtering, gate relaxation or substituted retry occurred.

Local Chrome152 / ANGLE Metal / Apple M4, 1440×900, requested DPR2 with the adaptive governor: observed TA DPR1–2, Cup1.75–2. These are local RAF results, not fixed-DPR2, GPU-time or other-device proof. Submitted triangles include render passes and peak above the600k target; no unique-geometry budget pass is inferred. Human handling, weapons/recovery coverage and a full four-family race matrix remain open. [Full metrics, raw evidence and limitations](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md).

The [runtime freeze](../../output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime/inventory.json) contains **503 files / 178,371,665 bytes** (142 source,43 public,49 complete dist,126 harness,6 configuration,137 physical test files), SHA256 `fb8b4b820300b830cf7732974af714549de6935abbbc6b8e913af17f2298613c`. The physical inventory differs from the 120 executed test files. All 30 saved manifests match their frozen groups. The [127-file evidence inventory](../../output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime/verification-evidence-inventory.json) and [independent exact aggregate](../../output/playwright/blockrunner-final-framing-v3-attempt1-round34-verification-summary.json) retain the failed resource boundary and every run. All four owned browsers, servers, process groups and ports were closed; unrelated5211 was untouched.

## Visual acceptance and next work

**V3 visual admission remains 6/10 for Blockrunner, world parity and overall: FAIL against the 8/10 gate.** The independent reviewer had prior narrow code and V1-image context; this is **not fresh blind**. Chase identity improved, while flat material response, garage pilot occlusion and world/route depth remain open. [Actual V3 review](BLOCKRUNNER_INGAME_FRAMING_V3_REVIEW_ROUND34.md).

The material score remains4.5; the garage front wall hides nearly the whole pilot, and the chase craft is compact despite improved engine separation. World gaps include salt/launch depth, fork/finish landmark composition and Foundry crests hiding route continuation. Native-resolution motion inspection remains open. The [V1 review](BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md) remains preserved at5.5 craft /6 world; reviewer scores are not an objective improvement curve. Technical races do not overrule the visual rejection.

Investigate the resource plateau failure, then review the actual material/framing/world changes and repeat affected technical checks on their own frozen build. Prepare the remaining22 families with their own driver/anchor evidence. No final overhaul, all-family performance, art PASS, commit, push or deployment is claimed.

## Source coverage and historical evidence

**26 preserved source families; four registered families (Teemto, Sebulba, Polwo, Blockrunner), eight logical hero/rival variants, 12 preserved public GLBs, three project drivers added, and 22 source families pending runtime preparation.** Blockrunner retains its original minifigure pilot; it is not a fourth added driver. The 26 saved catalogue downloads are complete and total 748,730,812 source-GLB bytes.

Source authoring ends at152 preserved Blender scenes, including every source/cleanup/fit/paint history and normalized V6 export. The declared DCC normal-encoding budget and exact later-copy/source guards remain scoped in [Blockrunner source details](BLOCKRUNNER_CLEANUP_ROUND34.md). No shared `.blend` save occurred. Ivory Blockrunner differs in beam placement, triangulation and normals; [measured reuse boundaries](../../assets/source/inkstorm/blockrunner-round34/IVORY_VARIANT_SOURCE_COMPARISON.md).

The earlier foundation-material V1 build `index-DAcqiho8.js` (1,617,115 bytes, SHA256 `3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a`) and its 648-test/two-Polwo-race technical PASS remain **frozen historical evidence**. [Historical report](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md). Round32 remains the prior three-appearance/six-race matrix; this representative Blockrunner attempt does not repeat that matrix.

Earlier foundation/corridor/effects chronology, context-readiness failures, resource evidence and operational source constraints are preserved in the [pre-admission round document](evidence/round-34/pre-blockrunner-admission-documentation/ROUND34.md). Keep terrain authority, course9/drive4/rules2, source licences and original Cruise context. [All seven preserved documents](evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).
