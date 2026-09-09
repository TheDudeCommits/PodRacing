# Live player directional shadow adapter

`src/render/inkstorm/InkstormRacerShadow.ts` supplies a separate, moving RGBA depth atlas for the player's visible opaque craft. It uses the same normalized `(-.42, .76, -.5)` sun as the static scenery atlas. `InkstormSunShadow.ts` is unchanged.

The parent task integrated the adapter into `GameApp`, terrain, road, and Inkstorm scenery receivers, with readiness-controlled suppression of the matching contact-shadow instance. The adapter subtask reviewed that integration from source without editing those files. Initial adapter verification used unit tests; the later frozen-build context probe is recorded below. The parent task remains responsible for visual and full-race performance acceptance.

## Integration

1. Create one `new InkstormRacerShadow()` for the main renderer. Default resolution is 512; `{ resolution: 1024 }` is supported. `{ maxCasters: n }` can reduce the budget; values above 22 are clamped.
2. Add `...createInkstormRacerShadowUniforms()` to each receiving `ShaderMaterial`, include `INKSTORM_RACER_SHADOW_GLSL` in its fragment shader, and evaluate `inkstormRacerSunVisibility(worldPosition, unitWorldNormal)`. The one-argument overload assumes an upward ground normal. The position must be the actual rendered world position, including terrain/road deformation and instancing.
3. Feed the visibility into the material's direct sun response. For receivers using the static atlas, `min(inkstormSunVisibility(worldPosition), inkstormRacerSunVisibility(worldPosition, normal))` combines the two occluder sets without independently darkening ambient light twice. Final shadow color/strength is a receiver art decision.
4. After player pose, animation, and class/LOD visibility updates, and before beauty rendering, call `shadow.update(renderer, playerView, scene, groundY)`. Pass the CPU terrain or bridge surface under the player as `groundY`. Omitting it assumes `player.matrixWorld` height minus two metres and is only a fallback.
5. `update()` returns `true` only after a usable atlas is published for that frame. Use this result to suppress the hero's old contact-oval instance. Keep the remaining racers' contact shadows according to their existing presentation policy. If the atlas fails or is inactive, the caller can retain its prior fallback.
6. The first scene passed to `update()` receives the adapter's shared uniform objects. Call `bindReceivers(scene)` again after adding/replacing receiving materials; the adapter deliberately does not traverse the entire world every frame. Alternatively, install the adapter's uniform objects directly in each material factory.
7. Class switches, source mesh visibility, parent transforms, and whole geometry-reference changes are followed without rebuilding the binding list. Call `refreshCasters(playerView)` after adding/removing/reparenting source meshes or changing position-buffer contents in place. It does not change class, LOD, source materials, visibility, parentage, geometry, or source bounding-box caches.
8. Call `clear()` on paths that skip player shadow rendering, including absent/hidden hero views. Call `invalidate()` on context restoration or an explicit retry after correcting a framebuffer failure. Call `dispose()` on app teardown. Both disposal and invalidation are safe to repeat; only disposal is terminal.

## Scope and budgets

The pass submits at most 22 ordinary depth meshes. It borrows source geometry and mirrors each chosen mesh's current world matrix. Proxy meshes, depth material, render target, bounds, camera, uniform objects, and temporary vectors are cached. No source geometry is cloned or merged per frame, and no beauty-pass mesh is reparented or temporarily hidden. Proxies do not carry source callbacks or other scene attachments.

Caster selection respects the source mesh's and every ancestor's `visible` flag, as well as material visibility, opacity, transparency, depth writing, and alpha testing. It excludes the player view's `pilotAnchor`, named pilot subtrees, `:ink-hull` outlines, and subtrees marked `userData.inkstormRacerShadowExclude = true`. It does **not** use `celPostExclude` to reject source meshes: the existing cel prepass marks visible beauty geometry with that flag. Its hidden prepass proxy is excluded by its invisible material.

Eligible source meshes above the cap are ranked by their world bounding-box projected-mass estimate. The smallest are omitted, with the omission count recorded. The currently installed procedural craft produces this CPU/stub-renderer inventory after creating its normal cel prepass proxy and switching through each class:

| Class | Eligible source meshes | Submitted meshes | Omitted meshes | Submitted triangles |
| --- | ---: | ---: | ---: | ---: |
| Podracer | 19 | 19 | 0 | 12,532 |
| Landspeeder | 24 | 22 | 2 | 9,232 |
| Speeder bike | 24 | 22 | 2 | 9,208 |
| Skim speeder | 24 | 22 | 2 | 9,220 |

These are geometry workload receipts, not measured GPU cost or FPS. The real runtime `receipt` also records renderer draw/triangle counter deltas and CPU submission duration; its CPU timer includes preparation and rendering submission and is not a GPU timer. Capture these alongside the whole-frame profiler. The renderer's `info.autoReset` value is restored, and this game's accumulating counters continue to include the shadow pass.

The default target has a 512×512 RGBA unsigned-byte color attachment plus a depth attachment, no mipmaps, no MSAA, and nearest sampling. The receiver performs four-tap bilinear PCF. A 1024 request falls back to 512 if framebuffer completeness fails. An incomplete 512 target, context loss, reversed-depth rendering, or a thrown renderer failure disables the adapter until explicit invalidation; it never allocates/retries a failing framebuffer on every frame. Framebuffer completeness is checked on allocation, not every successful frame.

