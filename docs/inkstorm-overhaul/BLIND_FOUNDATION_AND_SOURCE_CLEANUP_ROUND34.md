# Blind visual review — foundation/material and source cleanup, round 34

Review date: 2026-09-08. Evidence: the 14 images listed and hashed below, each opened individually. This is a fresh visual review. No prior critics, code, implementation reports, source geometry, receipts, or test results were read. Only an image filename inventory, local image viewing, hashing, and this new report were used. No browser, Blender, build, or test was run.

**A: Foundry foundation/material trial — 6.5/10, FAIL against a strict 8/10 gate.** The industrial setting and bridge construction are legible, but the ground junctions, material hierarchy, and scene density remain below the supplied concepts.

**B: Narrow source shading cleanup — 8.5/10, PASS against a strict 8/10 gate.** The supplied before/after driver view shows convincing visible cleanup without an obvious loss of its deliberate openings or silhouette. **Driver/control fit — 3/10, FAIL.** This narrow cleanup pass does not accept the craft as final art or as a runtime asset.

## A. Foundry foundation and material trial

The score gate is strict: a requested visual criterion passes only at 8/10 or higher. The overall result is an editorial judgment, not a measured quality metric or an average that can hide a failed criterion.

| Criterion | Score | Gate | Visual finding |
| --- | ---: | --- | --- |
| Foundation and ground integration | 6.5/10 | FAIL | Footings, platforms, and banks provide understandable support, but long dark retaining slabs meet broad smooth sand with hard, clean boundaries. The terrain does not consistently accumulate rubble, dust, or erosion around these contacts. |
| Material scale and cohesion | 6/10 | FAIL | Orange pipework, dark blue structural bands, and pale secondary pipes form a coherent palette. Small scattered wear marks sit on otherwise broad, subdued surfaces; nearby canyon rock carries much stronger relief and frequency. The ground, faceted loose rocks, and industrial surfaces do not yet share a convincing level of finish. |
| Foundry construction | 7.5/10 | FAIL | Trusses, railing, collars, foot braces, lights, ladders, and a hanging hoist establish recognizable construction. Long uninterrupted pipe spans, repeated vessel assemblies, and comparatively simple connections still read as a reusable kit. The supplemental reference has a more complete relationship between bolts, joints, supports, cables, and maintenance access. |
| Original Foundry concept parity | 5.5/10 | FAIL | The orange industrial canyon, overhead crossings, and blue accents carry across. The original's dense layered process plant, irregular rubble shoulders, painted metal contrast, deep perspective, and large foreground craft presence are substantially reduced. This is a recognizable interpretation, not close visual parity. |
| Overall trial | 6.5/10 | FAIL | The construction is the strongest element. Ground contact and material hierarchy are the principal quality limits. |

### Individual image observations

1. **A01 — `06-foundry.png`:** The main overhead structure has visible cross braces, rails, piping, small lights, and a hoist. The left foreground support has a readable flared steel foot and stacked base. Its clean exposed plinth and the high wall on the right look placed into the sandy basin rather than weathered into it. Broad pale cross members and large smooth orange surfaces make the construction feel less intricate than the references. The lane remains easy to distinguish.
2. **A02 — `foundry-near-span.png`:** This angle exposes the long right retaining wall and its meeting with the dune. The bank covers some support bottoms, which helps the sense of burial, but the wall is still an extended flat face with a sharply drawn upper edge. Isolated rock props are visibly separate objects with little surrounding debris. The bridge's overall structure reads better than its ground junctions.
3. **A03 — `foundry-approach.png`:** The center vessel platform reads as a discrete dark slab. Sand rolls around it, but the face and edge have little deposited material or small breakup. The right canyon cliff has rich ridges and sharp facets while the process equipment has broad soft shading, making the difference in material resolution especially apparent. The vessel's rails, control box, collars, and ladder supply useful scale cues.
4. **A04 — `foundry-middle.png`:** Rows of orange vessels and repeated white stacks create a clear corridor. The large dark blue pipes dominate several horizontal bands with little intermediate support or surface variation visible from this angle. The angular rock pile on the right uses a noticeably simpler shape language than the textured canyon and the smaller ridged rock props. Elevated platforms still terminate in large dark vertical faces beside smooth sand.
5. **A05 — `foundry-exit.png`:** The corridor continues coherently and route arrows are clear. Large smooth sand humps conceal many ground contacts, so this view provides weaker evidence of foundation quality. Repeated vessels, stacks, and long pipes remain prominent. The scene has much more open sky and less layered industrial depth than the original Foundry reference.
6. **A06 — `01-grid.png`:** The start gantry has clear bracing and broad column footings. The left wall is a large, nearly uninterrupted rectangular surface with sparse marks, contrasting strongly with the canyon behind it. Sand partially wraps the bases, but the hard slab geometry and clean junctions remain conspicuous. This supports the same material/ground integration concerns outside the Foundry.
7. **A07 — original concept `06-foundry.png`:** The target relies on irregular rocky shoulders that merge with industrial bases, many overlapping process layers, strongly chipped orange and dark painted metal, bright cyan accents, and a deep central route. The craft occupies much more of the foreground. Those are perceptual differences visible in the images; this review does not prescribe copying every depicted object or changing the gameplay camera without a separate decision.
8. **A08 — supplemental `11-foundry-construction-round33.png`:** The reference makes load transfer and maintenance access conspicuous through broad concrete feet, gussets, bolted flanges, ladders, rails, suspended cables, hoists, and accumulated ground debris. The trial includes several corresponding construction cues, but their material contrast and joint detail are much quieter and the terrain transition is substantially cleaner.

