# Blind visual review — solid effects v2, round 34

Reviewed 2026-09-08. **Overall: 6.0/10 — FAIL for final visual acceptance and original-concept parity.**

This is a fresh review of the five named runtime PNGs and the two concept PNGs listed below, followed by a separate review of six supplemental effects PNGs supplied afterward. Each image was opened individually. No prior critics, implementation reports, code, receipts, or screenshots outside these thirteen images were read. These scores describe the supplied images, not effort invested or change from an earlier version. A score of 10 means the visible result convincingly realizes the supplied target.

The Foundry is immediately recognizable. Cylindrical vessels, pipe elbows, flanges, catwalks, ladders, braces, lamps, and an overhead hoist give it a coherent industrial vocabulary. The visible foreground pickup has actual thickness and a readable mechanical silhouette. These are real strengths. The scene nevertheless looks like repeated simplified modules placed on broad sand surfaces, while the original concept presents a densely assembled, weathered industrial canyon. Solid objects alone do not close that gap.

## Initial five-image set — scores

| Criterion | Score /10 | Visible judgment |
| --- | ---: | --- |
| Pickup physical readability | 6.5 | The grey, cyan-accented ring at the lower right of `foundry-middle.png` reads as a thick mechanical token with a dark inset. It is partly cut by the frame and is the only clearly identifiable close pickup in this set. Its gameplay identity and ground relationship are less clear than its solidity. |
| Rubble physical readability | 5.5 | The pink angular cluster at middle-right in `foundry-middle.png` reads as solid rocks. Repeated purple, layered rock stacks elsewhere look like deliberately placed scenery, rather than loose broken debris. Small pale pieces in the approach image are too small to establish shape or material confidently. |
| Foundry construction | 7.0 | The principal bridge has visible diagonal braces, a catwalk, supporting columns, lamps, a cable drum and hanging hook. Flanges and base braces establish assembly. Large smooth pipe runs, broad pale structural members, and repeated tower modules still dominate the reading. |
| Scene cohesion | 5.5 | Orange metal, blue framing, violet rock, and cyan accents share a consistent palette. Detailed cliff faces, simpler industrial surfaces, clean rectangular foundation edges, isolated rock props, and large empty sand areas do not yet have a consistent level of finish or physical integration. |
| Original `06-foundry.png` parity | 4.5 | Subject and palette are recognizable, but the target's enclosing canyon, layered industrial depth, material variation, grounded rubble, stronger light hierarchy, and large foreground vehicle presence are substantially absent. |
| Supplemental construction concept parity | 6.5 | The bridge follows the target's vocabulary of pipe, truss, walkway, and hoist. It does not yet carry the target's convincing density of connectors, service runs, brackets, bolts, hanging mechanisms, weathering, and substantial grounded feet. |

## Individual image findings

1. **`foundry-middle.png` — 6.0/10.** This is the strongest evidence for solid effects. The lower-right ring visibly has a rim, sidewall, notches, a dark center and cyan inserts; it does not read as a flat sprite. The middle-right pink rock pile has clear facets and volume. However, the ring is peripheral and cropped, and the faceted pile has a much simpler surface language than the nearby layered rock stacks and distant cliffs. The large blue pipe across the upper frame is visually dominant, while the road and scenery below it remain sparse. The ROCKFALL label does not establish that any particular rock is moving.

2. **Runtime `06-foundry.png` — 6.5/10.** The best construction view. The truss, pipe, railing, lamps and overhead winch/hook are clearly distinguishable. Supporting columns have rings, brackets and base feet, giving the crossing more credibility than a bare pipe arch. The pale diagonal crossing behind the truss and other overlapping runs make the structure visually busy without the concept's clear assembly hierarchy. Broad dark platform faces and very smooth open sand weaken its grounding. No clear close pickup or identifiable active rubble event is visible.

3. **`foundry-near-span.png` — 6.2/10.** The bridge silhouette remains legible from a wider angle, with identifiable braces and a suspended hook. Foreground left and right rock stacks have mass and cast shadows, but their similar compact, tiered silhouettes look like repeated props. The huge dark foundation wall on the right ends as a clean shape in the sand. This is a readable game environment, but the foreground does not convincingly connect the industrial installation to the surrounding geology. No clear pickup is visible.

4. **`foundry-approach.png` — 5.8/10.** The vessel has useful valves, a ladder, bands, a service panel and surrounding pipes. The large right-hand cliff is a strong form. The industrial module's isolated flat plinth and the broad empty sand between it and the racer make the placement conspicuous. A few tiny pale fragments near the center-right driving line cannot support a strong claim about rubble readability. No clear pickup is visible, and this angle provides little of the original concept's dense overhead layering.

