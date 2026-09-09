# Imported vehicle presentation infrastructure

Implemented 2026-09-07. This is a rendering and resource-ownership adapter; it does not select a vehicle, change physics, register assets in the garage, or load a model by construction. GameApp, PodracerView and garage integration remain a separate change. No browser, GPU, Blender or build was run for this infrastructure task.

## Public interface

`src/render/vehicles/index.ts` exports:

- `VehicleArtLibrary({ load?, maxIdleEntries? })`. `acquire({ id, revision, url }, { signal? })` returns a `VehicleArtLease`. The default loader is GLTFLoader and is instantiated only on the first explicit acquisition. Cache identity includes all three source fields.
- `VehicleArtLease.root` is a distinct, deep-cloned node hierarchy. Geometry, original materials and textures are shared immutable template resources. `release()` is idempotent and makes the leased hierarchy unusable.
- `ImportedVehiclePresentation(library, options)` is an imported-art `Group` for a stable outer racer wrapper. `setSource(definition | null)` returns `empty`, `loading`, `ready`, `error` or `disposed` status; `clearArt()` and `dispose()` cancel pending selection. No URL or default vehicle is built into this class.
- `status`, `error`, `requestedSource` and `activeSource` distinguish a requested selection from art that is actually ready. A failed replacement preserves prior ready art. An initial failure leaves no active imported art, allowing the outer wrapper to show its procedural fallback.
- `geometryMeshes`, `getOpaqueMeshes()`, `prepassMeshes`, `materials`, `getShadowMeshes()`, `getShadowRoot()`, `geometryRevision` and `statistics` expose actual resources and measured geometry counts. These do not claim rendered FPS or GPU timings.
- `getNode(name)` returns only an unambiguous named node. `getAttachment(name)` returns an explicitly authored attachment group. Definitions supply positions and optional XYZ Euler rotations, in the named parent's local space or normalized model-root space when the parent is omitted. No seat, exhaust or coupling positions are inferred.
- `embeddedPilotNodePrefix` is an explicit DCC naming contract. Matching mesh nodes or their named ancestors count as embedded driver geometry. `hasEmbeddedPilot` tells the future wrapper to suppress its procedural pilot. Embedded drivers participate in beauty and the normal/depth pass, while an explicit exclusion flag follows the existing racer-shadow pilot policy.

The planned Teemto URLs supplied by the asset pipeline are `/assets/inkstorm/vehicles/teemto-hero.glb` and `/assets/inkstorm/vehicles/teemto-rival.glb`. They are **not** an active catalogue in this code. The pipeline reports a normalized +Z-forward, Y-up hero with 50,705 triangles, three body meshes and four embedded driver meshes; this task did not load or visually inspect that exported runtime GLB.

## Ownership and cancellation

Concurrent requests for the same source share one load. Each waiter reserves the template until it either acquires a lease or cancels, preventing one early release from disposing a resource another request is about to use. An AbortSignal cancels its consumer immediately without cancelling other consumers. The underlying GLTF request is allowed to finish; a late unused success is cached within the idle limit or disposed. A failed load is removed and retries only upon a later explicit acquire.

There are at most two idle templates by default, with LRU eviction. Active leases remain pinned. The cache does not cap the number of active leases or provide a network concurrency scheduler; the application must request only selected/currently needed variants, not preload a whole catalogue. Constructing metadata for 26 choices causes no loads. A garage should acquire the selected preview only, release it when hidden, and retain generated preview images separately from WebGL resources.

Disposing the library cancels waiting consumers and rejects new requests. Existing leased geometry stays valid until its last lease is released. Late successful callbacks after library disposal release their transferred resources. Geometry, materials and textures are collected in sets and disposed once per owned template; owned ImageBitmaps are closed only when the template is no longer leased. An injected loader must transfer distinct template ownership and must not return the same externally owned resource graph under unrelated cache keys.

Presentation changes use a generation counter and per-request cancellation. An older completion cannot replace a newer selection, a cleared view, or a disposed view. Cel materials are owned per presentation; original base-color textures remain borrowed from the lease. The presentation never disposes borrowed geometry or textures itself.

These classes allocate no render targets or raw WebGL handles. Three retains the CPU geometry and textures needed for context restoration. Future integration must preserve those leases across renderer recovery and re-register prepasses if the post pipeline is recreated.

## Admission and passes

Default caps are six body draws, six embedded-driver draws, twelve total opaque draws and 60,000 triangles. A rival presentation can pass a smaller explicit triangle limit. All meshes count toward admission, including currently hidden nodes, so toggling visibility cannot silently bypass the asset budget. Counts describe the imported art only; VFX, outlines, procedural fallback, additional passes and the rest of the scene have separate costs.

