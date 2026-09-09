# Foundry V3 — complete continuous-chicane coverage candidate

V2 is preserved byte-exact in `../v2/`. The actual V2 middle and exit screenshots were directly inspected: visible downstream tank mouths remain open after the near network ends. This bounded V3 extends coverage; it makes no acceptance claim.

## Scope and integration

- Cover **all18 actual pipe banks /54 mouths**, up from V2's8banks/24mouths. Add the later same-side headers and two farther crossings while retaining the original three crossings.
- Apply only `integration-module.diff`, or replace only `src/render/inkstorm/InkstormFoundry.ts` with this directory's candidate. **No world-hook change is required**: root's existing V2 hook already owns this single structural mesh. `module-before.ts` is a snapshot, not an integration target.
- Runtime/public/docs were not edited. No browser/GPU/Blender/network work occurred. Actual source GLB and all original gantry/machinery/terrain/collision geometry remain unchanged.

## Preservation and total budget

All **52 V2 plan parts** are identical. All **20,868 V2 triangles** are present with byte-identical Float32 positions, normals and colors in the merged V3 output. Their ordering changes as the additional bank connections are inserted; geometry does not.

V3 total: **75 pipe runs,5 crossings,19 deck/rail boxes,46,788triangles,140,364vertices,5,053,104attribute bytes**. Added beyond V2:25,920triangles and2,799,360attribute bytes. One merged opaque mesh/material remains; no extra textures/lights or frame updates. The extension budget is50,000triangles, explicitly larger than V2's24,000 cap because it covers18banks instead of8. These are CPU geometry/attribute costs, not GPU allocation or frame timing.

The shader remains `InkstormSurfaceMaterial(false)` with the same shared machinery paint, world/racer shadows and vertex colors as V2. The existing structural mesh lifetime and shadow path remain unchanged.

## Validation and retained failure

- Strict TypeScript/dependency check: **PASS**.
- All54 scaled mouth attachments: **486/486 front-facing CPU rays** hit the new geometry before the original cap. Exact exported cap evidence remains in `../v2/glb-socket-receipt.json`; the public GLB hash is unchanged.
- Nearest-projection vertex/triangle-centroid audit passes with no nonfinite values. This alone was insufficient around the later switchback.
- The independent adjacent-route audit checks **all4,168 main/branch segments**, using4,096 main rows and every actual branch row. Every nearby conservative road capsule is tested, rather than just whichever path projects nearest. **7,663,806 candidate/segment probes pass**; minimum overhead within the7m road margin is**33.887m**, and minimum low-geometry clearance is**17.710m** in that expanded audit. These discrete tests do not prove swept-pod or full triangle-volume clearance.
- The first expanded audit failed: one new crossing dipped to**28.061m** above an adjacent legal road, although the nearest-terrain check passed. Exact first source, plan, log and failed receipt remain in `attempt-1-adjacent-clearance/`. V3 now bounds only its new crossings against all adjacent legal rows with a37m reference clearance. V2's crossings/geometry remain exact. The corrected audit passes without loosening its30m requirement.
- All existing collision placements, route/gulf/terrain geometry and normals are unedited. Root should run actual middle/exit captures and input through the full chicane; same-camera A/B and full-race timing remain required before retaining it.

CPU audit:

```sh
node --loader ./assets/source/inkstorm/round30-next-steps/v3/cpu-loader.mjs ./assets/source/inkstorm/round30-next-steps/v3/audit.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution Bundler --strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters --allowImportingTsExtensions --skipLibCheck assets/source/inkstorm/round30-next-steps/v3/typecheck.ts
```

`plan.json` lists every new connection. `cpu-receipt.json` includes bank coverage, V2 triangle preservation, attachment rays, total budget and adjacent-route results. V3 awaits root-owned actual-image review and timing; it does not solve the remaining distant launch-basin composition.
