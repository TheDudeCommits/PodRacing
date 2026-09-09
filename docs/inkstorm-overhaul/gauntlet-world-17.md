# Round 17 — independent image-only world critique

**Verdict: FAIL. World composition: 5.5/10. Visual finish: 4.7/10.**

PASS requires **both** critical categories to reach at least 8/10. Neither does. The actual screenshots establish a coherent stylized desert racer with recognizable landmarks, a legible vehicle silhouette, and an authored interface. They do not yet deliver spectacle close to the supplied target artwork. This is a substantial art-direction and environment-staging gap, rather than a final polish gap.

## Scope and scoring

I directly inspected all seven target PNGs in `docs/inkstorm-overhaul/concepts/` and their corresponding actual PNGs in `output/gauntlet/round-17/`, plus the actual `garage.png` and `live-drive.png`. I did not read code, implementation reports, receipts, previous-round images, or previous scores. No browser was used.

The concepts are **generated target artwork**, not evidence of game rendering. The round-17 images are the **actual screenshots under review**. Their aspect ratios differ; the judgment concerns visible scene hierarchy, spatial depth, landmark readability, material treatment, lighting, and presentation, not pixel matching. A stylized runtime can pass without copying every painted detail, but it must achieve comparably convincing composition and finish.

“Visual finish” below means the finish of the rendered art, not the seventh course section. Section scores assess the actual image against its corresponding target. The overall critical scores synthesize the seven course comparisons; garage quality does not compensate for world deficiencies.

| Section | Composition | Visual finish | Directly visible comparison |
|---|---:|---:|---|
| 01 — Grid | 6.0/10 | 4.8/10 | The actual overhead gantry, side hangars, and blue/orange craft clearly communicate the starting area. The target builds a inhabited pit street through hanging fabric, clutter, several layers of buildings, textured mesas, and a long populated vanishing point. The actual is dominated by one large clean gantry and a mostly empty road. Its little roadside objects do not provide comparable density or scale. |
| 02 — Salt run | 4.5/10 | 4.5/10 | The actual road is readable, but the target's sweeping canyon corridor, angled rock fins, and successive distant landforms become a broad sky and sand field with a few isolated masses. The actual factory and rocks sit as separate silhouettes with little connecting terrain. Repeated poles and small brown objects cannot supply the missing landscape hierarchy. |
| 03 — Canyon | 6.5/10 | 5.0/10 | The actual arch is the strongest natural enclosure in the set, and the dark framing around a bright opening works. The target also reveals a winding sunlit route, layered towers, rubble aprons, and opponents beyond the arch. The actual opening reveals much less depth; large crumpled rock facets and broad dark slabs dominate. The sand and cliff contact feels comparatively abrupt. |
| 04 — Fork | 4.5/10 | 4.5/10 | The target makes two distinct roads immediately legible around a massive central rock, with a low left route and a rising right route. The actual screenshot is dominated by one hump-shaped elevated roadway, a narrow tall rock behind it, and turn signs. A paired route choice around the landmark is not legible in this view. It reads as a bridge or ramp scene rather than the promised dramatic fork. |
| 05 — Launch | 5.0/10 | 4.2/10 | The actual provides a descent and a prominent factory silhouette. The target reveals a whole canyon basin, overlapping shelves, numerous intervening towers, dust, and an industrial settlement embedded in the landscape. The actual is sparse and shallow by comparison, with widely separated rock clusters and a factory visibly standing on thin supports. Some rock clusters appear visually detached from the broad sand plane; the screenshot alone cannot establish whether that is a geometry error. |
| 06 — Foundry | 6.5/10 | 5.2/10 | The actual tank corridor, pipes, rails, cyan accents, and overhead structure make this a distinct industrial section. It is one of the closer thematic translations. The target's interlocking pipe network, layered crossings, service structures, weathering, warm practical lights, and strong dark-to-light corridor are replaced by large smooth tanks, repeated bands, simple pipe mouths, and a short hill ahead. The visible open pipe ends and sparse connections weaken the sense of a functioning place. |
| 07 — Finish | 5.2/10 | 4.7/10 | Actual signs and rails clearly mark a bend. The target makes the banked cliff road, substantial barrier, exposed drop, tall rock framing, and distant gantry part of a single dramatic composition. The actual view is a broad sandy turn with separated rail modules and little visible drop or banking. There is no comparably legible final landmark in this frame. This is not a claim that no finish structure exists elsewhere. |

## Critical category assessment

### World composition — 5.5/10

The course has recognizable identities: pit lane, open desert, rock arch, ramp, overlook, industrial corridor, and marked turn. The camera keeps the craft recognizable and usually leaves the immediate road unobstructed. The canyon arch and foundry corridor show that stronger framing is achievable within the actual visual style.

The recurring problem is the absence of a convincing middle distance. The targets continuously connect foreground shoulders, intermediate ledges and structures, and distant silhouettes. Several actual images instead show the craft, an empty road, a few separated large objects, and a broad sky. The salt run and launch reveal this most clearly. The environments look arranged around a route rather than eroded or built into a continuous place.

