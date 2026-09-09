# Round 31 — active integration, acceptance incomplete

**Round 30 remains the last fully verified checkpoint.** Round 31 currently integrates a physical launch opening, its terrain-join correction and course-9 record boundary, fork advance guidance, and Teemto open-cockpit V1. The launch and fork changes have bounded evidence to retain them. Cockpit V1 improves pilot visibility but fails the finished-cockpit review; a tapered-cowling/material refinement, V2, remains in source work. No final round-31 full-suite count, combined final gallery, complete-race performance or overall art acceptance is claimed here. No commit, push or deployment.

This is a progress record for the evidence inventoried on 8 September 2026 local time (7 September UTC), not a freeze. The [working receipt](../../output/gauntlet/round31-working/progress-receipt.json), [199-file evidence inventory](../../output/gauntlet/round31-working/evidence-inventory.json) and [working source/art identities](../../output/gauntlet/round31-working/working-artifacts.json) pin this observation. Later edits require their own verification. [Round 30 evidence](FULL_RACE_PERFORMANCE_ROUND30.md) and its published checkpoint documents remain separate.

## Physical launch and course edition

The old broad shoulder hid the basin from the actual crest camera. The new field moves the rim 20 m earlier, changes the convex descent into a concave escarpment and lowers the floor by 44 m: **138 m descent over 600 m**, replacing course 8's 94 m drop. It opens the central basin throat while preserving the horizontal route and checkpoint plan. Camera settings are unchanged. This is real physical ground shared by driving and rendering, not a separate visual cliff or panorama.

The initial opening exposed sharp shoulder trenches and caused a real salt continuation regression: the existing 650 m sightline fell to **0.312574 m**, below its unchanged **0.9 m** threshold. The retained join revision widens the throat bank transition from 12 m to 48 m and changes only the first 30 m of the leading profile. That local lip correction raises the salt sightline to **1.039226 m** while preserving positive crest-to-basin margins of **1.110633 / 3.652895 / 3.844238 m** at 450 / 600 / 800 m. Broad 60 m and longer local 48 m lip alternatives repaired the salt guard but obscured the basin; their rejected source and receipts remain intact.

Against the first course-9 field, the join correction changes sampled legal lanes only at distances **1288.023–1330.958 m**, by at most **1.132533 m**. Its 205,785 lane/normal probes find no change on other main-road samples or any branch samples. Maximum centerline grade over 8 m windows sampled every 2 m remains **48.8754%**. These are discrete source measurements, not continuous collision or handling proof.

An independent comparison against preserved **course-8** data also passes: **195,426 main lane/shoulder/normal samples outside fixed launch bounds and 16,200 alternate-route samples are exactly unchanged**. The original finish field remains byte-identical. Both R32F layouts retain their 417²/257² grids, 6 m resolution and **959,752 total data bytes**. The CPU bilinear field and renderer/depth/normal/road shared-field topology remain intact; no additional texture, mesh, draw call or per-frame field work is introduced. This is source-contract evidence, not new GPU height/normal readback. [Independent integration review](ROUND31_INTEGRATION_REVIEW.md).

The active identity is **course 9 / drive 4 / rules 2**. The generator edition changes because physical racing heights change; vehicle constants and competition rules retain their identities. Existing migration archives old record and saved-course metadata, removes old ghost poses from active comparison, and preserves history. It conservatively applies across other seeds too, under existing 72-record/32-favorite archive limits.

Source packages: [launch reveal](../../assets/source/inkstorm/launch-reveal-round31/README.md) and [surface joins](../../assets/source/inkstorm/launch-surface-join-round31/README.md). Their original “source-only” statuses describe the earlier authoring stage and are preserved; root subsequently integrated the candidates. The final joined field used by the driving receipts hashes to `8b76e3a68e5e613484bc3d4cf46ab94b7d4781161dee1300cba5190a2c71bc48`.

## Driving, migration and terrain evidence

