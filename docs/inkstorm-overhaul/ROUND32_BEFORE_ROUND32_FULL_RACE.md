# Round 32 — catalogue acquisition and Polwo integration

**Final functional checks PASS; full-race performance is pending.** Frozen build
`index-1xbykiGm.js`, **1,604,509 bytes**, SHA256
`f09516c19dc7c4b04372e7ee4416537444a9b989c404a05206088f9fb27855e0`
passes **618 tests / 111 files**, typecheck/build, Polwo lifecycle and the three
existing regression diagnostics. [Final verification log](../../output/gauntlet/round32-final-verify.log).
The current quiet full-race run must finish and be audited before any round32
cadence or completed-race acceptance is stated. **Round31 remains the last fully
verified frozen performance checkpoint.** No overhaul commit, push or deployment.

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
Manifest counters await the final frozen performance evidence; previous entries
and history must remain intact.

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

The final [revision3 comparative review](POLWO_REVISION3_REVIEW_ROUND32.md)
retains removal of the displaced stack/duplicate lip, the useful garage view and
separated chase depth. It still rejects vehicle/world target parity: tallest
launch chimney cropped, weak pilot/control separation, insufficient broad panel
construction, and major geology/foundry-depth gaps. This review is independent
but implementation-aware, **not fresh or blind**. Fresh worker creation is currently constrained by the four-thread cap; no current account-quota/reset is claimed. It directly inspected all nine
revision3 PNGs, revision1, concept10 and all seven original world targets. The
last fresh world verdict remains round31 **FAIL, 0/7, mean 4.79/10**; do not
compare means from different critics as objective progress.

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

Full Time Attack, Canyon Cup and Continue checks for all three appearances and
their exact frozen cadence remain pending. No round31 performance number applies
to this changed bundle. Twenty-three source families still need runtime work;
all seven world targets, driver construction, human/controller/audio, full
championship balance and other-device acceptance remain open. The existing
synthesized audio still lacks a critical direct audition.

`assets/source/inkstorm/foundry-service-round33/` is **preparation only**: preserved
input/arithmetic checks pass, but its Blender authoring/export/render and actual
source/world review have not run. It is not part of the frozen round32 runtime.
[Preparation receipt](../../assets/source/inkstorm/foundry-service-round33/preparation-receipt.json).

The complete previous round32 document and handover introduction are preserved as
[ROUND32 before final diagnostics](ROUND32_BEFORE_FINAL_DIAGNOSTICS.md) and
[HANDOVER before final diagnostics](HANDOVER_BEFORE_ROUND32_FINAL_DIAGNOSTICS.md).
[Round31 history](ROUND31.md), its [full-race report](FULL_RACE_PERFORMANCE_ROUND31.md)
and [original gallery](CURRENT_VISUALS_ROUND31.md) remain unchanged. No deployment.
