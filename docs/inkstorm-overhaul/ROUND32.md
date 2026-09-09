# Round 32 — catalogue acquisition and Polwo integration

**Final functional checks and all six full-race cadence gates PASS.** Frozen build
`index-1xbykiGm.js`, **1,604,509 bytes**, SHA256
`f09516c19dc7c4b04372e7ee4416537444a9b989c404a05206088f9fb27855e0`
passes **618 tests / 111 files**, typecheck/build, Polwo lifecycle and the three
existing regression diagnostics. [Final verification log](../../output/gauntlet/round32-final-verify.log).
**Round32 is the last fully verified frozen technical checkpoint.** All six ordinary Time Attack/Canyon Cup cadence gates and all three actual Continue flows PASS on the frozen round32 artifacts: **59.536–59.736 Hz mean, 16.7–16.8 ms p95**, adaptive DPR 1–2 / 1.75–2. All 37,179 raw rows remain, including 216 racing intervals above 25 ms, none above 50 ms and the normal eight-second Cup classification wait after player finish.
[Exact complete-race report](FULL_RACE_PERFORMANCE_ROUND32.md). Later round33 working changes are excluded. No overhaul commit, push or deployment.

Strict source/vehicle/world visual acceptance remains **FAIL**. The revision3
review retains the specific exhaust and framing repairs but does not accept
concept parity. All seven original world targets remain unmet. Functional tests,
staged images and source preparation do not override those findings.

## Source and asset work

All **26 candidate source vehicles** were officially imported and preserved as
GLBs: **748,730,812 bytes**. The refreshed search has 29 results, three excluded
results and no pending candidate downloads. All earlier acquisition receipts,
eight historical 429 failures, authors and licence restrictions remain. The
NoDerivs source remains restricted from public adaptations.

**Three runtime families — Teemto, Sebulba and Polwo — are integrated; 23 other
families still need runtime preparation.** Source visual inspection covers all
26 and formal source driver inspection covers five. Two toy sources have
confirmed original drivers; uncertain occupancy on other sources stays explicit.
The 48 new source inspection PNGs do not establish runtime readiness.
[Catalogue/provenance](VEHICLE_CATALOG.md) ·
[Source inspection inventory](../../assets/source/inkstorm/catalogue-inspection-round32/README.md).
The manifest now records this frozen technical checkpoint, preserves the entire prior file and appends the previous checkpoint/Polwo/acquisition state to history. Main counters already recorded three families; stale acquisition-state counters were reconciled without recounting models. [Finalization receipt](../../assets/source/inkstorm/vehicle-progress-20260908-full-race-round32.json).

Polwo is from Nolan “Polwo” Zannato's CC BY 4.0 source. Its original mesh and
textures remain intact. The project driver was fitted to the existing seat and
grips, with a larger visible helmet and continuous forearm deformation. Two
inherited open shoulder loops were closed with 132 triangles. The first cap UV
attempt crossed atlas islands and failed; the final repair stays within each
neighboring source UV triangle. Failed and retained derivatives remain preserved.
Only 25 invalid tangent XYZ vectors were repaired in the packaging derivative;
source positions, UVs, indices and tangent signs were preserved.

| Package | Bytes | Imported triangles | Imported opaque meshes |
| --- | ---: | ---: | ---: |
| Polwo hero | 10,189,760 | 48,975: 33,064 body + 15,911 pilot | 8: 2 body + 6 pilot |
| Polwo rival | 4,188,076 | 28,830: 19,743 body + 9,087 pilot | 8: 2 body + 6 pilot |

Both packages pass Khronos validation with zero errors and warnings. Rival
geometry retains every new shoulder-cap triangle. Public GLBs match their source
packages byte for byte; lifecycle receipts independently compare actual public
hashes with preflight and browser-served bytes. Imported mesh counts are not the
entire racer/frame draw count.

- Hero SHA256: `17e117cd9cbf86a2cf096ca6cdc0e46413b391395577b5f0774203ce7987f39f`.
- Rival SHA256: `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`.
- [Source history and receipts](../../assets/source/inkstorm/polwo-driver-round32/README.md).
- [Supplementary concept10](concepts/10-polwo-vehicle-round32.png); the original seven world targets are unchanged.