All **eight automated input-only class laps** on the joined field finish naturally, with gold results and **zero resets, collisions, scenery collisions and wrecks**. No pose, time or progress mutation is used. Normal and launch-boost results are retained in `output/drive-balance/launch-round31-final-{normal,boost}.json`.

| Class | Normal finish | Launch-boost finish | Normal / boosted launch airborne time |
| --- | ---: | ---: | ---: |
| Podracer | 60.516667 s | 60.208333 s | 3.391667 / 3.441667 s |
| Landspeeder | 67.033333 s | 66.833333 s | 3.900000 / 3.833333 s |
| Speeder bike | 57.641667 s | 57.375000 s | 3.416667 / 3.450000 s |
| Skim speeder | 62.841667 s | 62.591667 s | 3.383333 / 3.433333 s |

These CPU simulations establish bounded automated completion and landing observations. They are not browser cadence, visual vehicle acceptance, tuned-machine coverage or human handling approval. Earlier pre-join normal/boost/AI receipts remain alongside the final-field versions.

The separate `launch-round31-final-ai.json` observation records **all eight racers naturally finishing two Canyon Cup laps**, including the player. It is not a collision-free grid: the player has 15 racer collisions; AI have scenery and racer contacts, **three recoveries** (Olan at 53.20 s, Miri at 126.541667 s, Sola at 134.408333 s) and Miri has one wreck. There are zero launch resets. Launch contacts are recorded for Vexa/Talik and Miri/Olan. Per-racer collision counters count each racer separately and must not be summed as unique contact events. The receipt's `cleanCompletion` flag does not erase these incidents.

The [actual edition-migration receipt](../../output/playwright/course-edition-round31/receipt.json) is **PASS**. It loads the real round-30 Teemto course-8 PB of **63.325 s** into fresh isolated browser storage, performs ordinary **Save course** and reloads. Old time/lap/sector/identity metadata survives exactly except for the intentionally removed ghost; the active course-9 PB remains empty, the old ghost is unavailable, and the newly saved course carries edition 9. No user profile is touched. The archive notice and saved-course state survive reload; errors are empty and the browser closes.

The [terrain-coverage receipt](../../output/playwright/terrain-coverage-round31/receipt.json) is also **PASS**: approach, crest and descent are captured at highest and lowest profiles. Highest requests six levels at DPR 2; lowest requests four at DPR 1; both retain **six effective terrain levels and 3072 m coverage** in all six samples, with null recorded terrain/racer shadow failures. Artifacts are unchanged during the diagnostic, errors are empty and the browser closes. Its historical capture-mode/DPR harness correction remains documented. This proves the recorded rendering scope, not frame-rate or GPU readback acceptance.

Migration and terrain diagnostics use **index-B_ma1tHK.js**, SHA256 `bfe2bcc7a8b140815b6ae966d37445fccb5034d402db114c8e6c33df5149923a`. It is an intermediate round-31 build, not a final frozen acceptance bundle.

## Fork, cockpit and visual review

Fork guidance adds one original diagram before commitment, seven cream lower-route confirmation markers and one cyan bridge marker. The source budget is **780 triangles, 84,240 attribute bytes, two opaque material draws, no texture or frame callback**. Exact solid-box XZ checks clear all sampled route segments by at least 4.186820 m. The world owns geometry/material disposal through its existing road list. This proves a bounded source placement/resource contract, not arbitrary scenery clearance or continuous-play readability. [Source handoff](../../assets/source/inkstorm/fork-wayfinding-round31/HANDOFF.md).

