# Round 33 Foundry connections — blind image critique

**Verdict: prefer group C (`collectors-v3`) as the next base. None of the three groups reaches the requested 8/10 industrial-construction target.** C makes the most meaningful visible improvement to pipe terminations and grounding. B makes some joints more readable, but its added ring-like fittings do not explain where the pipes go or how they are supported. These are local improvements, not evidence of overall world parity with the concept.

Review date: 2026-09-08. This review used only the ten supplied PNGs. All ten were viewed individually and SHA-256 hashed. No source, previous reviews, implementation messages, receipts, browser, Blender, or build output was consulted. Directory names identify the groups; they are not evidence of engineering intent. Scores below are subjective judgments of the pictured result.

| Group | Supplied directory | Visible connection / termination credibility | Overall industrial construction | World parity with concept |
|---|---|---:|---:|---:|
| A | `output/gauntlet/round-33-foundry-gantry-v1` | 5/10 | 6/10 | 5.5/10 |
| B | `output/gauntlet/round-33-foundry-joints-v2` | 6/10 | 6/10 | 5.5/10 |
| C | `output/gauntlet/round-33-foundry-collectors-v3` | 7/10 | 6.5/10 | 5.5/10 |

## What the three viewpoints actually show

**`06-foundry`:** All groups share the strongest piece of construction in the set: a substantial overhead truss with diagonal members, plates, two legs, and a visible footing on the left. It reads as assembled steel at normal screenshot scale. The upper red pipe and nearby walkways add a useful second tier. However, the overlapping truss, thinner rails, diagonal pale walkway, and right-side column produce a tangled connection zone with no immediately readable hierarchy of what bears on what.

A has conspicuous black, drooping shapes beneath the right foreground pipe end and the pipe near the central-right tank. Their broad silhouettes read as unresolved plugs or hanging weights. B replaces these with more legible flanges, spokes, and rings. That is a visible shape improvement, especially at the upper right, but the lower ring still reads as an attachment hanging from an end; a clear continuation, closed pressure body, or structural role is not visible. C replaces these ambiguous ends with cylindrical receiving forms. The central-right vertical form visibly extends to the platform, and the right foreground form has a much clearer closed cylindrical silhouette. C therefore communicates an endpoint most convincingly. The large foreground collar on the right still wraps awkwardly around the bend, with several dark bands competing to describe the same junction.

**`foundry-approach`:** This is the most useful discrimination view. In A and B, the large blue diagonal span and orange horizontal span converge beside the central tank into a small dark assembly. B's extra fine hardware improves detail but leaves that assembly apparently hanging above the platform. In C, a red vertical cylinder reaches the platform below the convergence. Its top and bottom bands give it a beginning and an end, making the arrangement easier to believe at a glance. This is a real visible advantage, not credit for an unseen support system. The remaining weakness is at the top: the two large pipes appear to meet the cylinder directly, without sufficiently clear branch necks, offset collars, or separately readable receiving ports. The major right-hand tank's long downturned red pipe also still finishes as a blunt vertical end above the platform; its purpose remains visually unresolved in every group.

**`foundry-middle`:** C provides the clearest repeatable improvement: red vertical receiving cylinders on both sides connect the overhead route visually to the raised platforms. Their bottom rings make contact more readable than the small dangling fittings in A/B. This also exposes the remaining design problem. Multiple long blue pipes converge at the top of the nearest left cylinder as intersecting tubular masses. A convincing manifold/branch connection is not legible there. Farther down the street, the same tank, pale column, cream elbow, orange loop, platform, and now red vertical cylinder recur with very similar proportions. The additions strengthen individual terminations but increase the repeated-kit impression.

## Concrete remaining issues, in priority order

1. **Make the nearest collector junction explain itself.** In C's middle image, the upper-left/left-center convergence needs a visible distinction between the main body and each incoming pipe: a short nozzle or branch neck, an oriented collar, and enough spacing to see the join. More bands around an intersecting cylinder will not fix the silhouette. The approach view's blue/orange convergence needs the same treatment.
2. **Give the long spans readable support attachment.** The blue tubes cross large distances and multiple structural elements, but the screenshots do not clearly show saddles, clamps, or hangers connecting them to the supporting frame. Some spans visually touch or overlap pale columns and other tubes. A few deliberately visible attachments at the closest crossing points would communicate more than adding small hardware everywhere. This is an image-readability finding, not a structural calculation.
3. **Resolve remaining blunt ends.** The downturned pipe beside the approach view's large central-right tank stops above the platform with no obvious receiver or flange. Several distant ends are also too ambiguous to score as solved. Show an explicit cap, a destination, or a separate supported continuation where the image can reveal it.
4. **Clean up collector collars and bases.** C's large right foreground connection has stacked bands with an awkward bent side profile. At some bases, tiny tabs sit near slab edges and do not provide a clear anchor relationship. Simplify to one readable joint and one readable base assembly before adding more details.
5. **Reduce identical infrastructure rhythms.** Vary at least the nearest two machinery clusters in diameter, height, branch direction, platform layout, and support type. All three groups currently display the same broad cylindrical vocabulary and evenly spaced fittings over long smooth surfaces.
6. **Clarify the gantry's overlapping members.** The front truss is a good anchor. Its connection to the diagonal pale walkway and right support needs a cleaner, visibly resolved meeting point. Preserve its clear diagonals and substantial footing.

