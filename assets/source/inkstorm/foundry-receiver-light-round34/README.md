# Foundry contact finish and service-light candidate V1

Prepared 8 September 2026, source-only. **Implemented offline; not installed, rendered, visually accepted or performance-tested.** Root owns actual camera A/B and current pilot/camera work. Apply only `foundry-finish-v1.patch` after reviewing its three isolated source files. Original two source files are preserved under `before/`; public source GLBs remain byte-identical.

## Visual decision

Reviewed actual V9 `06-foundry`, `foundry-middle` and `foundry-exit` captures against original concept06 and construction concept11. This is implementation-aware analysis, not a fresh blind critique. The existing tank bands, supported decks and gantry details are useful, but broad smooth painted surfaces dominate their local connections. Cyan strips mostly read as isolated bright marks. The target uses darker structural junctions and selective cool working planes to separate equipment layers.

This candidate accents the existing vessel shell immediately around actual split-band heights and below the supported decks, then gives the existing cyan strips a finite receiver wash. It is one surface treatment applied only to the pipe-bank and service-gantry materials. It creates no new decorative objects. It does not extend the corridor or solve the terrain/camera occlusion identified by previous reviewers; those remain separate decisions.

The contact term is **authored contact paint**, not sampled AO or a shadow bake. Its maximum attenuation is 46%, restricted to upright tank shell surfaces within 0.55 source units of the actual cylinder radius. Split-band accents fall to zero beyond 1.35 source units; under-deck accents end at the real deck. Original cap, railing and lens paint are excluded by receiver orientation, shell distance and the existing reserved lens-color masks. The cool response uses actual strip centers and extents, inverse-scale normals and 5–8 metre finite ranges. A 2.5 m front-surface depth envelope prevents distant/backside wash; nearby opaque detail does not cast an additional local-light shadow. Actual views must check whether this approximation reveals any bleed or excessive saturation.

## Exact source contract

`InkstormFoundryFinish.ts` is the new small shader helper. `InkstormSurfaceMaterial.ts` accepts a final optional profile, emits one extra `vec3` varying only in the two opted variants, and applies the finish before existing haze/color encoding. `InkstormWorld.ts` selects profiles at the existing family material construction. Original grid gantry, workshop lighting, rocks, foundations, connector mesh, service warm-glass classification and all other materials keep their original paths.

Measured source-local glTF coordinates (X/right, Y/up, Z/module frontage):

| Family | Strip centers | Half widths | World falloff radii |
| --- | --- | --- | --- |
| Pipe bank | (-27,17.6,3.32), (17,24.2,5.32), (25,4.6,16.23), (37,12.1,-4.68) | 2, 2.6, 1.5, 1.2 | 7, 8, 5, 5 m |
| Service gantry | (-46,29,3.42), (46,29,3.42) | 1.25, 1.25 | 7, 7 m |

The source extraction's 12 position clusters are the two ends of six physical strips, not twelve lamps. Existing instance transforms move these points: scale each local coordinate by `p.sx/sy/sz`, rotate about +Y by `p.yaw`, then translate by `(p.x, heightAt(p.x,p.z)-1.5, p.z)`. Those transforms are untouched. The flagged service gantry excludes the original grid's progress .012 presentation.

Shell centers/radii are `(-27,-7)/10`, `(17,-8)/13`, `(37,-11)/6` in local XZ. Their actual source heights are 32/44/22 and decks 24/35/13; split bands are at Y 4, 12 and height−7. Constants come from retained exported geometry and the original authoring script, not from a screen-space panorama.

## Budget and source preservation

- **0 added triangles, draw calls, textures, geometry attributes, uniforms or per-frame JS work.** Existing meshes, normals, UVs, colors, indices and GLB bytes stay untouched.
- Expected **+1 compiled shader program**: pipe bank becomes a distinct variant; the existing warm service-gantry variant becomes its finish variant. This must be verified in the real renderer/context-recovery path.
- Each opted vertex carries three extra varying floats. Each pipe fragment evaluates at most four strip receivers and three shell masks; each service-gantry fragment evaluates two receivers. This adds fragment ALU, with no additional texture reads. No FPS claim follows from this count.
- No changes to course edition, route placement, terrain field, collision proxies, vehicle or AI physics, record keys, preload/disposal paths, budgets or native harness gates. No record migration is warranted for this render-only candidate.

## Completed CPU checks and actual A/B gate

`typecheck-receipt.json`: installed TypeScript7 `--noEmit` PASS for an isolated runtime-source tree with only the three staged files substituted. An initial preparation attempt expected the old TypeScript6 compiler API entry point; that unavailable-entry-point script is retained. The successful check uses the installed native compiler. This is not full `npm run verify` or GPU shader compilation.

`response-evidence.json`: finite normalized response at every triangle centroid of both actual public sources, including pipe scales `(1,1.15,1)` and `(1,1.85,1)` and gantry scale `(.78,1.05,1)` (59,792 centroid evaluations). Pipe cool response >.01 reaches 543/409 non-lamp centroids; contact >.1 reaches 1,640 in each scale. Gantry cool response >.01 reaches 105 centroids. Front-normal response, reversed-normal rejection, finite depth envelope, blank shell and horizontal-cap controls pass. These counts are not projected screen area or proof of visible improvement. The independent CPU analogue is not a GLSL execution.

Root should apply this as one candidate and render the same V9 Foundry main/middle/exit poses plus the approach at the same settings, then inspect whether bands/decks read as supported assemblies and cool patches expose working planes without uniform neon tint. Confirm grid/workshop/terrain unchanged, original warm glass retained, no flicker with camera motion, no light bleeding through equipment, and compilation after context restoration. Run current native technical gates only if the actual visual comparison retains the candidate. Reject it if it merely darkens equipment or creates repeated stripes without clearer construction.

Source evidence and reproducibility: `inspect-lamps.py`, `lamps-evidence.json`, `stage.py`, `check-typecheck.py`, `check-response.py`, `response-evidence.json`, `validation-receipt.json`. No browser, GPU or Blender was used for this task. No commit, push or deployment.