The orthographic volume follows the visible craft and the projection of its bounds down sun rays to the supplied ground height. It includes a small terrain margin, rejects local spans above 96 metres, and publishes explicit world bounds plus UV/depth guards. Clear atlas texels decode to exactly far depth. Very high jumps, invalid poses, and absent visible geometry clear the previous shadow instead of leaving a stale world stamp. Normal offset and depth bias are in world-scale texel units; live craft/terrain captures still need to confirm there is neither self-shadow acne nor visible shadow detachment.

## Limitations and required visual checks

- This is one local player atlas. Other racers do not cast into it, though a nearby craft can receive it when its material uses the helper.
- Pilot meshes, outlines, transparent exhaust/energy, alpha-tested cutouts, skinned meshes, instanced sources, and morph-target deformation are excluded. Opaque vertex-shader displacement is not replicated by the depth material. The current craft uses ordinary opaque geometry for its main silhouette.
- The depth pass uses conventional OpenGL depth and the installed Three 0.185.1 RGBA packing order. It does not support a renderer configured for reversed depth. Custom camera-layer filtering and clipping-plane material behavior are outside this adapter's current source contract.
- For material arrays, the entire mesh is accepted only when every material is opaque/visible; it uses one depth submission. Its source groups must collectively cover the same triangle range. The current authored craft uses single-material batched geometry.
- The depth material uses front faces. Existing craft solids have the expected winding; isolated double-sided or back-sided sheets require a separate deliberate caster policy before being introduced.
- The two omitted small masses on non-pod classes are an explicit quality/performance tradeoff. Verify all four classes, engine articulation, banks, jumps, and contact at bridge/terrain transitions before accepting it.
- Verify actual whole-frame draw cost and 40–60 FPS behavior in the representative driving scenes. Unit tests cannot prove visual quality, shader compilation in a real GL context, GPU time, or browser context recovery.

## Verification for this adapter

`npx vitest run tests/render/inkstormRacerShadow.test.ts` covers live world transforms, projected ground footprint, visibility/class filtering, bounded actual submissions, local-volume clearing and recovery, shared receiver uniforms, source ownership, renderer-state restoration, framebuffer/context failure latching, disposal, and the installed Three packing order.

`npm run typecheck` passes for the working tree at subtask verification. Final integration, browser checks, and the broader build remain the parent task's responsibility.

## Context-recovery harness extension

`scripts/inkstorm-context-recovery.mjs` now requires the live `renderer.racerShadow` receipt. It retains the original served-build SHA-256 receipt, optional `INKSTORM_EXPECTED_BUILD` check, real launch/input, three-second `WEBGL_lose_context` suspension, static-atlas rebake checks, governor cadence reset, and browser-error assertions. It adds:

1. An initial 512/1024 player atlas with real positive draw/triangle counters and no more than 22 draws.
2. No simulation or successful player-atlas frame progress while the context is suspended, followed by resumed bounded player draws and static-atlas rebaking after restoration.
3. A second real context cycle with a browser-only override of `checkFramebufferStatus` for the player's distinct square target size. The default 512 atlas receives one deliberately incomplete allocation; a 1024 atlas would receive an additional incomplete 512 fallback. Ambiguous overlap with the static-atlas size is rejected before injecting the fault.
4. At least 45 advancing simulation frames with the player atlas latched off, zero player depth draws, no extra allocation attempts, and the static atlas successfully restored. Removing the injected fault alone must leave that latch intact through another 15 simulation frames.
5. A final real context restoration, which invokes the application's normal invalidation path and must restore both atlases with bounded player draws.

The override exists only in the disposable harness page; no production fault hook or runtime behavior was added. Browser cleanup remains in `finally`. Receipts record each failure/recovery phase, plus `restored.png`, `player-shadow-fallback.png`, and `player-shadow-recovered.png` for separate visual inspection. The harness proves diagnostic failure containment and continued simulation, not the exact contact-shadow pixels or visual parity.

`node --check scripts/inkstorm-context-recovery.mjs` and the scoped diff check passed. The live harness then passed on 2026-09-07 in Chrome 152.0.7977.77, 1440×900 at requested DPR 2, using frozen `index-DDt5c0Zg.js` SHA-256 `6a4e5a193edc949487477ce0fdaac9fdb0ce466b5b23eae29e1e319894b93184`. Raw evidence is in `output/playwright/round17-context/receipt.json` and its three screenshots.

The first restore advanced successful player-atlas frames from 314 to 316 and static bakes from 2 to 3. The restored player pass used 512 pixels, 19 draws, and 12,532 triangles; the governor's restored-boundary cadence count was zero. The injected failure produced exactly one allocation check and one injection. Over simulation frames 656–702, successful player-atlas frames remained 324 with zero player depth draws; the static atlas successfully reached bake 4. Removing the injected fault left the player latch unchanged through simulation frame 726. The final real restore reached player frame 326 and static bake 5, again with 19 draws, 12,532 triangles, and null failure/skip fields. Page and console error arrays were empty. The browser closed in `finally`, and the harness process exited zero. This verifies recovery and failure containment; its transient post-restore cadence is not a steady frame-rate measurement.
