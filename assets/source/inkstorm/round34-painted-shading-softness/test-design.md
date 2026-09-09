# Painted shading CPU test design

Prepared by the independent test-design subagent on 2026-09-08. No live source or tests were edited; no tests, build, browser, or renderer were run.

## Prepared additions

- `prepared-tests/celPaintedShading.test.ts` is intended for `tests/materials/celPaintedShading.test.ts` and uses imports relative to that destination.
- `prepared-tests/importedVehiclePresentation.paintedShading.fragment.txt` is intended to be appended to `tests/render/importedVehiclePresentation.test.ts`; it uses that file's existing imports.

The prepared cases exercise the parent's chosen contract: finite softness in [0,1]; unchanged omitted/zero shader, uniform keys and ramp; bounded smoothstep ramp transitions in the existing nearest-filtered 256 by 1 lookup; a positive-only uniform and separate fragment path; preserved wear/maps/roughness; `setPalette` retaining softness and ramp identity; exact-name style matching; independent leases and failed replacement cleanup.

## Existing helper patterns used

- `tests/materials/celMaterials.test.ts:30`: `textureBytes` reads actual `Uint8Array` image data. Existing hard transitions sample `(x + .5) / resolution`, so fixed 256-pixel legacy oracles use 51/77/77/51 runs at [.2,.5,.8], and 64/128/64 runs at [.25,.75].
- `tests/render/vehicleArtFixtures.ts:12` and `:16`: `source` and `artFixture` supply two meshes sharing one material/geometry/map, with source disposal spies.
- `tests/render/importedVehiclePresentation.test.ts:317`: exact material name, suffix and case mismatch checks with per-presentation defaults; `:395`: styled and unstyled leases sharing one source; `:424`: invalid bounded scalar replacement retains prior geometry and releases candidate resources.
- `tests/materials/celTexturedMaterial.test.ts:14` and `tests/materials/celSurfaceMaps.test.ts:17`: compare copied UV transforms and borrowed texture identity, and spy on disposal ownership.

## Limits and implementation cautions

The positive shader checks establish binding and source-path contracts only. They do not execute GLSL, prove visible specular softness, or establish GPU parity. Rendered shader compilation and image judgment remain with the runtime owner. The tests deliberately do not add a duplicate JavaScript implementation of the specular formula.

The legacy shader uses wear for both two extra diffuse ramp samples and its specular blend. Preserve the original shader string verbatim for omitted/zero softness; keep the new fragment's wear-dependent paint/noise treatment while removing only the old ramp-blur block. Direct `CelMaterial` currently permits wear values beyond one; the legacy parity table includes wear 1.5 to catch a newly introduced clamp on that path.

The invalid-material test spies on the exported ramp/matcap factories to enforce rejection before owned texture allocation. These follow Vitest's normal ESM spy behavior; the owner must run them after integrating the source changes. No passing result is claimed here.
