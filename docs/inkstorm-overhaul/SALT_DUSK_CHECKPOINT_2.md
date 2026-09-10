# Salt Flats at Dusk — checkpoint 2

The owner rejected checkpoint 1's aesthetics and sound effects. This revision rebuilds the skyline, rock treatment, dusk lighting, vehicle presentation and SFX palette. It is an owner-reviewable progress Preview. The photographic target remains unmet, and Production promotion still awaits owner checkpoint approval.

## Visible changes

- A licensed 4K photographic cloud environment replaces the previous low-resolution sunset. The visible sun, warm directional light, cool fill, surface reflections and fog now share one direction and grade. Reflections use rough mip sampling; this is not ray tracing, screen-space reflection or global illumination.
- Six continuous, irregular distant ranges replace repeated decorative roadside towers, with three merged meshes and 58,392 triangles. Physical canyon walls, industrial supports, fork dividers and collider-associated props remain. The first oversized range pass was rejected and replaced with lower, more distant ranges.
- The prominent canyon arch and wind-blade assets were refined offline with coherent bedding and shallow eroded relief. Their original bounds, roots and passage clearances are preserved. Source-aware stone normals and tighter photographic texture scale reduce coarse facets. The arch remains assembled geology; the scene is not yet convincing enough to call photorealistic.
- The physical outer salt basin is wider and flatter. The published racing lane, shoulder and normal probes remain byte-for-byte consistent with their historical field hashes. Both renderer and physics use the same field; only outer runoff changes. The experimental full-lane fill was withdrawn after regression failures, so current driving-lane undulations remain a visible limitation.
- Ground reflections and normal detail are calmer; raised banks use earth tones. Road beacons use restrained metal shading with unchanged positions/colliders. Legacy painted shadow stamps were removed; actual terrain/mesh and moving racer shadow maps remain.
- The inspectable pod now floats above a real salt receiving surface with its own contact shadow. The surface fades at the canvas edges without clipping pod pixels. All four pods and portrait layout were captured. Smaller HUD readouts, fewer persistent labels, quieter weapon effects and softer continuous exhaust replace heavier graphic treatments.

## Sound replacement

Eight existing licensed effects replace the rejected 26-file SFX bank. One stable player engine bed and at most two quiet nearby rivals replace the busy layered propulsion mix. Boost, laser/shield, heavy metal impacts and explosions use existing catalogue sounds; constant wind, warning bleeps and reward jingles are removed. No new audio was synthesized or generated.

Sources include qubodup, Little Robot Sound Factory, dklon, 7of9Designs, Michel Baradari and Kenney. Existing conventional sound design is not represented as raw physical recording. The same Scott Buckley music excerpt remains. The original “Now this is podracing” clip is byte-identical. [Selections, modifications and listening limitations](SALT_DUSK_AUDIO_V2.md) · [Publication inventory](../../assets/source/audio-salt-dusk-v2/PUBLICATION.md).

## Validation and independent review

TypeScript, build, diff checks and **983 tests across 169 files pass**. New checks cover basin runoff, preserved racing profiles, retained collision geometry, closed terrain-seated range geometry, refined asset bounds/clearance, preview stage isolation/disposal and the smaller audio bank.

The final diagnostic gallery has no browser errors and covers all course sections, four pods and portrait setup. It uses staged course positions and is not a native-play or performance measurement. A separate ordinary eight-racer Battle completed in **93.000 seconds** through standard virtual-gamepad input. Recovery correctly prevented a personal best. Its unfiltered combat-state screenshots are included separately. All owned browsers and local servers closed.

The exact final bundle completed a separate native eight-pod Battle at **59.919 FPS mean, 16.7 ms p95, 16.8 ms p99**, across 5,767 racing RAF samples / 96.246 seconds. The maximum was **66.6 ms**, including one frame over 50 ms; no slow frames were filtered out. Device: **Apple M4, Chrome 153, 1440×900 CSS, requested DPR 2, adaptive actual DPR 1–2**. The player finished in 86.025 seconds with recovery; post-player classification time remains in the measurement. All eight SFX and the music excerpt loaded with no failures. Weapon, mine, shield, EMP, repair, takedown and recovery events were observed. [Native cadence/asset receipt](evidence/salt-dusk-checkpoint2/native-battle-summary.json). These are browser RAF intervals, not GPU execution or physical display timings, and do not establish performance on other devices.