## Preserved candidate history

The first runtime candidate `index-C1kHmeEv.js`, 1,603,467 bytes, SHA256
`cbb59d8fdfeb4eb660cc8072dec1b66f1fe267bd6184afc7883670bbda089c2a`
passed 608 tests / 109 files, typecheck and build. Its seven staged sections,
garage and short live capture loaded Polwo correctly with no browser errors,
while the visual review rejected target parity.
[First capture](../../output/gauntlet/round-32-polwo/receipts.json).

The source review scores materials/construction 6.0, fit/pose 6.5 and
palette/detail 5.5: **REVISE**, below the strict eight-point gate. The first
runtime review rejected collapsed chase depth, obscured pilot detail, mauve paint
and an underfilled garage. Revision1 retained improved camera/garage framing but
exposed an existing misplaced nozzle stack; its rejection remains.
[Source review](POLWO_SOURCE_REVIEW_ROUND32.md) ·
[Initial runtime review](POLWO_RUNTIME_REVIEW_ROUND32.md) ·
[Revision1 review](POLWO_REVISION1_REVIEW_ROUND32.md).

| Lifecycle attempt | Result and retained evidence |
| --- | --- |
| [Initial final attempt](../../output/playwright/polwo-appearance-round32-final/receipt.json), port 63553 | FAIL after live hero checks: harness expected setup ordinal 0 after the ordinary Start rebuild advanced it to 1. Seed, signature, class, event, profile, laps and stock upgrades were unchanged. Exact failed script preserved. |
| [Revision1](../../output/playwright/polwo-appearance-round32-revision1/receipt.json), port 64392 | FAIL at initial rival wait. Time Attack has only the player; absent AI correctly stays procedural without downloading a rival. No runtime preload was added to satisfy the harness. |
| [Revision2](../../output/playwright/polwo-appearance-round32-revision2/receipt.json), port 64622 | PASS on predecessor `index-CibV3UqI.js`, SHA `344f54b9acf3c946cf974758a7439847a367d197d427b26985123058ea1fe3e6`; superseded by final-build rerun. |
| [Final V3](../../output/playwright/polwo-appearance-round32-final-v3/receipt.json), port 64857 | PASS, 12 captured stages, on the exact final build. One expected injected hero HTTP503; no unexpected error. |

Every attempt above closed its owned browser/context/process group/port.
[Before-source preservation and repair evidence](../../assets/source/inkstorm/polwo-garage-round32/README.md).
The fixed harness explicitly checks Start's +1 ordinal, reload's original garage
ordinal, and the later deliberate Cup event/profile/lap transition. It keeps
identity equality across all appearance changes and verifies unchanged mastery
storage bytes. It does not claim migration or a pre-existing personal-best replay
from its fresh isolated browser context.

## Retained runtime corrections

Only installed Polwo receives the higher, more separated chase view. Its garage
uses the opposite rear quarter; existing vertex fitting, FOV, padding and all
other craft directions remain. CPU tests project every packaged vertex through
all twelve inspection angles on square and wide hosts. A Polwo-specific material
override removes the inherited red rim, blue reflection and duplicate procedural
wear; it preserves the authored atlas instead of applying a global brightness
increase. Physics and **course9 / drive4 / rules2** record identities are unchanged.

The original exhaust estimate selected the aft spike tip. The corrected external
metadata uses the original rear fan's center plane: left
`(-3.9291968346, 1.6775317192, 8.1356463162)` and right
`(3.9291970730, 1.6775316596, 8.1356463162)`, replacing the prior Z
`5.8353648` estimate. Polwo declares existing authored exhaust hardware, so the
additional generic pale nozzle lip is omitted. Existing source cowls remain;
source GLB empty markers are preserved study metadata, not the corrected runtime
anchors. Pilot and coupling anchors remain unchanged.
[Attachment measurement](../../assets/source/inkstorm/polwo-driver-round32/nozzle-correction/attachments-study-v2.json).

