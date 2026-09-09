# Salt-run visibility — read-only proposal

Historical proposal. See [the implemented revision](SALT_RUN_REVISION.md) for final values, validation and limits.

The salt-run road is hidden by its own nearby dune crest. Off-road rocks and valleys alone cannot reveal the continuation. A small, shared physical height correction can open the road without moving the camera or changing its horizontal route. **Nothing in this proposal has been implemented or visually accepted.**

The target shows a long, gently bending road framed by a close left escarpment, an oblique right fin and several diminishing valley layers. The current round-16 foreground frame ends at a smooth road hump around one hundred metres ahead. Its very large left shelf-column and two isolated right masses frame mostly sky, rather than a visible route. The new launch composition beyond this section does not remove that nearer obstruction.

## Measured obstruction

At the photographed salt point, course distance is 657.08 m (progress 0.0859375), center X18646.10/Z638.12, lane height -21.27 m, half-width 33.48 m. The recorded live chase eye is X18651.72/Y-10.97/Z620.97. These are the actual receipt values; the camera was not changed for the audit.

The main blocker is around course distance 724–740 m, near X18654/Z720: the road/terrain reaches approximately -7 m. It blocks the line to road positions 150–350 m ahead by roughly 6–10 m. A second shoulder near X18738/Z1086 (course distance 1124 m, ground -2.62 m) blocks the longer line to the launch approach, 650 m ahead. Both are actual terrain samples, not merely visible props. The current 450–1350 m road range includes heights from -31.84 to -3.86 m.

Evidence: [full physical audit](../../output/terrain/salt-run-readonly-audit.json), [unimplemented analytic candidates](../../output/terrain/salt-run-readonly-candidates.json), [current image](../../output/gauntlet/round-16-foreground/02-salt-run.png), [target](concepts/02-salt-run.png).

## Recommended bounded correction

Bake a flagship-only, lower-only ceiling into the existing launch displacement grid. Preserve all X/Z samples, course widths, checkpoint ordering and generator selection. Suggested starting values:

- Influence from course distance **570–1280 m**; smooth entry over 570–650 m and exit over 1150–1280 m.
- Ceiling **Y=-24 m** through distance 900 m, then smoothly lift the ceiling to **Y=-14 m** by distance 1100 m. Original terrain that is already lower remains lower.
- Apply the full profile to a **95 m half-width** around the nearest course centerline, blending to zero by 210 m. This shapes the visible cross-road shoulder as well as the lane, avoiding a cut through a narrow road ribbon.
- Leave terrain at and after the established launch crest, distance **1313.76 m**, unchanged. The proposed ceiling ends 33.76 m before it. The existing 94 m descent, basin and return are retained.

A read-only analytic evaluation gives a maximum cut of **17.41 m** and an eight-metre sampled grade of approximately **0.291** over the affected region. The eye was lowered by the hypothetical change under the player rather than being held artificially high. Rays to road positions 150, 250, 350, 500 and 650 m ahead are clear in that analytic model. The longest ray has only **0.92 m** clearance, so it is a feasibility result, not a robust baked acceptance margin. The six-metre texture grid, actual camera terrain clearance, craft motion and material displacement must still be evaluated. Aim for a larger tested middle-ray margin while keeping a smooth approach and an unchanged launch rim.

A smaller cut limited to 570–900 m opens roughly 350 m of road but still leaves the 500/650 m continuation obstructed. The longer correction is the better starting point for the target composition; neither warrants a promise of kilometre-long visibility or image parity.

## Landscape framing

After the lane continuation is visible, stage an asymmetric sequence around it using the accepted geology families. Keep the close left frame, but use a broad oblique escarpment instead of letting its repeated horizontal shelves fill half the screen. Place the right accent farther off the immediate shoulder, with its broad face aligned diagonally along the valley. Two or three smaller silhouettes should recede toward the approach at distinct depths, with a clear centre opening and road edge visible between them.

A practical placement study can start around course distances 720, 880, 1060 and 1220 m, with off-road lateral magnitudes approximately 110–280 m and unequal scales. These are candidate intervals, not yet accepted coordinates. Every complete transformed footprint must clear the dense main/branch routes by the existing margin; every prop base must use the new physical terrain. Reuse or reposition existing masses to keep rendering cost bounded. Avoid adding a second symmetrical avenue of columns or placing a landmark across the distant road. This is geological framing of the playable space, not a camera tilt or a screenshot-specific wall.

## Implementation seams and acceptance

`CourseGulfField.ts` can bake this correction into its existing 417-square launch grid after the current profile, using the same R32F CPU/GPU field. The relevant coordinates already fit its bounds, so no texture, sampler or shader interface needs to be added. `RaceSimulation` and the existing terrain/road/effect adapters already consume this field; the cached checkpoint refresh remains required. Any decorative placement revision belongs in the shared authored layout rather than a capture-only branch.

All alternate routes are well separated: the earliest branch starts at distance 4693.42 m. Nevertheless, tests must preserve every branch and bridge join, all nonflagship seeds, lane widths and all heights/normals outside the bounded salt influence. The current capture corridor is approximately 67 m wide and remains unchanged in plan, so class fit should be unaffected; slope/airborne behavior still requires simulation evidence.

Required before acceptance:

1. Bake at the actual six-metre grid resolution and test physical/GLSL equality, negative-only combined bounds, zero texture borders and deterministic results. Sample whole-lane heights, cross-slopes, normal probes and eight-metre grades densely, including the profile entry/exit. Recheck the previously passing launch descent and bridge joins.
2. Test the real salt-eye lines at several approach positions, targeting a useful 500–650 m continuation without relying on a single frozen point. Inspect road visibility with the actual chase camera and moving craft.
3. Run input-only full laps for all four classes, normal and reserved boost through salt/launch; check speeds, landing behavior, collisions and resets. Run the eight-racer Cup to catch AI behavior and avoid treating a flatter road as automatic handling proof.
4. Bump the course/driving record identity because actual competitive lane heights change; old records/ghosts must stay isolated. The parent owns that version decision and final live performance/visual gauntlet.

No source, public asset, build, browser or Blender operation was performed for this proposal. The numeric hypotheses use analytic sampling rather than a new runtime field and do not establish a visual fix.
