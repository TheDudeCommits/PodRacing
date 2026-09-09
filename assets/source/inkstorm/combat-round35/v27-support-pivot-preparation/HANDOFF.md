# V27 private support-pivot trial

Frozen, unapplied presentation-only patch: `v27-support-pivot.patch`. Two source files and four test files; no WreckVisualPose, FX, GameApp, camera, simulation, geometry, public or live-test changes. Root owns application and native acceptance.

The existing first contacts remain rear .075 s, front .13 s, left .18 s. A bounded rotation about an actual cached source-support point now follows contact: left -.085 rad, front +.11 rad, rear -.075 rad, followed by one opposite rebound at 24% amplitude and faster terminal angular decay. Final rest occurs at .88/.77/.675 s respectively. Total authored travel remains 3.2/3.8/5.0 m, with the same final yaw/roll, clearance margins and exact birth/recovery/reset. This does not reserve a larger portion of the front's initial 165-degree turn for after contact.

The pivot is selected from cached source samples against the longitudinal terrain plane already sampled for grade. Quaternion premultiplication and translation preserve that point before the unchanged final vertical grounding pass. No terrain calls or source scans were added; only cached vector transforms during the response. World contact direction includes the pivot-to-center arc using the same sampled grade; it does not estimate additional terrain curvature. Parent static review found no blocker, including shared-scratch use and mesh/prepass/shadow consistency.

## Evidence

- 24 tests passed across six files in four focused commands: 12 motion/critical-source/actual-adapter tests; four existing birth/reset/world-direction tests; four contact tests; four unchanged actual hero/rival camera tests. The two legacy full-trajectory tests in TeemtoAuthoredDamage were not selected in the private run; root full verification remains separate.
- The critical-source test checks all visible original positions at 24 event ages, including each contact boundary and both angular extrema: 2,138,878 hero and 1,087,866 rival positions. Minimum clearance .0952106776/.1000000000 m; no-burial threshold remains -1e-6 m. Maximum update terrain queries remain exactly 348/300.
- Actual center travel at 120 ages per variant stayed monotonic to floating-point tolerance and within the original displacement caps. Actual production prepass and selected shadow matrices match the same actual source matrices, with stable registrations through reset.
- The contact tests additionally retain 11 actual simulation-frame checkpoints, full-source no-burial, source/pilot preservation, simulation immutability and exact reset. Camera tests retain complete source near-plane safety, eye clearance >=1.2 m, full/impact bounds, age-zero fallback transition and recovery behavior.
- Private strict TypeScript, patch apply-check and whitespace check passed. This is not a renderer, FPS, visual-quality or native acceptance receipt.

## Explicit test timing changes and retained failures

1. TeemtoStrikeMotion now tests each mass's own braking duration. TeemtoAuthoredDamage's exact terminal-rest comparison moves from .4 s to .9 s; the positional/angular equality and world-direction accuracy predicates are unchanged.
2. The old blanket footprint halfLength >2 m assertion failed at hero frame 926, event age .1333333333 s, during the new roll: reported halfLength 1.5281638554 m. Root explicitly approved distinguishing this transient edge contact from terminal broad rest. The test now requires a positive transient band, independently measures both complete source vertices and cached vertices against actual terrain, reproduces the reported cached endpoints within 1e-7 m, and constrains its discrepancy from complete source coverage by the measured cache coverage gap. No footprint was inflated. The >2 m threshold remains after rear .675 s. The original broad-rest lengths (>8 m left, >4.5 m front, >6 m rear) move from frames 984/1018 (ages .617/.9) to 1018/1110 (.9/1.667), retaining frame 984 as a full-source intermediate-clearance check.
3. At frame 926, hero/rival reported full lengths 3.056/3.071 m versus actual source lengths 3.303/3.280 m, with measured cache coverage .217/.209 m. At age .9 s the reported lengths are 9.592/9.976 m. See contact-band-metrics.json for exact values.
4. A new actual-center check found a .0000473746 m hero reversal at .825 s with the initial angular return. Faster terminal angular decay fixed it; the strict monotonic predicate is unchanged. A private test-only BufferAttribute typing error was also fixed. All initial failures and pre-fix metrics are retained.

## Native decision gate

The added angle is intentionally bounded and may be too subtle. Native acceptance requires a readable changing silhouette and grounded arrest, rather than only numerically detectable wobble. No 8/10 or improvement claim follows from these checks. If needed later, a separate candidate could reserve more of the existing front rotation for post-contact support, but that requires new intermediate geometry/clearance evidence. No further motion expansion is included here.

CPU released; source and tests held frozen pending root integration and actual V27 review.
