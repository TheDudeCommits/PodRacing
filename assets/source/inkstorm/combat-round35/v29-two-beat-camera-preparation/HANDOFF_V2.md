# V29 camera V2 — explicit close-up, then wider catch

Root centrally applied this exact camera candidate alongside its separate contact/UI candidates after verifying all before/candidate hashes. `ADMISSION.json` records that action. **The numbers below are CPU source projections, not native visual acceptance or performance.** Combined verification/capture is owned by root; this preparation does not claim their result. The V28 fresh critic remains **5/10 FAIL 8**.

Patch: `v29-two-beat-camera-v2.patch`, **27,535 bytes**, SHA256 `041087a276e296909b542124d3e33746fb5beecae93d327e78ea6125acb248a9`. Exact file hashes are in `candidate-v2-manifest.json`. Preserved V1 source/patch/metrics and `HANDOFF_V1.md` explain why merely dropping left-engine bounds failed to create a size beat.

## Explicit composition contract

Three production files change: `TeemtoAuthoredDamage`, `WreckVisualPose`, and `CinematicCamera`. No GameApp adapter change was needed; the existing object pass-through carries two optional scalar fields. No FX/contact, engine trajectory, source mesh/pilot/material, terrain, simulation/network, HUD or asset change is included.

The active authored frame uses 16 exact torn front/rear box corners and two exact rupture/contact witnesses. Eight preallocated points restore the left-engine corners during event age **0.13–0.65 seconds**. The explicitly approved horizontal NDC half-span is **.88** initially, returning smoothly to the existing **.74** over the same interval. Both complete torn sections remain inside that composition boundary. The left engine and trailing rods may leave the early picture; this is a deliberate composition change, not relaxed source safety. Its tighter full-source near-plane requirement always wins over requested framing size.

One **14° monotonic arc**, relative to the victim identity's locked tear-side base, runs over event age **.015–.50 seconds**. It begins during the held cut and finishes during catch. Direction is computed from current age, never accumulated camera time or random history. It holds its endpoint during later detached chase and intact protected recovery. The existing exact return to ordinary chase is retained. There is no new outgoing-attacker cut, cooldown policy, replay/manual control or reduced-motion behavior. Missing/non-finite age retains the locked legacy direction. Missing/non-finite horizontal limit retains .74; finite input is bounded to [.74,.90].

All **40 hero / 32 rival source safety corners**, complete-source near/far checks, camera terrain clearance and intermediate spring refitting remain. The 26-point composition array and its centre are reused; eight context vectors are allocated only at binding, with no new per-frame mesh traversal or terrain queries. The unchanged game controller still owns pause, clock and camera policy.

## Actual source projection check

The bounded comparison loads actual hero/rival GLBs with the installed loader, keeps the same source POSITION surfaces and simulation snapshots, and compares the frozen V28 camera with the candidate. It uses a **60 Hz camera, 120 Hz simulation, .18x clock for 820 ms, then 1x**, including render extrapolation and the actual full-fallback birth→authored→protected-chase sequence. This models the policy cadence; native clock easing/PTS and pixels are not asserted.

| Wall time | Event age | V28 hero torn width | V2 hero torn width | V2 rival torn width |
| --- | ---: | ---: | ---: | ---: |
| Cut birth | .000 | Full intact fallback | Exactly identical camera | Exactly identical camera |
| .400 s | .072 | 68.7% | 79.6% | 79.7% |
| .600 s | .108 | 70.2% | 82.2% | 82.3% |
| .817 s, near cut exit | .147 | 70.2% | 82.6% | 82.7% |
| 1.300 s | .628 | 62.1% | 63.4% | 63.3% |
| 1.800 s | 1.128 | 62.8% | 63.8% | 63.9% |
| 2.400 s | 1.728 | 62.8% | 63.8% | 63.9% |

These are **actual POSITION extents** at desktop aspect 1.6. The unchanged source-box birth extent is 72.2%, not directly comparable with torn-only surface rows. Portrait held width is about 83%; short landscape stays around 74–78% during later hold because vertical fitting remains authoritative. We did not force the desktop target by violating that constraint.

Across those three aspects and both variants, minimum actual camera-ground separation was **2.649 / 2.585 m**, above the unchanged 1.2 m requirement. Minimum complete source-box lens depth was **6.327 / 6.243 m**. The complete visible source POSITION checks and four-family fallback suite also passed. Source safety is not proof that moving scenery cannot cross the lens; actual normal/high-speed footage and recovery remain necessary gates.

## Checks and retained failures

- `focused-final-v2.log`: **39 tests / 7 files PASS**, including two private actual-source projection checks. The private checks require a measured close→settled size difference, not just metadata changes.
- `projection-final-v2.log`: final two comparison checks PASS, including exact unchanged birth camera.
- `typecheck-final-v2b.log`: strict TypeScript PASS. `apply-check-v2.log`: dry apply PASS before root's central admission.
- `typecheck-v2.log` and `typecheck-final-v2.log` retain private overlay typing failures: unchanged live fixture imports inferred the older optional framing type. Explicit compatible `WreckVisualPose` annotations resolved those without casts, removed assertions or behavior changes.

The existing composition test now states the early left-engine exception explicitly and checks its source-derived blending. Complete source near/far, pilot/reset, simulation immutability and terrain assertions remain. New tests cover bounded/invalid margins, age/seek independence, monotonic arc, reused storage, intact recovery and normal/manual restoration. Concept18 was viewed as target-only and was not an input to any fresh critic. This candidate demonstrates a source-projected size beat; its impact, scenery, cue and recovery quality must be judged from the forthcoming native sequence under the unchanged seven-image critic protocol.
