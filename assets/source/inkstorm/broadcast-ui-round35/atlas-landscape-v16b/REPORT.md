# Short landscape atlas correction

V16a diagnostic at 844 x 390 failed because the 340px map occupied a viewport with a smaller flex basis. In the recorded scrolled state the map ran from y82 to422, while the footer began at373. The selected two-line label ended at373.328, crossing the footer and failing the required 4px clearance.

The <=540px-height, >=721px-width override now gives the viewport intrinsic height and a 360px minimum matching a 360px map. The complete map precedes the footer in normal flow; the atlas itself remains vertically scrollable and the map horizontally scrollable. No label is hidden, font reduced, or assertion relaxed. The desktop and portrait media branches are unchanged. Before/after source and exact hashes are preserved.

PostCSS parsed 135 rules and source whitespace checks passed. A CPU typecheck encountered only four in-flight damaged-Teemto member errors in another agent-owned file; the final integrated check and native landscape label/marker/footer checks remain pending. The arithmetic explains the correction but does not establish a native PASS.
