# Foundry V2 — one bounded candidate for actual-camera review

V1 remains unchanged in the parent directory. Root rejected its actual image and rolled it back: the plain replacement columns lost the original construction detail, overhead pipes sat too high, and visible dark mouths remained disconnected. V2 directly inspected the V1 and retained baseline `06-foundry.png` images, plus the actual indexed `public/assets/inkstorm/pipe-bank.glb`. No browser, GPU, Blender or download was used.

**Scope:** keep the complete original gantry and every existing rendered plant/collider. Add connected facade headers and three lower mid/far pressure crossings. No gantry filtering, replacement posts, terrain/physics changes or distant launch-basin claim.

## Integration

1. Use this directory's `InkstormFoundry.ts` as `src/render/inkstorm/InkstormFoundry.ts`.
2. Apply only this directory's small `integration-world.diff` to current `InkstormWorld.ts`. It adds one import and the owned structural mesh. Do not copy `world-before.ts` over current root work; that is an audit snapshot only.
3. Capture the same actual foundry camera and approach/exit before any keep decision. V2 has no art or frame-timing acceptance yet.

## What changed from the rejected geometry

- No original artwork is suppressed. The detailed columns, truss, lamps and collision envelopes all remain.
- Pipe starts are now 0.75m inside the measured exported cap. They extend axially along **negative local X**, then bend. V1 instead left along the road-side direction, which ran sideways across the cap.
- The first 17m of each connection transitions from the bank's actual vertical/horizontal aperture scale to the shared header section. This avoids connecting a small circular tube to a vertically stretched opening.
- Lower headers sit 34/39m above the local road reference. Crossings target 34/42/38m, with bounded adjustment where the actual crossed terrain requires clearance. This yields **31.775m minimum vertex/triangle-centroid overhead clearance near the road**, compared with V1's 78.744m.
- The new network has **33 pipe runs, 24 connections on 8 banks, three unequal crossings and one narrow maintenance deck**. Other pipe openings are not claimed to have been connected.

## Exported-geometry evidence

Actual pipe-bank GLB SHA256: `4b3510d0f8b10e1a44158edb0b0bbdc25bac33019176368638937ab1834a3b81`. Its sole node has no transform. Indexed cap triangles independently recover:

| Mouth | Actual glTF center | Radius | Cap triangles | Center error |
|---|---|---:|---:|---:|
| Low return | (-42,7,9) | 3 | 14 | 0 |
| Middle pale elbow | (-38,19,13) | 1.8 | 10 | 0 |
| Upper elbow | (8,30,10) | 2.25 | 12 | 0.000000238m |

`glb-socket-receipt.json` includes exact vertex/triangle indices, bounds, colors and normals. Nine front-facing rays through each actual scaled aperture (center plus eight positions at 80% radius) hit candidate geometry before reaching the original cap: **216/216**. This verifies geometric overlap at the tested points; it does not substitute for rendered visual inspection.

## Budget and checks

- Strict TypeScript/dependency check: **PASS**.
- **20,868 triangles / 62,604 nonindexed vertices / 2,253,744 attribute bytes**, within the staged 24,000-triangle cap.
- One additional opaque merged mesh/material. Zero new textures/lights; no per-frame update or geometry creation.
- Same `InkstormSurfaceMaterial(false)` machinery shader, shared paint/world-shadow/racer-shadow uniforms. Vertex paint: blue `#466879`, rust `#b26642`, bone `#d9c3a1`, iron `#363747`. No workshop bake family.
- Geometry enters the existing world-owned structural array, its disposal path and full-placement static shadow caster path.
- Vertex and triangle-centroid rule: remain at least2m outside the road edge or at least30m above installed terrain. Minimum low geometry clearance is **7.841m**; minimum overhead is **31.775m**. Zero nonfinite values or failed probes. These are discrete checks, not swept-pod or full triangle-volume collision proof.
- Actual camera review must judge whether crossings are visible in depth and whether the aperture joins read as connected pipes. Full-race timing follows only a retained integrated candidate.

Reproduce the CPU audit from repository root:

```sh
python3 assets/source/inkstorm/round30-next-steps/v2/inspect-glb.py
node --loader ./assets/source/inkstorm/round30-next-steps/v2/cpu-loader.mjs ./assets/source/inkstorm/round30-next-steps/v2/audit.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution Bundler --strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters --allowImportingTsExtensions --skipLibCheck assets/source/inkstorm/round30-next-steps/v2/typecheck.ts
```

Runtime/public/docs were not edited by this agent. V1's rejection is retained; V2 is awaiting root-owned actual-image review.
