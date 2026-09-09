# Caption paint-guard review

No actionable finding in the bounded delta. The actual caption range, viewport/overflow and ancestor visibility are recorded, and the original instrument/progress separation gate remains. Where the speed-ring bounds overlap the caption, the guard requires the actual positioned siblings to have numeric z-indices with redline above speed. That rejects the observed V19 equal-z failure and accepts the one-property correction.

Eleven bounded CPU cases executed the extracted actual assertion block: corrected order passes; equal/reversed order, auto z-index, unpositioned/different-parent contexts, hidden/clipped/offscreen/zero-size text fail; non-overlap still requires visible text. Syntax passes. The delta is only inside the existing three-viewport instrument check; no earlier gates are removed.

The whole-ring box overlap is conservative. This verifies the specific sibling paint ordering, not arbitrary overlay occlusion or pixel contrast. Native execution and frame inspection remain necessary.