## Regressions and limits of the preferred group

C adds several large, nearly featureless red cylinders. They mask some of the more delicate ring/valve detail visible in B, repeat a new vertical motif, and reduce small gaps between the existing pipes and tanks. That is an acceptable trade for a more legible destination, but it does not make the new cylinders convincing finished machinery. Their flow connections are still the weak point. B retains more open space and more visible fine hardware, but hardware density alone does not outweigh C's clearer terminations.

The matched views preserve the same broad road, sky, gantry, camera composition, vehicle, and UI. I see no major new route-visibility or composition regression caused by C's additions in these stills. This observation does not establish gameplay clearance or collision behavior. The flat cyan shape at the bottom-right and outlined rock forms in every middle image remain visually distracting; they are shared issues, not regressions attributable to a connection variant.

## Pipe improvement is separate from world parity

The original concept presents a canyon filled with interdependent industrial layers: massive pipes change direction into vessels, catwalks and rails continue around varied masses, small hanging assemblies have surrounding infrastructure, and dense equipment accumulates into the distance. Surface breakup, edge wear, warm/cool accents, and atmospheric depth help distinguish machinery at several scales.

All three candidates establish an orange industrial desert, but their wide clean ground areas, broad unoccupied sky, isolated tank rows, repeated pale square columns, large smooth pipe spans, and limited intermediate machinery still make the environment feel sparse and modular compared with that concept. C does not materially change those scene-level characteristics. The fixed concept camera and candidate camera also differ; I have not treated an identical composition as a requirement, but the density, construction variety, and layered depth gap remains visible across all three candidate angles.

**Recommended decision:** retain C's visible receiving cylinders and B/C's more readable flange treatment, then resolve the closest pipe-to-cylinder joints and span supports before expanding detail. Request the same three viewpoints after those changes. An 8/10 pass requires visibly coherent nearby assemblies plus stronger variation and layering in the industrial street; simply adding more rings or repeating more collectors would not earn it.

No FPS, motion quality, gameplay, collision, route safety, or performance claims are made from these still images.

## Evidence manifest

Paths below are relative to `/Users/amir/Projects/PodRacing`. A/B/C correspond to the directory mapping above. Every listed file was viewed in full.

| Image | SHA-256 |
|---|---|
| `docs/inkstorm-overhaul/concepts/06-foundry.png` | `e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50` |
| A / `06-foundry.png` | `1885389d7cb164f98c538a0a0cabe112d24cf77b5e65ee1d3b4704c163fccef5` |
| A / `foundry-approach.png` | `c9f889d8a015a1bf52c7f29a339766c9287ffb73450875b7ff22c2587e498263` |
| A / `foundry-middle.png` | `c189e1469076906c276015b2ddccbe75e7492bcfae7eeadfb8a75fc401f007d2` |
| B / `06-foundry.png` | `898ce139edaf617bf90ac8f26fe9ab3dbf64245c310f0d8cc5bca1db8a253a56` |
| B / `foundry-approach.png` | `3f0b4a5a702c6b82dfaf21a74062f339a7631c9f23ed83d4f04019d5a6e24ac2` |
| B / `foundry-middle.png` | `1d8f22a3848e107b691cde6954028fa44b9456431aab59de4f47e9a4b54e3c74` |
| C / `06-foundry.png` | `554a38b6d762ced3ead4801f369587ba20364be91b2f0f45620ceabf4f79d098` |
| C / `foundry-approach.png` | `30f011122cd7bc4ac0458870da492babdfdced9d3437560528a110c5f14d89b1` |
| C / `foundry-middle.png` | `847be74ee64dd6cc7242764fcf516515bad8c9e42dca6ffa3edfe3bef7b49d5c` |
