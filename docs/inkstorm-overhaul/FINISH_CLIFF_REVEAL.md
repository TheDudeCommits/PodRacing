# Finish outer-cliff reveal

7 September 2026, local. The round-17 critique described a broad sandy turn, separated rail modules and a weak final destination. The finish concept instead uses a substantial retaining edge, exposed drop and route landmark as one composition. This revision changes the physical off-road finish shoulder and its retaining construction. The racing lane and its banking are unchanged.

## Physical landscape contract

Only the **finish** gulf's shoulder fade changes, from 64m to **22m**. The protected region remains the route half-width plus **10m**, plus the existing **12.485m filter/normal margin**. The narrower transition begins beyond that exclusion. The same negative displacement field drives terrain rendering, depth/normal passes and physics; there is no display-only cliff or new driving surface.

The original launch/salt grid is byte-identical to the recorded round-17 baseline, SHA-256 `64896a06c933c96bd1966a0e20852ebb214df025999059428da9b8e1aa53bc00`. The two grid dimensions remain 417×417 and 257×257, totaling 959,752 bytes. No new texture, terrain sampler, grid allocation or maximum depth is introduced. Every existing lane, branch, shoulder and physics/MRT-normal protection test passes.

The independent baseline in `tests/terrain/finishGulfRound17.json` was recorded before changing the fade. Its typed copy feeds the regression test. At the real seventh capture's progress **0.83203125**, the old bilinearly sampled finish displacement was **−8.911m** at 35m beyond the lane edge and **−35.825m** at 45m. The revised interpolated depth is verified to exceed **75m / 140m** at those same world coordinates, improvements greater than **60m / 100m**. At the tested 15m shoulder points, the former zero displacement stays exactly zero.

## Retaining wall and route landmark

The outer barriers are sampled at approximately 14m intervals, offset by the lane width plus 27m. Up to 88 accepted nodes follow the actual hairpin. Adjacent nodes connect only when their centers are at most 24m apart and their outward directions agree. This keeps each connecting prism covered by adjacent independently cleared 13m footprints and prevents a wall from bridging a rejected placement or a change in turn direction.

Closed prisms join a deep violet retaining foundation, rust impact body, cream coping and two dark rails. Founded outer ribs and supported directional panels break up the long wall. Coping height follows the protected inner shoulder. Each toe extends at least eight metres below the minimum terrain sampled across the outer footing, so the structure meets the actual steepened cliff. The tests independently check toe contact at both sides and five positions along every generated span; they also require uninterrupted joining through the visible finish bend. Mirrored chevron tests continue to pass.

Two unequal 78m/57m signal pylons mark the **actual continuing route**, 70m beyond the strongest upcoming turn point within the finish's local bend. They are directional landmarks rather than a relocated race finish line. Each pylon and its inward cantilever stays inside a 23m enclosing disk outside every main/branch lane. Their foundations extend to local terrain. A forward camera projection test confirms that at least one signal panel lies inside the normal view from the seventh capture's real route position.

The wall and both signals share the existing finish batch and vertex-color material. Total Vista geometry remains under the existing 40,000-triangle contract; the finish batch is below 20,000 triangles. There are still at most three Vista draw calls. No public GLB, vehicle, World grounding, citadel, fork layout, camera or road shader changed in this task.

## Validation and next gate

TypeScript checking and `git diff --check` pass. **35 focused tests across eight files** passed across the final finish/Vista/grounding run and the unchanged gulf/launch/salt protection runs. These include actual bilinear depth comparison, exact launch-grid hashing, full-route lane/normal protection, complete generated-geometry footprint containment, dense lane clearance, retaining toe contact, visible continuation markers and both mirrored arrow directions.

```sh
npm run typecheck
npm run test -- tests/terrain/finishCliffReveal.test.ts tests/render/inkstormFinishReveal.test.ts tests/render/inkstormVista.test.ts tests/render/inkstormRockGrounding.test.ts
npm run test -- tests/terrain/courseGulfField.test.ts tests/terrain/launchBasinComposition.test.ts tests/terrain/saltRunProfile.test.ts tests/terrain/launchElevationProfile.test.ts
```

The 22m transition is represented by the existing 6m grid and bilinear sampling. It preserves the required lane and normal margins, while remaining a steep physical off-road descent. Grid/contact/projection checks cannot prove the desired visual spectacle. The coordinated game capture and subsequent complete-race measurement remain the acceptance evidence. No browser, Blender session, build, commit or deployment was started by this finish task.