Fresh blind visual review: **6/10 aesthetics, 4/10 concept match**. Appropriate as a progress Preview, not final target acceptance. Main remaining defects are dune-like racing terrain, simplified mesa forms, uneven sky/world realism and insufficient cinematic racing atmosphere. [Verbatim critique and native-play addendum](evidence/salt-dusk-checkpoint2/BLIND_CRITIC.md). The earlier combined pass scored 4/10 aesthetics and 2/10 reference match; its oversized dark mountains were withdrawn. Scores come from independent agents and are not owner approval.

Audio hashes, decoding, bounded voices and source attribution are verified. These checks do not establish that the owner likes the sounds. Listening in the Preview remains necessary.

## Remaining work, in priority order

1. Author the actual racing terrain as a coherent salt flat with deliberate dry racing lanes and shallow brine patches. Changing the published lane needs a new course/record revision and complete handling validation; the current wider outer basin alone does not achieve the concept.
2. Replace the remaining crude mesas and stacked cliff silhouettes with convincing erosion, sediment layers, connected talus and grounded industrial transitions. Avoid repeating a single rock texture across every scale.
3. Improve in-motion dust, exhaust and atmospheric separation around the pack, verified during normal play. Keep transient visual energy readable without returning to large neon cones or cluttered overlays.
4. Obtain listening feedback on the new engine/boost/combat palette, tune the mix, then source more human-composed music if this track still feels wrong. Never generate audio; preserve the original voice.
5. Reduce upload/memory cost and test Windows/integrated-GPU/mobile hardware. The 4K half-float sky with mipmaps costs approximately 85 MiB GPU memory, in addition to PBR maps and the rest of the scene. Local M4 frame rate is not a universal-device guarantee.
6. Continue the broader vehicle, driver, physics, course-flow and replayability backlog. Four of 26 preserved vehicle families remain registered. This checkpoint adds no new vehicles, weapons or game modes and does not complete the original eight-item overhaul.

## Sources and evidence

[Poly Haven sky receipt](../../assets/source/salt-dusk-v2/sky/SOURCE.json) · [Current scenery revision](../../assets/source/salt-dusk/scenery-v2/PUBLICATION_REVISION.md) · [Refined stone source and validation](../../assets/source/salt-dusk/stone-refinement-v1/HANDOFF.md) · [Exact build/asset freeze](evidence/salt-dusk-checkpoint2/build-freeze.json) · [Validation log](evidence/salt-dusk-checkpoint2/validation.txt).

Actual game captures: [menu](evidence/salt-dusk-checkpoint2/00-menu.png), [portrait](evidence/salt-dusk-checkpoint2/00-portrait.png), [salt basin](evidence/salt-dusk-checkpoint2/02b-salt-basin.png), [canyon](evidence/salt-dusk-checkpoint2/03-canyon.png), [foundry](evidence/salt-dusk-checkpoint2/06-foundry.png). They are game renders, not generated previews. Raw local evidence is under `output/salt-dusk/rebuild2/`; earlier failed passes and withdrawn experiments are preserved there.

[Play the READY Preview](https://now-this-is-podracing-hqdpkcr4o-amirs-projects-d9680079.vercel.app). Deployment `dpl_AtuCyBwx4R9DxhbezjhbdkikpiFc`, runtime commit `9f10c38cfd6163b2437e6af83aeb17e817fa678f`. Hosted browser verification loaded the exact tested bundle and passed all seven interaction checks with no errors; browser closed. [Publication / unchanged Production receipt](evidence/salt-dusk-checkpoint2/publication.json) · [Hosted checks](evidence/salt-dusk-checkpoint2/deployed-receipt.json). The Preview may require the owner’s Vercel sign-in. Production remains V36 until owner checkpoint approval; no promotion was performed. This subsequent documentation commit changes no runtime assets or code.
