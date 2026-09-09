# Effect integration revision — 7 September 2026

## Confirmed causes

The yellow overlap in `output/gauntlet/shadow-preview/04-fork.png` is the alternate-route entry beacon, not dust or a captured crash. The old geometry was a fully yellow four-sided cylinder, 7.2 m tall, placed directly on the branch centerline. Its material did not write depth and it was excluded from the cel post pass, allowing foreground machine linework to show across the yellow surface.

A CPU reconstruction of the exact course seed and saved receipt places that beacon at `(18511.793, -926.848)` in X/Z. The captured player is at `(18514.097, -921.308)`: exactly 6 m away, local X −6 m and local Z approximately zero. This intersects the craft's cockpit-to-engine conduit footprint.

The cream angular clusters in sections 05 and 07 come from `GalacticEffectsView`. Both sand-geyser and dust-interference (mapped to sand-geyser by the application) used the same five solid icosahedra as rockfall. They therefore received opaque depth and geometry outlines. This was a live gameplay rendering policy, not a capture-only artifact.

## Changes

- Branch markers are now 3.6 m dark blue/ink assemblies with a small amber lamp, an overhanging hood, and a pedestal. Vertex colors keep each assembly inside one instanced draw. Opaque depth and cel post participation prevent linework behind a marker from leaking across it.
- Placement searches the shoulder near each entrance/exit and rejects any candidate within the width of **any** main-course or branch segment, plus a 3.6 m allowance. It also rejects steep sites or sites over 12 m above/below the entrance. If a junction has no safe candidate, the marker is omitted. Both route guidance draws remain available under their existing world policy.
- All six flagship branch markers find valid sites. The nearest corrected marker is 27.417 m from the saved fork player position, versus 6 m before. Each assembly is 84 triangles.
- Sand and heat hazards now use three staggered, rising billboard lobes with continuous brush noise, feathered edges, darker lower density, and alpha fading. They test world depth, do not write opaque depth, and receive no geometry outlines. Warning footprints keep their original full radius; solid rockfall remains opaque, grounded, and outlined.
- Brief impact washes use a compact flash and broken pressure ring rather than a full solid star-shaped sheet. Sand burst washes use the dust surface treatment.
- Persistent plumes share the existing impact draw. The eight-draw effect budget is unchanged; the billboard pool reserves 72 plume instances plus 16 transient burst instances, each two triangles. No textures or per-frame scene nodes are introduced.

## Verification and limits

23 focused tests pass across `GalacticEffectsView`, `raceCourseView`, and `courseGulfField`. New checks cover dust/rock separation, full warning radius, translucent depth policy, rising motion, mixed plume/burst pool saturation and clearing, marker clearance at a perpendicular junction, and bounded marker dimensions. Typecheck and `git diff --check` pass.

A temporary Vite middleware SSR loader reproduced old/new beacon coordinates and verified both shader-injection sites against Three.js's current Basic shader. It was closed in `finally`; no listening browser session or full build was started by this task.

The actual WebGL compile, transparency appearance, moving occlusion, visual critic review, and frame-rate acceptance are still part of the parent task's next integrated capture. CPU tests and reduced geometry do not establish visual parity or the 40–60 fps target. Billboards use regular world depth testing; this revision does not introduce a scene-depth soft-particle intersection pass.