5. **`foundry-exit.png` — 5.3/10.** The continuing pipe network and vessel row preserve location identity. Large arrows provide a visible route cue. The very thin horizontal gate across the road, open orange horizon, repeated towers and sparse verge make this feel more like a modular race-course set than the original industrial canyon. The ROCKFALL label has no clearly readable falling object or impact event to accompany it in this still. No clear pickup is visible.

## Three highest-value actions

1. **Make pickups and debris readable within the driving view.** Keep the ring's thickness and inset construction, but demonstrate it fully inside the frame at useful approach distances with an unambiguous scale and shadow relationship. Give loose rubble asymmetric broken silhouettes, several size classes, fractured faces, and believable contact or airborne separation. Avoid relying on repeated upright rock stacks as the evidence for debris. Capture one unobscured mid-distance view and a brief moving sequence that shows approach, effect and aftermath.

2. **Resolve the hero span as a constructed machine.** Preserve its existing braces, railing, hoist and column feet. Give those parts a clearer size hierarchy; add convincing joints where pipe, support and truss meet, richer flange and fastener detail at the hero distance, service cables or smaller pipework, and a more substantial hoist mechanism. Use the supplemental concept's visible load-bearing relationships as the target. Remove or recompose broad crossing shapes that obscure those relationships.

3. **Unify ground integration, material finish and composition.** Break up clean plinth edges with sand accumulation, embedded rocks and irregular service clutter. Carry a consistent weathering scale across metal, rock and ground. Add selected intermediate structures to establish layered canyon depth and a focal route through it, while keeping the racing line readable. Revisit the camera/vehicle size and lighting hierarchy against the original concept; its close, substantial racer and enveloping foundry are major parts of its impact.

## Evidence limits

The initial five images are staged stills. Their HUD shows 410 KPH with a 0:00.00 timer; that display is not evidence of live motion or a completed race. This initial set cannot establish pickup collection, collision correctness, debris movement, rockfall timing, effect persistence, speed readability, animation quality, performance, or uninterrupted gameplay. Nor can it identify from pixels which rocks are static set dressing and which belong to a gameplay effect. Its one clearly visible pickup supports a narrow solidity judgment, not acceptance of every pickup type or viewing distance. No browser was used.

## Image identity — SHA256

| Image | SHA256 |
| --- | --- |
| `output/gauntlet/round-34-solid-effects-v2/foundry-middle.png` | `a1fd7644d072dd32056e4a0343d9cc291a236a7ced6488ffb80da8c442fdc186` |
| `output/gauntlet/round-34-solid-effects-v2/06-foundry.png` | `3acdab7f01267f84a441bd231e0c625f4f68b4dab070a7755d0b626766b8c383` |
| `output/gauntlet/round-34-solid-effects-v2/foundry-near-span.png` | `676a8a51ae20e073aa19af5a4ecac6bb4de5976604ebd26d4035bfbcf95b8182` |
| `output/gauntlet/round-34-solid-effects-v2/foundry-approach.png` | `344718a829a7752b8ffe192e197f4a46e1217ca520cb3da9c8dbb61cd46cdd36` |
| `output/gauntlet/round-34-solid-effects-v2/foundry-exit.png` | `3052c875350785f1e9f1c7b72977f235265cff32205ce14cef1d443d58b13a61` |
| `docs/inkstorm-overhaul/concepts/06-foundry.png` | `e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50` |
| `docs/inkstorm-overhaul/concepts/11-foundry-construction-round33.png` | `ef201350569c53d6a36a9e1c0f1db7c6c8d444c58a1dd39db5b3ab22e2c6a2d8` |

## Supplemental effects samples — separate review

These six images were supplied after the initial review and were each opened individually. The capture context supplied by the coordinating agent describes 120 fixed simulation ticks at 1/120 second per tick, one tick per animation callback, with mine/weapon and hazard events recorded at 0.25 seconds. That is supplied capture context, not independently verified here; event receipts were not read. The visible hazard timer samples are 0:00.00, 0:00.25 and 0:00.50. Sampled frames do not establish real-time playback or FPS.

| Supplemental criterion | Score /10 | Verdict |
| --- | ---: | --- |
| Pickup solidity | 7.0 | **PASS for the narrow question of a visibly solid object.** Final pickup polish and gameplay readability remain unaccepted. |
| Mine body solidity | 6.0 | **Limited evidence.** The small discs have thickness, but their low-contrast identity is weak. |
| Mine event visual readability | 4.0 | **FAIL.** The supplied event sample is too understated to communicate a distinct damaging mine reaction clearly. |
| Hazard rock volume | 7.0 | **PASS for the narrow question of solid rock masses.** Large facets clearly establish volume. |
| Hazard effect integration | 4.5 | **FAIL.** Uniform polygonal boulders, severe vehicle overlap, coarse brown fragments and pale flat-looking particles do not match the surrounding material language. |