### Top three actions for A

1. **Finish the actual ground contacts.** Concentrate on the right retaining wall in A02, the center platform in A03, and the left wall/gantry bases in A06. Add authored banks, scattered rubble, local dust deposition, and restrained edge damage with a coherent scale. Break long exposed wall faces into believable construction sections and avoid uniformly clean lower edges.
2. **Establish a shared material scale.** Give the large metal forms readable medium-sized paint wear, panel/joint variation, dust gradients, and edge highlights that survive the race camera. Bring loose rocks and ground treatment into agreement with the canyon. Extra tiny uniform speckles alone will not resolve the mismatch.
3. **Strengthen the Foundry's structural and spatial hierarchy.** Finish the most visible bridge connections and pipe supports, then vary a few process assemblies and rocky shoulders to create layered depth and a stronger focal sequence. Preserve the readable route while moving the visual richness closer to A07/A08; simply repeating more identical vessels will not close that gap.

## B. Source cleanup trial

This set is a source cleanup comparison. Its neutral presentation and block construction are not assessed as final runtime styling. The cleanup gate is limited to visible artifact reduction and preservation of the supplied source forms; driver fit is reported separately.

| Criterion | Score | Gate | Visual finding |
| --- | ---: | --- | --- |
| Visible overlapping-face/shading artifact reduction | 9/10 | PASS | In the directly comparable driver views, the harsh striping under the torso, irregular triangular visor shading, dark end wedge, and broken arm/hand shading are greatly reduced. The cleaned forms shade consistently at their visible polygon scale. |
| Preserved visible source openings | 8.5/10 | PASS | The C-shaped hands, top helmet opening, cockpit opening, rectangular opening beneath the torso, fan apertures, and crossbar holes remain visibly open where shown. These images cannot prove every source opening is preserved. |
| Preserved source silhouette and arrangement | 9/10 | PASS | The matched fullcraft views retain the long paired struts, engine spacing, brick/stud profile, cockpit side panels, rear wedges, and driver placement. Some previously dark faces become illuminated without an obvious corresponding change in the outer profile. |
| Narrow cleanup acceptance | 8.5/10 | PASS | Accept the visible cleanup result within these supplied views. This is not a topology, all-angle, or temporal artifact certificate. |
| Driver/control fit | 3/10 | FAIL | The two upright black posts are clearly in front of and separated from the open hands in the close view. The hands do not visibly wrap the posts. Cleanup makes the shapes easier to read but does not establish a functional grip. |
| Final asset style/runtime acceptance | Not scored | NOT ACCEPTED | No styled runtime version of this craft, motion, gameplay camera comparison, or final material target was supplied for this trial. A source cleanup pass supplies none of that missing evidence. |

### Individual image observations

1. **B01 — source driver:** The underside of the torso/leg area has strong black-and-white striping, and the visor and arms contain harsh triangular/dark patches. The top helmet hole and open C-shaped hands are visible despite that shading. Both hands appear separate from the tall control posts.
2. **B02 — cleaned driver:** The striped area becomes a clearly shaded rectangular structure with its opening retained. The visor, top ring, arms, and hands read as coherent faceted surfaces. The hand openings remain open, and the helmet's top aperture remains visible. The arm/hand positions still do not form a visible grip around either post.
3. **B03 — cleaned rear:** The paired engine bodies, connecting frame, open cockpit, studded walls, driver, and rear wedges remain legible. The visible left engine end has a dark circular opening. No obvious broad striping is visible at this image scale. No matching original rear view was supplied in the review set, so this angle alone cannot establish before/after preservation.
4. **B04 — cleaned front:** Both fan openings, radial blades, wide connecting crossbar, and central open frame are clearly visible. The vehicle remains symmetrical in its main arrangement. The driver is positioned behind the posts, but this small view cannot establish exact hand contact. No matching original front view was supplied in the review set.
5. **B05 — cleaned fullcraft:** The overall profile remains the same long, narrow framed craft. Fan apertures and crossbar holes remain visible. The driver's shading is less broken and the rear wedge faces shade more consistently than in B06. The large inner black side panel retains soft uneven shading, but this still does not demonstrate an overlapping-face defect.
6. **B06 — original fullcraft:** The proportions and main outlines match B05 by visual comparison. Dark patches on the driver and some rear wedge faces are more conspicuous here. This matching view supports preservation of the overall form; its driver is too small to replace the close-view evidence.

