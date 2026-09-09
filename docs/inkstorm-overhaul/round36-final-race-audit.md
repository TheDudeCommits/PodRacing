# Round 36 final native race audit

Independent read-only audit: **PASS, 103 checks**, 2026-09-09. Recomputed every raw RAF interval and both racing/countdown summaries using Python; did not run a browser, test suite, build, or GPU workload. No product files changed.

| Final capture | Racing intervals | Full racing wall time | Mean RAF Hz | p95 / p99 | Maximum | >25ms / >33.3334ms / >50ms |
|---|---:|---:|---:|---:|---:|---:|
| Time Attack | 3,798 | 63.7308s | 59.5944 | 16.8 / 16.8ms | 33.4ms | 26 / 8 / 0 |
| Cup, Canyon round 1 | 7,983 | 134.9446s | 59.1576 | 16.8 / 33.3ms | 33.4ms | 114 / 49 / 0 |
| Battle | 6,392 | 107.5790s | 59.4168 | 16.8 / 16.8ms | 33.4ms | 63 / 22 / 0 |

Every interval equals the difference between adjacent RAF timestamps. Each file has one initial null interval, monotonic timestamps, and one uninterrupted racing block bounded by countdown and finished phases. Stored summaries reproduce exactly within 1e-7. No racing interval or transient was removed; full classification grace remains included. Quantiles use `floor((N−1) × q)`, matching the capture estimator. Countdown summaries also reproduce.

Time Attack finished in **63.741667s** with a valid gold personal best, zero player wrecks/recovery events, no reset input, ten correctly ordered sectors, and a persisted 639-frame ghost. Sector and lap sums match the finish clock. Cup round 1 finished the player in **126.958333s**, also a valid gold personal best without a wreck/recovery/reset, with twenty ordered sectors across two laps and a 1,271-frame ghost. Full Cup classification ends at 134.966667s, including 8.008333s after the player finish. Seven racers finish; Miri Voss is DNF after the classification grace. No zero-contact claim is made: the observer does not expose all base suspension/racer collision counts.

Cup storage contains exactly one Canyon round, eight ordered placements, and points `[15,12,10,8,6,4,2,1]`. Continue preserves those standings and selects Foundry (`cup-foundry`, pending seed `1179604302`) in preparation with `awaitingStart=true`, race time/frame zero. The currently loaded course is still Canyon until race confirmation. This verifies next-round selection, not a loaded or completed Foundry race.

Battle finishes the player in **101.183333s**; classification ends at 104.216667s. Its longer wall interval includes normal combat slow motion. The player has four wrecks and the field has twenty. Recomputed events include 317 lance shots, 72 weapon hits, twenty deployed mines, eighteen takedowns, and twenty recovery completions. Eight racers are present. The recovered finish correctly yields **no personal best, no saved record/ghost, and invalid history**, with the explicit “Recovery used” result reason. It is a combat-finish acceptance, not a clean competitive run.

All three receipts pin the same current final bundle:

`dist/assets/index-DH3wvA-l.js` — `e507c666fbe809c2275fa90a1d7434afce9a96be1e9d0a68ab0ee46616639a53`

The current harness hash matches all receipts: `scripts/competitive-flow.ts` — `de6e9af90206498d16821e225b1726ec7434e499b4d09ff3c8e366bf0d33d666`. All 32 integrated source/test/harness entries in `output/release/round36/SOURCE_FREEZE.json` and all ten owned source/test entries in `output/handling-round36/SHIPPING_SOURCE_FREEZE.json` match current bytes. Saved PB identities use `inkstorm-drive-5`, `inkstorm-course-9`, stock builds, 120Hz simulation, and the original suspension/landing tune. Relative-hover, altered landing, ground-effect, and extended-range experiments remain withdrawn. Earlier `643d…` physics and failed native captures are superseded, unreleased evidence.

Captures use HeadlessChrome 153, ANGLE Metal Apple M4, 1440×900 viewport and requested DPR 2, with ordinary pace 1 and adaptive quality enabled. Observed DPR spans 1–2 for Time Attack/Battle and 1.875–2 for Cup. These are local native RAF measurements, not fixed-resolution 2880×1800, GPU timing, physical display cadence, universal-device FPS, human handling, or visual-benchmark acceptance. Ghost data validates persistence, not visible ghost geometry. Both receipts record closed browsers, exited owned preview servers, and no browser errors.

Raw inputs: `output/gauntlet/round36-competitive-approved/{receipt,time-attack,cup-round-1}.json` and `output/gauntlet/round36-battle-approved/{receipt,battle}.json`. Reproducible arithmetic, input hashes, every source pin, and checks: `output/handling-round36/audit-final-races.py` and `output/handling-round36/final-race-audit.json`. Production publication is outside this audit.