Supported assets contain baked rigid triangle meshes with positions, normals, one material per mesh and the UV attribute required by each base-color map. Skinned meshes, instanced meshes and morph targets are rejected. The initial adapter rejects transparent, alpha-cutout, non-depth-writing and multi-material primitives rather than feeding incompatible geometry to the opaque prepass. Original electric Rayos must be excluded by DCC and replaced by the existing procedural VFX during integration. Animation clips are not played by the library; future engine articulation acts on the cloned rigid nodes.

Each supported mesh gets one prepass proxy borrowing the **same actual geometry**, as an identity-transform child. Engine rotation/translation and all ancestor transforms therefore affect its normal/depth silhouette without merging a rest pose or cloning geometry each frame. The hidden beauty material keeps proxies out of the color pass. Real beauty meshes are marked `celPostExclude`; proxies carry `inkstormRacerShadowExclude` and are not shadow casters. Actual body meshes remain the shadow sources.

`CelPostPipeline` renders custom proxies directly and checks their own visibility, not their ancestors. Integration must call `syncPrepassVisibility()` after all pose/LOD/visibility changes, even when the wrapper is hidden. The method does not allocate. It combines source material visibility with the complete source ancestor chain.

The synchronous `onGeometryChanged` callback carries old and new proxy arrays and the revision. The new hierarchy is installed and old hierarchy detached at that point, but old materials/leases have not yet been released. The wrapper should unregister old custom prepasses, register each new proxy with its owned/shared CelPrepassMaterial, explicitly bind the current static shadow uniforms to each new cel material, and call `InkstormRacerShadow.refreshCasters(stablePlayerWrapper)` for the hero. Old resources are then released in a `finally` block. Registration callbacks should not throw. `clearArt()` and `dispose()` issue the same geometry change with an empty next list.

Do not parent cached imported geometry beneath the existing `PodracerView` and call its broad traversal disposer: that disposer assumes ownership of every descendant geometry/material. Use a stable outer wrapper that owns the procedural view and imported presentation separately and disposes each through its own API. The future wrapper also owns PilotView, VFX, preview registrations and external attachment children; it must detach/dispose those before the imported lease is released.

## Textured cel material

`CelMaterial` adds optional borrowed `baseColorMap`, `baseColorStrength`, `baseColorSaturation` and `baseColorContrast`. Existing procedural materials leave `USE_CEL_BASE_COLOR_MAP` disabled. Textured materials retain loader-established color space, flipY and UV channel 0–3, and copy the authored UV transform without mutating the shared texture. Linear-space paint shaping multiplies the cel ramp before highlights, static-world shadow and haze. Texture alpha is not used by this opaque adapter.

Imported materials retain source color tint, side, vertex-color setting and base-color map. A neutral four-band diffuse ramp preserves the authored paint colors by default; the caller may provide `materialOptions` to tune the concept's palette, wear, specular, rim, reflection and haze. Normal, metallic/roughness and emissive texture maps are not consumed by this initial cel material. No per-model visual match is claimed until actual exported art is rendered and inspected.

The existing static-atlas uniform names and binding contract are unchanged. Because a ready static atlas may skip its update for an unchanged world revision, newly created imported materials require explicit uniform binding in the geometry-change callback. No new hero self-shadow receiver was added.

## Validation and remaining acceptance

Commands run:

```text
npm run typecheck
npx vitest run tests/render/vehicleArtLibrary.test.ts tests/render/importedVehiclePresentation.test.ts tests/materials/celTexturedMaterial.test.ts tests/materials/celMaterials.test.ts
git diff --check -- src/render/materials/CelMaterial.ts src/render/materials/celShaders.ts src/render/vehicles tests/render/vehicleArtFixtures.ts tests/render/vehicleArtLibrary.test.ts tests/render/importedVehiclePresentation.test.ts tests/materials/celTexturedMaterial.test.ts
```

Typecheck and scoped whitespace validation pass. All 35 focused tests across four files pass, including the pre-existing cel material suite. The first typecheck attempt found one unused import in a new test; removing it resolved that failure. Tests use injected CPU-only Three scene fixtures and never fetch asset URLs or create a WebGL renderer.

Coverage includes concurrent load/release, immediate cancellation, cancelled late success, load rejection/explicit retry, revision separation, idle LRU eviction, library disposal with live leases, unsupported deformed geometry, out-of-order presentation selection, clear/dispose during load, prior-art preservation on failure, registration-before-release ordering, per-instance material isolation, real geometry/normal-matrix proxy correspondence, full ancestor visibility, separate embedded pilot admission, missing anchors/UVs, transparency rejection and explicit rival triangle limits. Texture tests verify borrowed ownership, UV transform/channel handling and static-atlas uniform compatibility.

Still required after runtime integration: actual GLB network/decoder success, textured shader compilation on the real renderer, visual concept acceptance, normalization/seat/VFX anchors, garage selection and fallback reachability, model/LOD replacement registration, real context restoration, and uninterrupted race cadence with the imported hero and rival. CPU tests are not evidence of shader compilation, appearance, player enjoyment or FPS.
