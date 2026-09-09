# Round 36 — blind screenshot review

Date: 2026-09-09

**Verdict: APPROVE the visible setup UI and desktop battle HUD. Overall: 8.9/10.** The setup satisfies the requested order: race type at the top, a prominent rendered pod in the middle, essential settings below, then an unmistakable Race action. No structural redesign is needed.

## Scope

Reviewed only these five supplied images, at their native dimensions:

- `output/simple-race-setup/touch-refinement/native/desktop-default.png` — 1440 × 900
- `output/simple-race-setup/touch-refinement/native/portrait-default.png` — 390 × 844
- `output/simple-race-setup/touch-refinement/native/landscape-default.png` — 844 × 390
- `output/simple-race-setup/touch-refinement/native/compact-default.png` — 667 × 375
- `output/simple-race-setup/touch-refinement/native/desktop-battle-inputs.png` — 1440 × 900

No source, history, other reports, or browser sessions were inspected. This verdict covers visual presentation in these stills. It does not establish interaction correctness, actual hitboxes, animation quality, performance, or mobile battle usability.

## Criteria

| Criterion | Score | Screenshot evidence |
| --- | ---: | --- |
| Setup hierarchy and clarity | 9.2/10 | Mode selection is isolated at the top; the pod dominates the center; difficulty and laps sit directly beside or above the Race action. The same order remains intelligible in both short landscape layouts. |
| Simplicity and text economy | 9.1/10 | Four modes, one selected pod, two essential setting groups, and one primary action are easy to scan. The small More control stays visually secondary. There is no explanatory copy competing with the vehicle. |
| Touch readability | 8.6/10 | Portrait mode labels, pod arrows, rotation buttons, selected settings, and Race are comfortably visible. The compact layout retains separated controls, but its AI and LAPS group labels are noticeably tiny. Screenshots cannot prove the underlying touch targets. |
| Visual style and consistency | 9.0/10 | Warm paper, deep teal, rust, and restrained gold accents form a coherent identity. The large vehicle and quiet curved framing give the setup character without clutter. Selected states are immediately distinguishable. |
| Desktop battle HUD | 8.6/10 | Lap, elapsed time, position, and speed read quickly. Weapon keys are paired with names, and the hit indicator is concise. The three smaller vehicle meters are less legible against the overlapping translucent cyan scene elements. |

## Layout observations

**Desktop:** The rendered pod earns the large central area. The pod name and navigation are subordinate to the model, while the rust Race button has the strongest action emphasis. Difficulty and laps form one compact line above it. The small lower-left More button adds little visual weight.

**Portrait:** All required setup elements fit within the supplied frame. The vertical pod composition preserves its full silhouette, and the tab labels remain readable without wrapping. Separating difficulty and laps into two rows is clear. The Race button is sufficiently prominent.

**Landscape and compact:** Moving the pod name to the upper-right and placing the options and Race action in a bottom strip preserves useful model space. The compact screenshot is denser, but the primary decision path remains obvious and no labels visibly collide or clip.

**Battle:** The top status strip and lower-corner controls leave the central driving view largely free of interface panels. Strong numerals provide a useful hierarchy. The cyan translucent overlap on the right is visibly busy near speed and the vehicle meters; the screenshot alone cannot establish its cause or duration.

## Small optional corrections

1. Increase the compact landscape **AI** and **LAPS** labels by roughly 1–2 CSS pixels, retaining the current control arrangement. These are the clearest remaining readability weakness in the setup stills.
2. Give the **BOOST / HEAT / DAMAGE** labels and values a slightly stronger common dark backing, or modestly increase their text size. Preserve their current grouping; the aim is to keep them readable when bright or translucent world elements overlap that corner.

Neither correction is a blocker to this screenshot approval. Keep the present hierarchy and restrained amount of text.