### Top three actions for B

1. **Retain the cleanup as a separately reviewable source result.** Preserve the visible apertures and silhouette; do not fill the hands, helmet opening, fan apertures, or lower rectangular opening to simplify shading.
2. **Resolve driver/control contact as a distinct fit task.** A close front and side view should show each hand opening wrapping its intended control with readable contact and plausible arm reach. The current two upright posts and hovering hands fail that visual requirement.
3. **Review the final asset separately in its intended materials and runtime framing.** Include close cockpit and whole-craft views plus motion evidence. Use those to judge final style, control fit during animation, and any remaining view-dependent shading defects; this neutral cleanup evidence cannot carry that acceptance.

## Evidence limits

- These are static image observations, not a temporal, geometry, topology, collision, physical-scale, or playability audit. Apparent shading artifacts cannot be assigned a proven implementation cause from the screenshots.
- The supplied current Foundry images were viewed individually. The local viewer displayed the 2160×1350 game images at approximately 1996×1248; concepts and 1280×960 source renders were individually inspected at their displayed/native detail. Tiny pixel-level defects may not be apparent.
- No earlier runtime trial was supplied or read. Statements about A describe current quality against its references, not verified improvement over a previous round.
- B has directly comparable source/cleanup driver and fullcraft images. Front and rear cleanup images have no matched originals within this 14-image set. Preservation is accepted only for visible features supported by that set.
- Hashes identify the bytes reviewed, not provenance, license, deploy state, or runtime equivalence.
- No FPS, timing, performance, browser health, deployed-state, or release-readiness claim is made. No browser was opened, so there was no browser session to close.

## SHA-256 evidence manifest

Paths are relative to `/Users/amir/Projects/PodRacing`.

| ID | Image | SHA-256 |
| --- | --- | --- |
| A01 | `output/gauntlet/round-34-foundation-material-v1/06-foundry.png` | `fed7937f2cebbb1ca57be792f5b00aca671017abab0c4df53564229ae945ca41` |
| A02 | `output/gauntlet/round-34-foundation-material-v1/foundry-near-span.png` | `43b84c9cd2c490aa2ae3455b6639af35110bb83bb8ee9243f05e78d8abc9af05` |
| A03 | `output/gauntlet/round-34-foundation-material-v1/foundry-approach.png` | `651129b15be04302d0fd29ed2275ea221548e10782395845cb066d42e122af61` |
| A04 | `output/gauntlet/round-34-foundation-material-v1/foundry-middle.png` | `c7fb7c38b34a3b727615f1f2a1898447f15fd3543d3b5da0334ca55f20fc8673` |
| A05 | `output/gauntlet/round-34-foundation-material-v1/foundry-exit.png` | `938ee63b3b0a1e586a620cbf07cf217835f6ea035156c32a64e03444021dcc89` |
| A06 | `output/gauntlet/round-34-foundation-material-v1/01-grid.png` | `a027ed8192fac20cf40a89dfd0bd9b1dd87466d4b478ed30d5c6c29ed3b55f97` |
| A07 | `docs/inkstorm-overhaul/concepts/06-foundry.png` | `e56c72e8a4c96be345a5cfa088186ad65763fbc94c5f8b85233bb9a04b1aeb50` |
| A08 | `docs/inkstorm-overhaul/concepts/11-foundry-construction-round33.png` | `ef201350569c53d6a36a9e1c0f1db7c6c8d444c58a1dd39db5b3ab22e2c6a2d8` |
| B01 | `assets/source/inkstorm/blockrunner-round34/source-driver-20260908-round34-source-v1.png` | `3d111f3d42cc6879d0b329beb6508a5629d36f23259f0709cfc6c7d6f65a6899` |
| B02 | `assets/source/inkstorm/blockrunner-round34/cleanup-v1-driver-20260908-round34-compare-v1.png` | `82fe63b918af1693874690c8f76ce37490d608c40124d6ada92f37819522c492` |
| B03 | `assets/source/inkstorm/blockrunner-round34/cleanup-v1-rear-20260908-round34-compare-v1.png` | `9fe04a2a09feb73ddcb1e24b84ef1390cfd8f24ec5638cd9b42462e4a269020d` |
| B04 | `assets/source/inkstorm/blockrunner-round34/cleanup-v1-front-20260908-round34-compare-v1.png` | `f4b4d0d40cdb931fa69d2c872c3653df99520c639fffbf36d534a7fb65745292` |
| B05 | `assets/source/inkstorm/blockrunner-round34/cleanup-v1-fullcraft-20260908-round34-compare-v1.png` | `534050a815f335f0cfafee134d0d8a0ad1b55111ece2dcb6c2f0703c0e05c9f0` |
| B06 | `assets/source/inkstorm/blockrunner-round34/source-fullcraft-20260908-round34-source-v1.png` | `92d1ba78486877f96602da3c66606340f1fb0793b5cbb0296a80cca1c62f41d5` |
