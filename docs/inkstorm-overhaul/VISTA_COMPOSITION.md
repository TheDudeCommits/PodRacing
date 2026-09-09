# Inkstorm vista composition — local working change

This bounded pass adds scenic composition to launch, fork and finish. It does not establish concept parity or sustained performance. The supplied concepts and the three corresponding round-9 gameplay screenshots were inspected before authoring.

`src/render/inkstorm/InkstormVista.ts` exports `createInkstormVista(course, heightAt)` and the inspectable `getInkstormVistaPlan(course, heightAt)`. The root agent integrated its returned meshes into `InkstormWorld`'s owned mesh disposal list. All three meshes use vertex colours, `InkstormSurfaceMaterial(false)`, no geometry groups, and the terrain-edge suppression flag. Temporary primitive geometry is disposed after merging. Each returned mesh owns its geometry and material; the caller disposes them.

## What changed

- **Launch:** one broad industrial citadel beyond the playable course in the launch's actual forward view. Its silhouette combines differently sized domed process tanks, asymmetric stacks, crane, support frames, elevated catwalks, front service rooms and a founded terrace. This is a distant visual landmark, not a newly playable destination.
- **Fork:** separate ochre canonical-route and cyan alternate-route arrows point toward actual points on those routes. Their positions follow the branch's actual side. Cyan beacons mark accepted clear positions beside existing branch geometry. No signs or invented branches are added when a course has no branches.
- **Finish:** low segmented outer-curve barriers, upper rails and repeated directional chevrons follow the signed curvature of the real hairpin. These provide an authored racing silhouette and direction cue without changing the racing surface.

The hero course creates **3 draw calls and 9,900 triangles in total**: industrial citadel 4,872; finish barriers 2,880; fork signs/beacons 2,148. This is below the allocated 4-draw / 40,000-triangle ceiling, even if all three merged meshes are visible. These are geometry counts, not a frame-rate result.

The hero plan includes 36 outer-curve barrier segments, 6 route signs and 18 branch-edge beacons. Its citadel center is `(19657.8725, 86.8105, 2042.6232)`, with a 330 m enclosing horizontal radius and approximately 308 m of machinery above the terrace. The launch reference is the actual section capture point at progress `0.1796875`, `(18811.4194, -3.1895, 1320.0276)`, facing `(0.645536, 0.763730)` in X/Z. Root's subsequent combined screenshot review determines whether intervening rock silhouettes need adjustment.

## Clearance and limits

All additions are **render-only scenery**. The barriers and signposts are outside the playable corridors and must not be described as collidable crash barriers. There is no added collision wall, physics authority, lane restriction, checkpoint, terrain deformation or course-controller change.

Each group has a conservative enclosing horizontal disk. Placement checks that disk against all sampled canonical segments and all alternate-route segments, including elevated branches in plan, with the road half-width plus 10 m. The requested safe corridor is width plus 8 m; the additional 2 m covers curve sampling error. A separate test confirms every generated vertex remains inside one of its declared enclosing disks. Dense route and subdivided branch samples independently verify the disks leave the requested safe corridors clear. These tests demonstrate safe playable corridors; they do not prove off-road collision behavior or landmark visibility.

**The true valley descent shown in the launch concept remains absent.** The underlying hills and racing surface are unchanged. The raised founded citadel improves skyline composition but does not recreate that geographical reveal. The fork also retains the existing bridge/canonical-road geometry, and the finish does not gain a newly banked cliffside racing surface.

## Validation

- `npx vitest run tests/render/inkstormVista.test.ts`: **6 tests passed**, including hero, Foundry and procedural seed 1234 corridor checks, geometry containment/budget, real arrow destinations and launch placement beyond the course.
- Narrow `git diff --check` passed for the two new source/test files.
- A read-only Vite module probe measured the hero placement and mesh triangle counts above; its middleware server closed in `finally`.
- No browser, Blender session, full build or full test suite was run by this subtask. Root owns combined build validation, actual screenshots, blind criticism and frame-rate acceptance.

Ownership is released to root. No shared existing source files were edited by this subtask.

## Round-11 directional review

The round-11 finish screenshot showed left-pointing roadside chevrons while the HUD called the bend right. Before changing any rendered arrow, three additional geometry-level projection tests were added. **All nine tests passed against the existing geometry.** The new checks use `PerspectiveCamera.lookAt`, read the actual chevron tip/tail vertices and fork triangle apexes from the merged buffers, and compare their projected directions with the real road tangent or real branch destination. Both mirrored bend directions and both fork-arrow directions are covered. The roadside arrows already followed the visible road correctly.

The disagreement came from the distinction between the course's named right vector `(tangentZ, -tangentX)` and the Three camera's screen-right vector `(-tangentZ, tangentX)`. The existing HUD corner preview classified positive values in the former basis as screen-right. Root owns its presentation correction; blindly flipping the roadside geometry would have pointed away from the real road.

Vista direction metadata now explicitly uses the Three camera screen basis. Finish arrow direction is derived from the actual tangent 55 m ahead; fork direction is derived from its actual target. The conversion back into sign-panel local coordinates is explicit, preserving the correct rendered orientation. No citadel, footprint or terrain geometry was changed in this follow-up. Focused validation remains **9 tests passing**.
