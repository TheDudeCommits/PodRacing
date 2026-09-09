# Fork entry round30 source candidate

Ready for root integration and actual-game A/B; **visual quality is unaccepted**. No browser, GPU or Blender was used, and no runtime or public file was changed. All artifacts are staged in this folder. Root owns the active lighting/marker work and must apply the narrow patch rather than an old full World file.

`runtime-candidate.patch` adds two helper modules, appends the support as a second material group to the existing bridge, and passes `course` through one existing `InkstormWorld` call. `git apply --check` and isolated strict TypeScript compilation pass. `InkstormBridge.candidate.ts` is an executable source-only probe with repository-relative imports; root should apply the patch, not copy this probe verbatim.

The target is the grounded raised route wrapping a central rock in `concepts/04-fork.png`. `BLIND_WORLD_ROUND29.md` and the actual `output/gauntlet/round-29/fork-{approach,after-entry}.png` show a thin elevated road ribbon on narrow piers, exposed dark underside and abrupt entry fragments. The candidate adds a continuous closed stone support under the existing deck and a closed, sloping rock buttress into the existing island. It keeps the original steel slab and low trim intact. No new road surface, collision, branch, gulf offset or height sampler is introduced. The support is restricted to flagship seed `0x494e4b53`, `branch-1-shortcut`; source contact use also checks the original row positions and elevations.

The foundation follows interpolated *actual road row boundaries*, with maximum four-metre spacing and a modest 2.2 m toe flare away from the canonical lane. Its contact toe follows terrain and is buried. At the shared entry/exit it settles below ground. The added top is clipped under the exact existing bridge surface using Float32 world coordinates before sampling, so finite-end rounding cannot create an entry obstacle. A shallow saddle joins the inner flank to 11 actual triangles on the first island scan; the longitudinal ends settle into the terrain. These are closed solids, not a cliff plane or a painted empty gap. The original narrow piers remain preserved inside the new mass.

**Source evidence:** `clearance-audit.json` passes 28 barycentric probes per triangle (73,584 total), zero boundary edges, zero inconsistent edge directions, zero degenerate triangles and positive signed volumes. All 268 toe vertices and 4,522 interpolated toe-edge samples are below the actual terrain, with at least 1.09 m burial. No candidate surface rises above the legal canonical road; minimum sampled reserve is 0.35 m. Added stone remains at least 0.316 m below the elevated deck. The island buttress clears the canonical road width by 34.16 m. The nearest pit grading support is 262 m away, so that field contributes zero here.

`island-contact-audit.json` independently casts through the final Float32 top endpoints against the transformed original `canyon-buttress.glb`: all 11 endpoints are inside the source surface, 1.90–4.71 m beyond the first crossing. Source SHA256: `ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6`. NodeIO ignored the source's optional specular-material extension; its geometry was read unchanged. Any change to that rock mesh, its placement, terrain or road rows requires re-deriving and rechecking these contacts.

`hook-audit.json` verifies all original bridge POSITION, NORMAL and COLOR components are retained as an exact prefix; the no-course fallback is identical. The existing 1,380 bridge triangles become 4,008: **+2,628 triangles**, +283,824 attribute bytes (0.271 MiB), one extra main-pass material draw, no added render pass or allocated texture. The new stone material uses the existing shared rock paint. Existing shadow/prepass triangle and draw cost still needs actual profiling. A single CPU construction measurement was about 31 ms; this is not runtime performance acceptance. `fork-foundation.glb` is a 284,820-byte CPU source inspection export, not a new runtime asset request.

For A/B, keep the latest hybrid markers and lighting identical, change only this patch, then capture **fork-approach** and **fork-after-entry** plus the downstream fork. The lower branch must remain visibly inviting before the split: the geometrical clearance test cannot establish screen-space cue visibility. Check the approach end, raised-road contact, island seam, stone silhouette/scale, lower-route advance cues, road-edge depth artifacts, both fork traversal routes and performance. Reject or reshape the support if it hides the lower route. No source image, GLB or CPU receipt substitutes for this racing-view grade.

Reproduce from repository root:

```sh
node assets/source/inkstorm/fork-entry-round30/run-cpu.mjs audit.ts
node assets/source/inkstorm/fork-entry-round30/run-cpu.mjs hook-audit.ts
node assets/source/inkstorm/fork-entry-round30/final-source-audit.mjs
node node_modules/typescript/bin/tsc -p assets/source/inkstorm/fork-entry-round30/tsconfig.json
git apply --check assets/source/inkstorm/fork-entry-round30/runtime-candidate.patch
```

The GLB/contact audit uses the existing `@gltf-transform/core` utility installation at `/tmp/inkstorm-rock-lod-tools`; no dependency was added. `package-patch.py` regenerates a narrow patch against current files and does not edit them. Do not use historical before-copies as integration replacements. `manifest.json` pins the staged candidate and unchanged physics sources.
