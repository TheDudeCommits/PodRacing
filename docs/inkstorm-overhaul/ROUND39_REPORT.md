# Round 39 — Pods on the ground, and shells that fit the hull (2026-09-16)

The owner reported after round 38 that pods still sank into the ground and left the course, and that the shield and ring visuals looked unchanged. This round started from rendered frames instead of simulation receipts.

## What was actually wrong

- **The renderer drew pitch with the wrong sign.** Simulation pitch is nose-up positive (`craftHeight = y + pitch * localZ`), but a three.js X rotation is nose-down positive. Every pod was rendered pitched the wrong way on every slope. On the climb out of the basin the engines were drawn up to 15 m into the terrain; on the descent they were lifted so far the camera lost them behind the crest. Round 38's nose probes made the simulation follow slopes more faithfully, which made the inverted picture worse. A new headless audit (`scripts/hull-burial-audit.ts`) samples the full hull footprint every tick with the renderer's convention: 30–40% of ticks had a hull point below ground, worst 15 m. With the corrected sign it is 1.6% of ticks, worst 3.3 m (a nose tip on a hairpin bank while airborne).
- **The shells were domes and discs.** The shield was an icosahedron plus two hoops centred on the cockpit origin, so it extended 12 m behind the pod; recovery was a thin green disc scanning up and down; redline was two red spheres.

## Fixes

- Pitch is negated once at every simulation-to-renderer boundary: racer poses in `GameApp`, `WreckVisualPose`, the ghost view, and the rupture-direction Euler. Roll and yaw were already correct. The archived V9 wreck checkpoint test now pins the renderer angle as `-pitch`.
- Nose probes moved to (±5, 21.5) m, closer to the real engine tips and outer edges.
- `GalacticEffectsView` shell: a flat-shaded icosahedral skin with a rim-weighted fresnel shader (`inkstorm-faceted-hull-shell-v1`), facet flicker and a slow energy band, no hoops and no disc. Shield: one plate fitted over the hull centre (the caller offsets it forward by 0.85 × collision radius) and flattened to 0.42 of its width. Recovery: two pale sleeves around the engines that breathe up from dark as the engines relight. Redline: two tight hot sleeves around the engines. All are oriented along the craft's yaw and stay still vertically.
- `scripts/effect-stills.mjs` captures deterministic shield/redline/recovery/wreck stills through the review API; `scripts/hull-burial-audit.ts` is the burial measurement.

## Evidence

- Before/after native Battle frames and effect stills: [evidence/handling-round39/](evidence/handling-round39/) (`before-pack-rival-buried.png` vs `after-pack.png`, `before-descent-engines-hidden.png` vs `after-descent.png`, `before-shield-dome.png` vs `after-shield-skin.png`, `before-recovery-dome.png` vs `after-recovery-sleeves.png`, `after-redline-sleeves.png`).
- Hull burial audit: [hull-burial-audit.txt](evidence/handling-round39/hull-burial-audit.txt), 1.64% of ticks over 0.3 m, worst 3.34 m.
- Native browser Battle on the built bundle: finished, zero browser errors ([receipt](evidence/handling-round39/native-battle-receipt.json)).
- Tests: 1029 of 1030 pass in the final run ([log](evidence/handling-round39/validation.log)); the one failure is a 5 s timeout in `TeemtoSupportSettle` under a machine load average above 30 (an active video call, another project's dev server and its headless browsers). The same test passes alone, and the full suite passed 1030/1030 twice earlier in the session. No assertion failed.

## Still open from the owner's complaint

- "Out of the course": the frames show rivals inside the road corridor; the earlier impression came from pods rendered pitched into banks. Rivals do use up to 62% of the road width, so on cambered straights they ride the shoulders. Not changed this round.
- The remaining 1.6% burial is outer-edge contact on cross-slopes; adding edge probes or a per-racer render clamp against the terrain would remove it.