Landmark presence alone is insufficient. The fork needs two unmistakable route silhouettes. The launch needs a basin reveal with a visible depth progression. The final bend needs substantial banking, a readable edge and drop, and a destination. These compositional functions are weak or absent in the submitted frames despite related objects being visible.

### Visual finish — 4.7/10

The blue/cyan craft against warm desert colors is effective. The craft has modeled panels, recognizable turbine faces, attached cables, a visible pilot, and a controlled silhouette. The sky contributes a pleasant warm atmosphere. HUD typography and color accents are consistent with the garage.

The targets achieve their finish through material variation, light, and scale-specific detail. The actual uses broad smooth color fields, visibly coarse rock facets, sparse panel information, and very similar surface treatment across objects. Rocks lack convincing layered strata and erosion; industrial structures have large clean surfaces; the ground has a fine repeated texture but little larger-scale track wear, broken crust, rubble, or local color variation. The result feels materially thin even where geometry is abundant.

Lighting is also substantially flatter. There are visible cast shadows, but limited local grounding and little persuasive separation between sunlit orange faces, cool shaded recesses, and atmospheric distance. The vehicle's cyan energy line is thin and graphic compared with the target's luminous electrical event. Edge speed streaks do not replace the target's integration of dust, ground motion cues, shadows, and lighting. Those are visual observations only; motion behavior was not tested.

## Additional actual screenshots

- **Garage — presentation 7.5/10; vehicle showcase finish 6.0/10.** The cream condensed typography, navy background, orange selected state and start button, vehicle thumbnails, and clear main craft panel form a coherent interface. This is the most finished overall presentation in the supplied actual set. The hero vehicle still has broad simple surfaces and a largely empty backdrop. The challenge list visibly cuts through a lower item without a strong visible scrolling cue, and the lower control area is dense with small text. These are still-image observations, not verified interaction defects.
- **Live drive — composition 4.5/10; visual finish 4.5/10.** This frame reinforces the salt-run issues: a large smooth sand field, few disconnected landmarks, broad sky, and little intervening scenery. The craft remains legible, but its hard shadow and relatively simple surfaces do not approach the target material richness. The displayed `0:07.20` time and `483 KPH` are UI values visible in one image, not proof of motion quality or speed behavior.

## Concrete priorities, in order

1. **Recompose the fork and launch before adding small detail.** At the fork, show both routes on either side of a dominant central rock in one normal driving frame; give each a distinct elevation and continuous visible road edge. At the launch, place successive foreground shelves, intermediate towers, a lower route, and the distant settlement into a coherent basin reveal. A few more isolated props will not resolve either issue.
2. **Build continuous terrain between the large landmarks.** Replace empty sand around disconnected rock masses with connected ledges, slopes, erosion channels, rock-foot rubble and smaller silhouettes. In the open run, create a deliberate foreground/middle-distance/background rhythm and a sweeping route that recedes through it. Ground the factory into cliffs or an industrial foundation with visibly convincing contact.
3. **Give each section a stronger spatial signature.** Densify the pit street at human scale with hangar interiors, service equipment, fabric and overhead layers. Give the foundry several connected pipe crossings and service structures at different depths. Make the final corner a substantial banked cliff road with a clearly staged finish landmark. Preserve an unobstructed drive corridor while doing this.
4. **Replace generic rock noise with designed geology.** Use broad stratified planes, broken shelves, directional erosion and different rock families at different scales. The current crumpled clumps and narrow columns recur too visibly and do not reproduce the targets' sandstone character.
5. **Add material information at useful viewing scales.** Industrial surfaces need panel seams, fasteners, wear around edges and joints, grime near outlets, and richer roughness/color variation. Sand needs broad tire paths, scuffs, directional streaks and rough shoulders rather than only fine repeated texture. The craft needs deeper mechanical recesses, more convincing wear, and stronger differentiation between painted armor, metal, rubber and energized elements.
6. **Use light to organize depth and grounding.** Establish darker local occlusion at rock feet, supports, tank connections and cockpit recesses; strengthen warm lit faces against cool shaded planes; introduce believable distance falloff. Use a few purposeful foundry lights and stronger turbine/energy luminance as focal accents without washing out their geometry.
7. **Reassess the gameplay framing and HUD against the composed world.** The actual aspect ratio differs from the targets, but several actual frames still allocate too much space to empty sky and foreground sand. Reduce that emptiness by camera staging and terrain design. Hazard labels should not substitute for visible environmental events. Confirm the garage's clipped challenge list has an obvious navigation affordance in the interactive version.

## Limits of this verdict

This review assesses only the submitted still images. It does not prove or disprove FPS, frame pacing, playability, handling, collision quality, opponent behavior, successful route choice, hazard timing, camera stability, animation, audio, multiplayer, or production readiness. A still cannot establish whether an apparent grounding issue persists from other viewpoints. No functionality or performance score is awarded.

The visual gate remains **FAIL** until new actual imagery reaches at least **8/10 for both world composition and visual finish**. The current set is a coherent foundation, but it is not visually close enough to the target artwork to pass that gate.