The prior [revision3 comparative review](POLWO_REVISION3_REVIEW_ROUND32.md) retained removal of the displaced stack/duplicate lip, the useful garage view and separated chase depth, while rejecting vehicle/world target parity. It was independent but implementation-aware, not fresh/blind; that record remains unchanged. Earlier worker requests hit the four-thread cap, but a fresh slot subsequently opened. No current account-quota/reset is claimed.

## Completed fresh blind review

The fresh [blind final review](BLIND_POLWO_FINAL_ROUND32.md) is **strict FAIL, 5.8/10 overall**, below the requested 8/10 gate: vehicle approximately **6.5**, world construction **5.5**, gameplay driver readability **4.5**. These are holistic judgments, not arithmetic averages. All seven original world targets remain unaccepted. The critic directly inspected nine frozen round32 outputs plus the original seven targets and concept10 without implementation/prior-review context. All **17** independently recorded image hashes match the inspected files; [component scores and hash proof](evidence/round-32/blind-review-inventory.json). The critic reviewed still images only and opened no browser or Blender. It does not infer grip, contact, articulation, handling or a completed lap from a still. Frozen32 functional/lifecycle/full-race PASS remains separate.

| Area | Construction | Style | Route | Driver | Target parity | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Garage / Polwo presentation | 6.5 | 6.5 | N/A | 5.0 | 6.0 | 6.1 |
| 01 — Grid | 6.0 | 6.0 | 7.0 | 4.5 | 5.0 | 5.8 |
| 02 — Salt run | 5.0 | 6.0 | 7.0 | 4.5 | 4.5 | 5.4 |
| 03 — Canyon | 6.0 | 6.0 | 6.5 | 4.5 | 5.5 | 5.9 |
| 04 — Fork | 5.0 | 5.5 | 5.5 | 4.5 | 4.0 | 4.9 |
| 05 — Launch | 6.0 | 6.0 | 6.5 | 4.5 | 5.5 | 5.9 |
| 06 — Foundry | 5.0 | 5.5 | 5.5 | 4.5 | 4.5 | 5.0 |
| 07 — Finish | 5.0 | 5.5 | 6.5 | 4.5 | 4.5 | 5.2 |
| Live-drive still | 5.5 | 6.0 | 6.0 | 4.5 | 4.5 | 5.3 |

The live-drive still has no dedicated paired target; its parity score refers to the original salt-run/world language. The **5.8 overall is the critic’s holistic judgment**, not the mean of this table. Foundry/fork structure and route continuation, pilot/control readability, material hierarchy, and large-to-small geological/service-bay composition are the main priorities. Do not equate more props, a closer isolated model view or technical PASS with target acceptance.

Critic document SHA256: `9b8ea71970a1fa3175ec2ba6c81fac53f849fd9056c55750546a61d6c32bfcd5`. The [review inventory](evidence/round-32/blind-review-inventory.json) preserves all 17 image hashes, exact component scores and pre-update document/manifest hashes. The historical round31 fresh world score remains 4.79/10 in its own report; differing critics’ scores are not an objective progress curve. Active round33 source/public candidates and later bundles remain outside this frozen32 verdict.

## Final functional receipts

All four diagnostics below loaded `index-1xbykiGm.js` and independently recorded
its exact SHA. Existing regression scripts remained byte-identical during the
sequential wrapper run. These checks are separate from full-race performance.

