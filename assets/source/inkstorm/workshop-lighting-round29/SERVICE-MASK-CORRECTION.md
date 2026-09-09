# Cobalt enamel / cyan service-light correction

The runtime change is confined to `src/render/inkstorm/InkstormSurfaceMaterial.ts`. Its previous hue-ratio predicate treated muted cobalt paint as emissive. That bypassed machinery wear, compressed sun/shade contrast, and excluded blue surfaces from the already-authored workshop task light. The new predicate runs on the untouched authored vertex color before broad/brush/wear modulation: green >=0.50, blue >=0.45, and both green and blue >=3 times red. All existing lamp strengths, source positions, falloff, receiver masks, instance transforms, and geometry remain unchanged. The old source-only comment was also updated to describe the runtime lighting accurately.

The root's discovery files `audit-service-colors.mjs` and `service-color-audit.json` are preserved unchanged. Their proposed 0.55/0.50 thresholds were discovery values; the final thresholds are separately recorded in `service-mask-audit.json`. Cyan classification is validated against its two authored hue rays, `(0.1,0.87,0.79)` and `(0.13,0.78,0.74)`, including the exported scalar face shading. This ground truth is independent of the shader's brightness cutoffs.

The audit read every `COLOR_0` entry in all six runtime industrial GLBs: 83,689 vertex entries and 10,395 unique colors. It retained every cyan vertex with zero false positives or false negatives. Existing cyan has minimum green/blue about0.5742/0.5214, while old false-positive blues reach at most about0.21/0.3328. Classifying before paint multiplication prevents the shader's 0.82..1.05 procedural modulation from crossing the thresholds. The old predicate misclassified 8,654 vertex entries; those now receive the ordinary material response.

## Actual GPU evidence

`gpu-service-probe.json` and its PNG contain a controlled WebGL2 material probe on Apple M4 through ANGLE Metal. It imports the real current material class and the preserved original class, uses the actual exported colors, the real `machinery-paint.png`, and an instanced flat diagnostic mesh. It does not instantiate or modify GameApp, World, terrain, or capture scripts. Results:

- All1,084 unique muted-blue colors regain direct sun response. Their minimum sampled lit/shade luminance ratio is3.179; the old shader's maximum was1.229.
- All166 unique true cyan colors preserve their original lit and shaded pixels exactly, including the dim cyan faces and the finish-tower hue variant.
- Enabling the existing machinery branch with its real paint texture changes all1,084 blue samples; the old shader changed none. This comparison includes both the wear and enamel-sheen response; it does not isolate texture contribution from sheen.
- The unchanged workshop-light branch changes every blue sample by at least10 in one linear8-bit channel. The old shader excluded all those blue samples. All166 cyan samples remain excluded from added task diffuse.
- No shader compilation or WebGL errors were reported. The browser console recorded one unrelated `/favicon.ico`404 on the diagnostic page.

The probe compares controlled sun vectors with shadow uniforms disabled, fixed near-camera distance, and diagnostic flat geometry. Its screenshot is a GPU-derived swatch table, not an in-world screenshot or art-acceptance evidence. It does not prove material quality under every scenery shadow, the absence of local occlusion leaks, cloth quality, final parity, or FPS. The machinery comparison combines wear and sheen as noted above. Root owns the isolated service-only in-world A/B against unchanged v3 assets.

## Source and execution receipt

- Current runtime material SHA256: `bf63c30c6c1e273275389e3468866ceb3dd9864ca5ef32fc091e8f66fdbf7d3a`.
- `service-mask-correction.patch` is the exact diff against the root-preserved `versions/initial-lighting/InkstormSurfaceMaterial.ts`. It changes only the predicate placement/thresholds and the explanatory runtime comment.
- `service-mask-audit.json` records all six GLB hashes and palette counts. `service-mask-execution.json` records final source/data hashes and the check result.
- `npm run typecheck` passed. Focused `git diff --check` passed. The meaningful behavior check is the actual GPU probe above; no implementation-text-only runtime test was added.
- The named Playwright browser `inkstorm-service-mask` was closed immediately after it saved the probe. Its isolated Vite server on port5198 was stopped, and the GPU slot was released to root before documenting results.

The earlier `runtime-lighting.patch`, candidate snapshots, and source-only math receipts describe the initial task-light staging. They are historical and must not replace the corrected runtime material. Re-running the full staging generator against an already-integrated constructor will fail its exact source assertions; do not remove those guards to force a replacement.
