# Build V15 composition revision

Source ownership: `src/ui/workshopGraphicStyles.ts` only. This pass responds to visible hierarchy/comparison issues in the actual reference and V14 capture. It does not revise the independent V14 FAIL verdict or infer a new score.

- Broader 20px section headings replace 13px annotations; installed names increase to 17px; alternative names use 20–24px bold type; the equipped name is 29px. Stencil type remains confined to the main Build title.
- Alternative benefits and tradeoffs use matching padded reading rows with restrained tonal fills. Actual stat strings remain unchanged, and effects remain readable independently of color.
- Each alternative has a 42px full-width cream equip bar with a larger 14px action label. This remains the same existing part button and action; no nested interactive control is introduced.
- Desktop alternatives use the remaining library height. The final row uses `minmax(max-content,1fr)` so revealed descriptions and comparisons grow the scrolling row instead of overflowing a fixed-height card. Future additional parts retain normal grid auto-placement.
- Panel corners are 12px; equipment plates have 7–9px corners. A single restrained family watermark occupies the lower installed panel, using original filled geometry derived from the active bay. It is decorative and does not assign a different part identity. Existing part-specific glyphs and installed fallback semantics are unchanged.
- Equipped descriptions remain visible. Alternative descriptions/comparisons keep their existing hover/focus disclosure and normal-flow expansion. Five installed slots, twenty catalog choices, dynamic values and all narrow scrolling remain in the existing DOM/state model.

Validation: TypeScript passed; PostCSS parsed all 101 rules; all five encoded SVG stamps parse as XML; `git diff --check` passed. No browser, build, GPU, public or dist changes were made. Actual desktop/narrow overflow, description disclosure, visual comparison and interaction acceptance remain with the parent capture.

Before/after source, exact hashes, generated CSS and decoded decorative stamps are preserved alongside this report.