| Check | Result and exact scope |
| --- | --- |
| [Polwo lifecycle](../../output/playwright/polwo-appearance-round32-final-v3/receipt.json) | PASS: Classic→delayed Polwo→Classic cancellation, decoded 0/90/180/270-degree garage views, reload persistence, class fallback/return, five seconds of ordinary input, 2 body-shadow draws / 33,064 triangles, deliberate HTTP503 fallback/Retry, and all identity/storage guards. |
| [Actual Cup rival admission](../../output/playwright/polwo-appearance-round32-final-v3/receipt.json) | After all hero checks, the public Canyon Cup button creates 8 actual entries; `ai-sola` index 4 loads the real 28,830-triangle Polwo rival. Its served hash matches public bytes. The captured countdown LOD is silhouette: 8 registered prepasses, 2 visible body prepasses. This is admission evidence, not eight visible pilot/body submissions or a completed Cup. No rival browser request occurred in Time Attack. |
| [Teemto/Sebulba lifecycle](../../output/playwright/round32-final-regressions-20260908T090832Z/vehicle-appearance/receipt.json) | PASS, 14 stages; only two expected injected HTTP503 console errors. Port 65008 closed. |
| [Context recovery](../../output/playwright/round32-final-regressions-20260908T090832Z/context-recovery/receipt.json) | PASS, no page/console errors. Three-second context suspension freezes simulation; restored cadence history resets to 0. Static atlas bakes 2→3→5. Incomplete player framebuffer injection makes 1 bounded check/1 injection, stays latched, then recovers after explicit invalidation. Port 65070 closed. |
| [Resource cycles](../../output/playwright/round32-final-regressions-20260908T090832Z/resource-cycles/receipt.json) | PASS, no errors, 25 samples across three staged seven-section/garage cycles. Each peak and garage count is 212 geometries / 115 textures / 50 programs. Every cycle3−cycle2 delta is 0. These counters are not GPU bytes, a complete leak proof or live-race timing. Port 65098 closed. |

[Sequential wrapper and ownership/cleanup receipt](../../output/playwright/round32-final-regressions-20260908T090832Z/wrapper-receipt.json)
confirms all owned browser processes/groups/ports closed, unchanged scripts/build,
and untouched port5211 (no listener before or after this wrapper). The separate
full-race run was authorized only after this browser-free boundary.

## Current gallery and outstanding work

[Current visuals](CURRENT_VISUALS.md) contains nine byte-exact revision3 PNGs;
[hash inventory](evidence/round-32/gallery-inventory.json). Seven numbered views
are time-zero staged chase captures at simulation frame 2400. The garage and one
short live still complete the set. The live PNG's 0:07.16 clock and separately
saved 7.2667-second snapshot are nearby observations, not an atomic match.
None establishes motion, all-route driving or 40–60fps.

The separate [complete-race report](FULL_RACE_PERFORMANCE_ROUND32.md) records six PASS gates and three Continue flows. All six before/after manifests match 137 source / 36 public-art / 43 dist / 11 harness / four config entries. Native errors are empty; ports 65162/65284/65424 are closed. The first post-run analysis failed a one-ULP Python-versus-JavaScript summation equality check; the preserved reconciliation uses exact sequential addition with no tolerance or native gate change.

Twenty-three source families still need runtime work;
all seven world targets, driver construction, human/controller/audio, full
championship balance and other-device acceptance remain open. The existing
synthesized audio still lacks a critical direct audition.

**Round33 is active and unaccepted.** Working source now includes industrial presentation metadata, a gantry appearance module and an extra render batch; those changes are outside round32. The 09:31:52 UTC [scope audit](../../output/gauntlet/round32-freeze/documentation-audit.json) found two modified source files and a new module/test, while saved dist still matched round32. The first isolated Blender authoring attempt failed normal re-encoding tolerance and was cleaned up with Cruise context restored; its replacement source asset was not yet installed/exported at that handoff. Further round33 work needs its own build, actual images and performance receipts. The [394-file / 83,433,926-byte frozen runtime](../../output/gauntlet/round32-frozen-runtime/inventory.json) is the authority for round32 PASS.

The complete previous round32 document and handover introduction are preserved as
[ROUND32 before final diagnostics](ROUND32_BEFORE_FINAL_DIAGNOSTICS.md) and
[HANDOVER before final diagnostics](HANDOVER_BEFORE_ROUND32_FINAL_DIAGNOSTICS.md).
[Round31 history](ROUND31.md), its [full-race report](FULL_RACE_PERFORMANCE_ROUND31.md)
and [original gallery](CURRENT_VISUALS_ROUND31.md) remain unchanged. The pending-performance versions were additionally [preserved before finalization](evidence/round-32/full-race-document-preservation.json). No deployment.
