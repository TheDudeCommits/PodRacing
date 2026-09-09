# Renderer resource lifetime review — 2026-09-06

The seven-section performance report is consistent with bounded GPU warming. A separate missing cleanup operation on retired instanced meshes was found and fixed. That defect does not explain the reported geometry/texture counters by itself: Three tracks per-instance buffers separately.

## Observed counts

The original `output/gauntlet/performance/section-performance.json` increased from 148 geometries / 61 textures at the grid to 382 / 159 at the launch, then held those counts through the foundry and finish. Programs settled at 36.

A bounded follow-up used the already-built `index-Bbxq8tEM.js` in Chrome 152 at 1440×900. It instrumented the main WebGL context's create/delete buffer and texture calls after startup, then ran three passes over the same seven diagnostic sections. Each section rendered 60 frames and advanced 120 fixed simulation ticks. Capture mode remained active.

| Point | Geometries | Textures | Programs | Created / deleted buffers | Created / deleted textures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before first seek | 107 | 29 | 33 | counters installed after startup | counters installed after startup |
| First grid | 193 | 73 | 34 | 431 / 73 | 48 / 4 |
| First fork | 200 | 73 | 36 | 465 / 73 | 48 / 4 |
| End of pass 1 | 200 | 73 | 36 | 465 / 73 | 48 / 4 |
| Every section of pass 2 | 200 | 73 | 36 | 465 / 73 | 48 / 4 |
| Every section of pass 3 | 200 | 73 | 36 | 465 / 73 | 48 / 4 |

All 21 seeks kept course ordinal 1. Complete measurements and scope are in [resource-lifetime-probe.json](../../output/gauntlet/performance/resource-lifetime-probe.json). The browser and its preview server were closed after collection.

This probe establishes stability in those staged states. It is not a live-race FPS benchmark, an exact reproduction of the original longer live section run, or proof that every rebuild flow is leak-free. It predates the cleanup fixes below.

## Ownership findings

- `GameApp.seekCourse()` delegates to `setPreset('race')`. The latter rebuilds only when switching into the chaos profile, so subsequent diagnostic seeks reuse the course. Player/rival render views and pilots also persist across course rebuilds.
- `PodracerView` prepares class geometry and full/reduced prepass variants. Visibility and LOD determine when those resources first reach the GPU. Its teardown visits hidden meshes and both prepass maps. No concrete leak was found there.
- `CelMaterial.dispose()` releases its owned ramp and matcap textures. `PilotView` releases its own outlines, geometry and materials.
- Garage portraits use a separate renderer. Hiding the garage releases its renderer, context and scene resources; its portrait image cache is bounded. Those resources do not contribute to the main renderer's memory counters.
- `RaceCourseView.clearCourse()` previously disposed geometry and materials but omitted `InstancedMesh.dispose()`. Three 0.185.1's `WebGLObjects` listens to that object's dispose event to release per-object binding states and instance matrix/color buffers. Geometry disposal alone does not perform that cleanup.
- Instanced inverted hulls borrow their source's matrix buffer and morph texture. They also need object disposal, but directly disposing a hull would release borrowed resources still owned by its live source.

## Changes and verification

`RaceCourseView` now disposes each retired instanced mesh when rebuilding or clearing the course. `InvertedHullOutline` now detaches borrowed instancing resources before disposing the hull's object state, and ignores synchronization after disposal. Its geometry, source textures and caller-owned material remain owned by the source/caller.

The parent task added the same instance cleanup to the `InkstormWorld` mesh disposal helper. Its shadow, bridge and foundation builders all return instanced meshes with owned geometry/materials, so the helper covers them. Shared Inkstorm paint textures remain intentionally cached.

Two focused regressions failed before these fixes and passed after: retired course instances emit disposal exactly once across rebuild/final cleanup; retired instanced hulls emit disposal once while preserving their live source's matrix, geometry, material and morph texture. All 14 tests in `tests/render/raceCourseView.test.ts` and `tests/materials/celMaterials.test.ts` pass. Typecheck and `git diff --check` pass. No new browser performance claim is made for the fixes.
