> Historical experiment review. The relative-hover implementation evaluated here was subsequently withdrawn after full-race regressions. These isolated results do not describe shipping suspension. See [the retained changes and failure analysis](HANDLING_ROUND36.md).

# Round36 handling rereview

**The original P2 edge-launch reproduction is resolved. No new P1/P2 was established in this bounded rereview.** Reviewed `src/game/simulation/podracer.ts` SHA-256: `643d54f2902ab726da9f32c274380ef6a6f3aa9003c1fbe4748dbc7a2bc01795`.

The earlier failure remains intact under `output/round36-handling-review/`. New results, scripts and hashes are under `output/round36-handling-rereview/`; no production source or tests were edited.

## Original failure rerun

The same 3 m step, 120 m/s approach, initial `(0, 3.3, -1)` position and −4 m/s descent were replayed without changing the fixture. The runner reused the previously archived HEAD physics rather than assuming HEAD had remained unchanged. Its baseline samples equal the original baseline exactly.

| Measurement | Original faulty slope fit | Frozen fix |
| --- | ---: | ---: |
| First-contact upward velocity | 47.423471659 m/s | 0.185693750 m/s |
| Reported landing speed | 48.780857813 m/s | 4 m/s |
| Damage | 0.097386402 | 0 |
| Height after 60 ticks / 0.5 s | 24.150556157 m | 5.165322748 m |

The fixed reproduction's recorded samples and events match the archived pre-change HEAD baseline exactly. Flat-terrain and ordinary 3/24 m step controls were also rerun by the unchanged compact probe; all evidence is retained in `probe.json`.

## Why the fix addresses the cause

At `podracer.ts:215–243`, velocity matching uses the patch under the closest in-range suspension probe, rather than the slope fitted across all six body probes. Two additional height samples are taken 0.25 m forward/backward along actual horizontal velocity. Their one-sided slopes must agree within 0.2 before contributing surface velocity. On the previously failing flat upper ledge, the local derivative is zero. When this small patch itself crosses the sharp edge, the unequal one-sided slopes reject the fictitious ramp. Missing support and speed at or below 0.01 m/s produce zero surface velocity without extra queries.

The existing body-wide fit still supplies attitude targets; the change is confined to damping, landing closure and rebound. The new tests include both initial offsets −1 and −2.8 m at three headings, so they exercise the body-straddled ledge and a supporting patch near the edge. They retain no-damage, honest clearance, subsequent speed and 60-tick height checks.

## Focused verification and exact sampler cost

- `terrainEdgeLanding.test.ts` plus `hoverAndGlance.test.ts`: **20/20 pass**, one worker. This covers ±12% slopes at three headings, descending reacquisition, slope-relative hard-deck rebound at ±18%, the new ledge cases, and continuous ±37.3% ramps with comparable slope to the rejected coarse fit.
- Existing `podracer.test.ts` selected case “leaves support over a crest gap”: **1/1 pass**, six unrelated cases unselected. Airborne, landing, spray and shake behavior remains covered.
- Independent counted-sampler probe confirms these direct `stepPodracer` costs with six stock probes:

| Case | Archived HEAD | Frozen fix | Added |
| --- | ---: | ---: | ---: |
| Moving supported tick | 12 | 16 | 4 |
| Hard-deck correction tick | 18 | 24 | 6 |
| Stationary supported tick | 12 | 12 | 0 |
| Fully airborne tick | 12 | 12 | 0 |
| Separate moving-supported derived-state refresh | 6 | 8 | 2 |

The implementation adds at most two samples per `sampleTerrain` call. A caller that also performs a supported refresh has 24 samples for ordinary step+refresh, or 32 for correction+refresh. These are bounded sampler-call counts, not a frame-rate claim or the whole RaceSimulation query total.

Logs: `focused-tests.log`, `gap-test.log`, `query-probe.json`. Exact source/evidence hashes and equality results: `rereview-evidence.json` in the new folder. Both in-process Vite loaders closed in `finally`; no listener/browser, build, full suite or GPU work was used.

## Acceptance limits

This closes the demonstrated P2 and verifies the intended smooth-ramp behavior. A finite three-sample local derivative remains an approximation; it cannot prove continuity between arbitrary unsampled points. Native driving feel, full-course behavior and the cost of additional terrain samples remain root integration/performance work. No test thresholds or physics assertions were weakened by this review.