**Combined final judgment remains 6.0/10 — FAIL.** The supplemental images strengthen the evidence that pickups and hazard rocks are volumetric; they do not close the scene-cohesion or original-concept gap.

1. **`mine-trigger-side-000.png`.** Two small grey discs below the green rival have sidewall thickness and a grounded scale. Without the supplied scenario name, they could read as loose hardware. The side camera is useful for mass and relative placement, but no active detonation is visible in this initial sample.

2. **`mine-trigger-chase-030.png`.** A grey disc below the rival, a modest orange glow, and broad pale horizontal streaks are visible. The change is not a strong visual statement of a dangerous mine firing: there is no clearly resolved burst core or legible trail of solid fragments in this sample. The camera differs from the side sample, so exact spatial change should not be inferred by directly comparing the two. The large SANDSTORM ACTIVE banner is the clearest event communication on screen, competing with the much smaller mine reaction.

3. **`hazard-chase-000.png`.** Large pink faceted rocks surround and overlap the two racers, with thin yellow ground rings. Individual rocks read as three-dimensional boulders. Their plain triangular faces and similar rounded-polyhedron construction contrast sharply with the stratified cliff and stacked stone props. The cluster already heavily obscures the rival and lower vehicle region.

4. **`hazard-chase-030.png`.** The hazard is unmistakable as a large physical obstruction: many rocks fill the foreground and intersect the vehicles' screen silhouettes. Flat-looking pale yellow pieces and thick brown block-like fragments accompany it. This communicates a collision scene, but the coarse boulder scale and overlapping forms make it difficult to read the racers and the precise contact. It looks like a pile of simplified geometric rocks rather than the original concept's irregular weathered debris.

5. **`hazard-chase-060.png`.** Most of the large boulders are outside this view; the rider and engines become readable again. Brown blocky fragments remain near the vehicle and frame edge, with conspicuous large translucent yellow square/quad-like particles over the lower left and lower right. Those planar shapes weaken the intended physical material reading. Camera and vehicle positions have changed, so this frame does not establish whether rocks disappeared, moved, or were simply left behind.

6. **`pickup-foundry-cockpit.png`.** The lower-right pickup is fully visible here. Its thick grey rim, outer tabs, dark recess, internal form and cyan inserts confirm a solid, readable mechanical token. The broad plain shading and sparse detail still resemble a simplified prop, and placement far to the right of the racer does not establish how well it reads on approach in normal play. Despite the filename, this is a behind-the-racer view; it should not be presented as a close first-person cockpit inspection. No collection is shown.

The first priority above is now more specific: preserve the proven ring and boulder volume, replace the overly uniform boulder shapes and conspicuous pale quads with a consistent authored debris treatment, vary fragment scale, and tune effect placement so the player silhouette remains readable. Give the mine reaction a distinct, short-lived focal burst with a clear source. Use a continuous normal-speed view for acceptance of timing, trajectories and persistence; these samples cannot supply that evidence.

### Supplemental image identity — SHA256

| Image | SHA256 |
| --- | --- |
| `output/gauntlet/round34-solid-effects-v2-detail/mine-trigger-side-000.png` | `2dbb3e3ae2883d059130ba920dca26c854b4488a0721d043f5688c0e40f16f92` |
| `output/gauntlet/round34-solid-effects-v2-detail/mine-trigger-chase-030.png` | `c5e4fecd6b0f22f80f53366146a5ac09996780bcdf6e95c3fc1238620d840227` |
| `output/gauntlet/round34-solid-effects-v2-detail/hazard-chase-000.png` | `91ecd934422f2ee56f08891ebc41f0998e31e033f359ef790dc652e14cd503c7` |
| `output/gauntlet/round34-solid-effects-v2-detail/hazard-chase-030.png` | `881c60a9ba4aa6920d7767c9dbaf0390df4475baeb1a88ee3ec2b8b68d3a442a` |
| `output/gauntlet/round34-solid-effects-v2-detail/hazard-chase-060.png` | `42e3dc78e4f7aa0b4820f8bfcfb4055bb2865a7362ae633b6d9f66b4786e5930` |
| `output/gauntlet/round34-solid-effects-v2-detail/pickup-foundry-cockpit.png` | `9bb1556291f3c4498c0e4b918e276fdd805e46871d45fc37cd3eec04c345f78d` |