Teemto open-cockpit **V1** replaces the opaque upper hull with an authored opening, physical coaming and capped decks. It is a deliberate derivative silhouette; the source does not prove the imported roof was transparent glass. The original imported source, enclosed V4C, engine/pilot geometry, texture data and anchors remain preserved. The installed V1 is **7,707,484 bytes, 57,234 triangles and 11 opaque draws (5 body / 6 pilot)**, within unchanged 60,000-triangle/12-total/6-body/6-pilot limits. Its SHA256 is `e7fe0097061d6af30a73538e10608ed8956c6565c3c9fd1fe745d8bf521c03b0`. Both runtime URL and revision change to avoid stale cache identity. The missing-deck draft and rejected 13-draw draft remain preserved. [Cockpit source evidence](../../assets/source/inkstorm/teemto-open-cockpit-round31/README.md).

| Fresh image review | Bounded outcome | Remaining acceptance |
| --- | --- | --- |
| [Launch opening](BLIND_LAUNCH_ROUND31.md) | Retain B; 5.5/10 versus 4.5/10. Crest and launch reveal improve; approach/descent regressions recorded. | Strict parity FAIL; basin remains sparse and shallow in layers. |
| [Launch surface joins](BLIND_LAUNCH_JOIN_ROUND31.md) | Retain B; strongest improvement at descent, with a slight broader-shelf tradeoff at crest. | Strict parity FAIL; linear boundaries, dark pocket and weak terrain depth remain. |
| [Fork guidance](BLIND_FORK_COCKPIT_ROUND31.md) | Retain B; bounded advance choice/identity/continuation **PASS, 7/10**. Intelligible by 275 m in sampled views, not clearly legible at 325 m. | Strict target FAIL, 4/10; smooth raised ribbon and competing marker types remain. |
| [Cockpit V1](BLIND_FORK_COCKPIT_ROUND31.md) | Retain B as a better base; pilot and forward visibility improve, but finished-package **FAIL, 6/10**. | Strict target FAIL, 3/10; squared end blocks, abrupt tub/body transitions and exposed stacked pieces remain. V2 is pending. |

These critics inspected only their named actual A/B PNGs and original targets. No score establishes driving or performance acceptance. Five intermediate capture sets contain **126 PNGs**, with empty capture-error arrays and successful process cleanup. They are separate candidate comparisons, not a final combined gallery.

[Supplementary concept 09](concepts/09-open-cockpit-detail-round31.png) guides tapered cowl transitions and material reuse after the V1 failure. Its SHA256 is `880e17a9bc1f729816ead00df470a154ac66fe779e27aae6fb7986936b978f7b`; [provenance](concepts/09-open-cockpit-detail-round31.json) identifies it as generated construction art. It is not an actual screenshot or a replacement acceptance baseline. The original seven world concepts remain authoritative.

## Tests, preserved failures and remaining work

The initial candidate suite recorded **589 passed / 4 failed of 593 tests across 106 files**. Three failures were historical course-8 landscape fixtures; the fourth was the real salt visibility regression. The join fixed the salt failure without changing its 0.9 m threshold. Historical test copies remain preserved. The three deliberate edition fixtures now use the 138 m drop and <0.49 sampled grade while retaining floor, return, branch, checkpoint and CPU/render checks: the focused terrain run passes **14 tests / 4 files**. The earlier 3-failure focused run is retained too.

Vitest previously matched only `.ts` tests and silently excluded the `.mjs` asset-header suite. Discovery now includes both extensions under `tests/`; its **4 asset tests pass**, separately from **31 imported-appearance tests**. The independent course-edition/archives/asset run passes **10 tests / 3 files**, reported in [the integration review](ROUND31_INTEGRATION_REVIEW.md); there is no separate log for that run. These overlap and must not be added into an invented full-suite total. Final complete verification is pending.

Remaining work before a new checkpoint: complete and review cockpit V2; verify the final combined source with all tests, TypeScript, build and whitespace checks; run the final gallery and fresh world critique; exercise final vehicle lifecycle/context/resource behavior; and capture both appearances' full Time Attack/Canyon Cup/Continue performance against one frozen artifact set. Human/controller/audio, broader balance, other devices, final pilot finish and overall art acceptance remain open. Round-30 evidence does not automatically cover any of these changed round-31 artifacts.
