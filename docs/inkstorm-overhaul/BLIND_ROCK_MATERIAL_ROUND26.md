# Blind rock material critique — round 26

**Verdict: retain round 26 as the better working direction; change it further. Art acceptance: FAIL.** None of the three scenes reaches the required minimum of 8/10 in every material category. The improvement over round 25 is substantial in surface clarity, but the target finish remains well ahead.

This is an independent image-only judgment. I directly viewed the nine images listed below. I did not read implementation, other reviews, or receipts; I did not use a browser, Blender, or rendering jobs. Scores concern the visible rock material only. They do not establish anything about physics, performance, code, or behavior outside these still frames.

## Images directly viewed

### Grid

- Target: `/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/01-grid.png`
- Round 25: `/Users/amir/Projects/PodRacing/output/gauntlet/round-25/01-grid.png`
- Round 26: `/Users/amir/Projects/PodRacing/output/gauntlet/round26-material-v1/01-grid.png`

### Canyon

- Target: `/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/03-canyon.png`
- Round 25: `/Users/amir/Projects/PodRacing/output/gauntlet/round-25/03-canyon.png`
- Round 26: `/Users/amir/Projects/PodRacing/output/gauntlet/round26-material-v1/03-canyon.png`

### Launch

- Target: `/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/05-launch.png`
- Round 25: `/Users/amir/Projects/PodRacing/output/gauntlet/round-25/05-launch.png`
- Round 26: `/Users/amir/Projects/PodRacing/output/gauntlet/round26-material-v1/05-launch.png`

The actual images were displayed at 1996 × 1248 from 2160 × 1350 originals. Consequently, this review emphasizes plainly visible frame-scale defects; it does not certify individual pixels or temporal stability.

## Material scores

Each cell is **round 25 → round 26**, out of 10. A higher repetition score means less conspicuous repetition; a higher artifact score means fewer visible artifacts. The threshold is absolute target quality, not improvement relative to the previous round.

| Material category | Grid | Canyon | Launch |
| --- | --- | --- | --- |
| Rock finish and weathering | 4 → 6 | 4 → 5 | 3 → 4.5 |
| Large-face readability | 4 → 7 | 4 → 6.5 | 3.5 → 6 |
| Texture repetition control | 3 → 6 | 3.5 → 6 | 2.5 → 3.5 |
| Shade and color | 5 → 6 | 3 → 4.5 | 4 → 5.5 |
| Visible artifact control | 4 → 6.5 | 4 → 6 | 3 → 4.5 |
| Material acceptance | FAIL | FAIL | FAIL |

## What the A/B comparison shows

### Grid

Round 25 has dense, high-contrast horizontal stippling, especially on the enormous face at the upper left. It competes with the rock's large forms and makes the surface look mechanically scratched. Round 26 removes most of that noise. The left face now has broad planes and legible cracks; the right spire also reads more clearly.

However, the new finish is dominated by smooth orange faces bounded by dark polygonal fractures. It resembles fractured molded stone more than the target's weathered, bedded sandstone. The target combines broad red planes, irregular horizontal ledges, sparse chips, dusty shelves, and muted violet recesses. Round 26 offers less variation inside each plane and too little intermediate-scale erosion. The central distant spire retains conspicuous vertical ribbing. This is a better base, not a finished target match.

### Canyon

The change is especially obvious here: round 25's nearly uniform lavender surface and continuous fine stripes become a warm brown-red wall with large fractures. The scene gains easily readable individual patches of rock and loses the excessive etched texture.

The replacement also flattens the color design. Most of the shadowed arch and walls sit in a similar terracotta family. Broad portions feel smooth and clay-like, with the dark cracks doing nearly all the descriptive work. The target has dark plum and blue-violet shade, warmer reflected passages, orange exposed edges, and a strong hierarchy of horizontal beds. Its material explains layered, chipped rock even in shadow. Round 26's angular cracks explain separate panels but do not yet explain sandstone erosion. Some crack junctions form thin dark wedges and sharp graphic slivers; these remain visibly artificial in such large, smooth surroundings.

### Launch

This is the weakest material view and the clearest repetition test. Round 25 covers the broad mesas with fine horizontal combing; round 26 makes their faces much easier to read at a glance. The warmer large forms are an improvement.

Nevertheless, the large left mesa visibly cycles through similarly sized tall crack cells and recurring crosswise joints. The same overall crack vocabulary continues across the right cliffs. There is insufficient change in scale, direction, or wear between neighboring expanses. The curved flanks and low connecting slope also carry visibly elongated or slanted crack patterns. Whether these patterns come from texture mapping or another mechanism cannot be determined from the images; the repeated and stretched appearance itself is clear.

The target's rocks have different apparent histories: overhanging beds, abraded faces, fractured columns, chipped shelves, and dusty tops. Round 26 reads as a small family of rounded forms covered in one oversized cracked-surface treatment. It is cleaner than round 25, but still conspicuously synthetic.

## Retain/change recommendation

**Retain:** the reduced fine-frequency noise, broader plane separation, and warmer exposed rock. Reverting to round 25 would restore a busy etched appearance and would not resolve the target gap.

**Change:** the dominance of polygonal cracking, the repeated launch-wall pattern, the scarcity of intermediate-scale bedding and wear, and the canyon's uniform warm shade. Do not increase fine texture everywhere to compensate; that would sacrifice the clearest improvement.

## Three concrete next material corrections

1. **Give the broad rock faces a hierarchy of sandstone wear.** Keep large readable planes, but break them with a few irregular horizontal bedding ledges, selective chipped margins, and smaller erosion patches. Confine the darkest deep fractures to fewer meaningful breaks. The large left grid wall and canyon arch should read as layered stone before the eye notices any small texture.
2. **Break the launch cliffs' repeated crack rhythm and stretched appearance.** On the left mesa, remove the recurring row of similarly tall cells and repeated crosswise joint bands. Vary the widths and termination points of fractures across separate faces; provide substantial quiet areas and locally denser weathering. The low saddle and curved cliff flanks need surface marks that retain believable proportions. Judge this again using the full launch frame, where repetition is most exposed.
3. **Restore form-dependent color and shade.** Use cooler, darker recessed and shaded rock, restrained warm bounce, and dusty amber highlights on exposed shelves and chips. In the canyon, the arch underside, broad facing walls, and sunlit right edges should occupy distinguishable value and color groups. Preserve the quieter surface while introducing mottled mineral variation inside large planes so they stop reading as flat terracotta panels.

## Separate geometry and composition blockers

These remain visible but are **not included as material deductions** and will not be solved by a better surface treatment alone.

- **Grid:** the actual view is sparse and dominated by a very large, simple gantry. The target's layered mesa backdrop, dense roadside settlement, overhead fabric, and integrated foreground/midground scale are not present at comparable richness.
- **Canyon:** the actual arch presents a narrow, tall, jagged opening through a thick cliff wall. The target has a broad low sweeping arch, articulated supporting shelves, accumulated rubble, and an inviting winding road framed through the opening. The current smooth road mounds and abrupt cliff bases still look staged.
- **Launch:** the actual scene is mostly two large rounded mesas enclosing a sparse gap. The target reveals an extensive descending canyon with many varied columns, shelves, overlapping depth layers, and a substantial distant industrial settlement. Rounded cap contours and smooth continuous cliff flanks remain obvious even after the material change.

**Acceptance decision:** keep iterating from round 26. It is a useful visual improvement, but no reviewed scene currently meets the 8/10-per-category material gate, and the wider target composition remains unachieved.
