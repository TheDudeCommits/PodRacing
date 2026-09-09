# Independent image review — round 27 current

Reviewed only the supplied target images and candidate images through the image viewer. No source, previous critics, plans, implementation claims, browser session, or live renderer was inspected. Scores concern visible art quality relative to the supplied targets; 8/10 is the acceptance threshold. A preference between candidates does not establish acceptance or technical correctness.

| Area | Candidate A | Candidate B | Recommendation | Meets 8/10? |
| --- | --- | --- | --- | --- |
| Launch world and cliffs | 5.0/10 | 5.5/10 | Retain B as a modest improvement | No |
| Engine nozzle / exhaust appearance | 5.0/10 | 5.5/10 | Retain B's more legible nozzle structure | No |
| Driver source-render appearance | 6.5/10 | 6.0/10 | Retain A overall; revert B as a complete material result | No |

## World and cliffs

Target: `concepts/05-launch.png`, with `concepts/03-canyon.png` also establishing the rock, light, and environmental detail standard. Compared A in `output/gauntlet/round27-shadow-nozzle-v2/{05-launch,launch-crest}.png` with B in `output/gauntlet/round27-cliff-normal/{05-launch,launch-crest}.png`.

B is the better of these two world treatments, but the difference is small at the scale of the whole frame. On the large left mesa and the rock beneath the settlement, B has more abrupt changes between illuminated and shaded faces. The upper edges and vertical cuts feel somewhat more angular. A has a more continuous rounded shading roll around the tops and down the broad columns, making these masses look softer. B's improvement is most apparent in `launch-crest.png`.

The scene has a coherent orange/purple palette, a readable route, and a recognizable industrial landmark. Those are useful foundations. They do not produce the depth, natural rock construction, or density of the target.

Image-visible gaps:

- The dominant cliffs remain tall, broad, nearly continuous walls with scalloped tops and elongated vertical folds. Fine cracks sit on these large forms without producing the target's many broken ledges, undercuts, stacked strata, and distinct secondary masses. The small craggy rocks and the smooth main mesas also look like different levels of surface treatment.
- The launch view offers a few large close masses and an almost continuous distant ridge. The target has many alternating near, middle, and far spires and terraces, with progressively lighter distant layers. Neither candidate gives a comparable vista or sense of vast scale.
- The ground occupies a very large area with a largely uniform orange surface. Repeated posts and isolated small rocks supply most of the variation. The target's branching terrain, rubble skirts, rocky shelves, dust pockets, and richly shaped route edges are missing or much weaker.
- The settlement reads as sparse, clean horizontal bars, tanks, and towers arranged on top of one cliff. It lacks the target's layered occupied structures embedded among several rock levels. Its exposed straight pieces are conspicuous against the simpler terrain.
- The sky has attractive color but broad, relatively soft cloud streaks. The target's sharply structured clouds and much stronger separation of sunlit rock, shadowed rock, and atmospheric distance are absent.
- The canyon screenshots have stronger crag detail than the launch mesas, but the large purple rock areas remain close in value. The target separates richly layered shadow rock from a compelling sunlit route through the arch; the candidate opening is largely a bright sky cutout above a crest.

**Decision:** retain world B, with moderate confidence in the small A/B preference. Neither is close enough to accept at 8/10. The remaining gap is primarily large landform composition, environmental layering, and material/light hierarchy. Additional fine surface variation alone would not close it.

## Engine nozzles and exhaust

Target: the luminous engine exits in `concepts/03-canyon.png` and `concepts/05-launch.png`. Compared A in `output/gauntlet/round27-nozzle-v1/03-canyon.png` with B in `output/gauntlet/round27-cliff-normal/03-canyon.png`; also checked B in `launch-descent.png` and the supplied launch frames.

B preserves clearer radial pieces and a more readable recessed opening. A's white/cyan center is brighter, but the blurred luminous circle and bright ring flatten more of the internal structure. B looks more like an assembled physical nozzle, and its visible internal structure survives both the shaded canyon and the bright descent scene. That is the basis for retaining it.

Image-visible gaps:

- B is dim and small in visual impact. Its cyan center and radial surround read more like a lit fan or decorative turbine than a forceful engine exit. The target combines an intensely luminous center, layered metal rings, controlled cyan bloom, and directional energy extending beyond the nozzle.
- Neither supplied candidate shows a convincing visible exhaust jet or equivalent directional energy effect. There is very little luminous extension behind the exit and little visible light affecting neighboring surfaces.
- The heavy dark rim around the small bright disk dominates B in the canyon. The target has a more varied sequence of metal and luminous surfaces, with bright internal depth rather than one dark ring framing a little cyan pattern.
- The candidate's inter-engine energy connection is a very thin, short zigzag in these views. The target gives the energy system a much stronger presence through branching strands and glow. This is adjacent to, but distinct from, the nozzle issue.

**Decision:** retain nozzle B's more legible structure, but do not treat this as exhaust acceptance. A supplies more brightness; B supplies more physical readability. An accepted result needs both, with controlled directional energy. These stills cannot establish animation, flicker, boost behavior, or temporal stability.

## Driver

Target: `concepts/vehicles/pilot-material-guide.png`. Compared all three supplied `teemto-pilot-{side,front-quarter,full}` renders for A in `processed/pilot-v4/review/` and B in `processed/pilot-v4b/review/`, under the supplied vehicle source directory.

The pilot is recognizable and seated coherently at the controls in both candidates. The helmet/visor contrast, orange accent, harness, zipper, gloves, and cockpit relationship establish the intended character. The side and front-quarter views are the useful evidence. The full-vehicle views make the driver too small to establish close material quality and are not evidence that these differences will read in gameplay.

B improves the neck transition: the short dark neck section separates helmet from collar more clearly. A has a taller, blockier gray collar area that makes this transition look stiff. B also reduces some of the coarse texture visible on the torso and far forearm.

However, B's material result overall moves farther from the target. Its smoother shoulder, torso, forearm, cuff, and glove read like molded rubber or a toy figure. A retains more cloth surface variation and wear, although its pronounced diagonal/grid texture is too coarse in places. The target has fine fabric grain, convincing tailored panels, layered seams, restrained scuffing, and distinct glove and harness materials. Neither candidate reproduces that hierarchy.

Image-visible gaps:

- Large sleeve and torso areas in B are almost unmodulated gray. The far forearm especially reads as a smooth bent tube. The target's material response and seams explain cloth construction across these surfaces.
- The near sleeve has angular panel and elbow transitions in both candidates. B's smooth shading does not fully resolve the segmented or patched appearance along that arm.
- Gloves and fingers remain smooth and tube-like, with much less knuckle, seam, and wear definition than the guide. Broad cuff rings further emphasize a molded assembly.
- Harness straps and buckles are readable but simple, with weak differentiation between woven strap, painted/metal buckle, and suit. Helmet wear is also much subtler and less specific than in the target.
- A's coarse repeated fabric pattern is not itself a successful replacement for the target's finer cloth. Keeping A is a relative choice, not approval of its present texture scale.

**Decision:** retain A overall and revert B as a complete driver material result. B's neck separation is worth preserving if it can be retained independently, but the loss of textile character outweighs that local improvement in the supplied images. Neither source-render candidate reaches 8/10. No claim is made about the driver in the game: these are source renders, and the gameplay frames supplied here do not expose the pilot sufficiently to verify the result.

## Acceptance

No evaluated area reaches the requested target-quality threshold. The world and nozzle B candidates are reasonable incremental retains. The driver B candidate is a mixed change with an overall material regression. These decisions are based on visible results only and do not establish successful integration, performance, gameplay quality, or production readiness.
