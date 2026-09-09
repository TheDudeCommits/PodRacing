# Shared geology material revision after round 20

This is a source revision receipt, not visual acceptance. Compared all seven round-20 section screenshots and `launch-descent.png` directly with the seven approved Inkstorm concepts. The blind round-20 critic independently identified the same regular pale strata, dark burgundy canyon interiors, and tan-terrain/pink-scan mismatch.

Released source at 2026-09-07 14:52 UTC (SHA-256):

| File | Hash |
| --- | --- |
| InkstormGeologyShader.ts | `74c6335b82cba0e4caaec14b2897baf50196b5c808d910dab328cabc610eed73` |
| InkstormSurfaceMaterial.ts | `b0a7a2990cb0f23c390e07fc18b6c97937330d9afca563ed93abb43531bda6bb` |
| TerrainMaterial.ts | `5cc47c364b1b6d6c84e2255af66e756b9b1df9b51b8147d183a8d7cb09ae481f` |

## Observed problem and implementation

The old shared shader repeated a pale deposit every approximately 13.7 world metres (`fract(world.y * .073 + warp)`), with up to 72% cream tint. Scan meshes then received additional local-space stripes, local-height bottom darkening, and different lighting and haze from the physical terrain. The resulting bands overwhelmed the actual crag geometry and made adjacent surfaces look unrelated.

- `InkstormGeologyShader.ts`: replace periodic height bands with broad, warped mineral patches. Deposit widths and gaps vary in two dimensions. The lightest deposit is warm sandstone, limited to 22% blend strength; darker iron patches remain restrained. Existing mipmapped paint supplies pits/chips with three world-space triplanar reads. Small deposit detail fades with its screen footprint. There is no animated rock noise, added normal perturbation, new texture, or new render pass.
- The same module now supplies shared rock lighting and haze. Geometric sun-facing/upward ledges receive warm light. Cool violet sky fill keeps shadow faces readable. Static scenery and racer-shadow visibility still control direct light.
- `InkstormSurfaceMaterial.ts`: use the shared rock albedo/light/haze without the additional local-height or local-strata treatment. Remove the three redundant local-space rock-paint reads (six to three paint reads per stone fragment). Share the asynchronous paint uniform objects with the terrain, so either surface can be constructed before texture completion. Preserve the machinery wear, authored service-light colors, and machinery sheen behavior.
- `TerrainMaterial.ts`: use the same rock shading and haze after the existing sand-shading path, applying rock shadow and atmosphere once. Widen the authored cliff transition from slope 0.30–0.64 to 0.24–0.58 so mountain shoulders expose stone more consistently; upward shelves remain sand. The existing authored-offset gate (8–42 m) remains. This is a material selection change only.

## Verification and remaining visual checks

`npm run typecheck` passes. The revision is limited to the three material files above and this receipt. No geometry, terrain height, route, collision, public asset, shader normal, or physics code changed. No browser, Blender, GPU capture, build, performance measurement, or deployment was run for this material pass. TypeScript validation does not prove GLSL compilation or image quality.

The next actual-game capture should inspect canyon shadow detail, launch/descent terrain-to-scan transitions, silhouette striping, distant fog continuity, and temporal stability at racing speed. The source adds modest low-frequency scalar noise work while removing redundant scan texture reads; its frame-time effect has not been measured. Shared shading cannot remove scan/terrain differences in shape or their existing normal stencils. The terrain beauty normal still uses its wider 9.5–48 m stencil; physics/MRT normal probes are a separate, unchanged contract.

The critic's road channel/shoulder-detail and foundry tank geometry comments are outside this bounded revision. Nothing here claims that the seven scenes match their concepts or that the overall visual gauntlet has passed.
