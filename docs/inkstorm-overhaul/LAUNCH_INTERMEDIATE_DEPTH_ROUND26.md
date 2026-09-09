# Round 26 launch intermediate depth study

Implemented a sparse, view-only family of five full-volume copies of the existing scanned canyon buttress in `src/render/inkstorm/InkstormVista.ts`. The forms occupy basin shoulders and valley edges instead of only decorating ridge tops. The existing signed physical basin, roads, every branch, racing data, camera, founded industrial yards, old ridge accents, and shared rendering/LOD implementation were preserved.

## Composition and limits

Viewed the launch concept and all four `round26-material-v1` launch frames before authoring. That actual view had two broad terrain blocks, tiny ridge accents, and little intermediate overlap. The new forms provide a large near west toe, a separate west valley shelf, an east basin notch, a farther inner west shoulder, and a small crown behind the refinery. Their scale, yaw, lateral position and depth are unequal; they are not a repeated wall. Each whole enclosing footprint remains outside the central 24-degree launch panorama and the founded yard rectangles plus 8 m.

The four new actual game frames show stronger scanned silhouettes in front of the large blocks and nearer overlap through descent. The route markers and existing refinery destination remain readable. This is an incremental improvement. The two broad physical terrain silhouettes still dominate and the basin has much less intermediate hierarchy than the concept. These screenshots are a composition study, not art acceptance or concept parity. The far crown is intentionally small; it is not a second industrial district.

The baseline uses root's material v1; this capture uses root's material v3. Shading changes therefore cannot be attributed to this placement-only task. The added silhouettes and overlaps are the bounded Vista contribution. No camera or render material changes were made here.

## Placement and geometry contract

Coordinates below are metres from the existing physical launch anchor. Positive right is camera-screen right, opposite the course's right vector. The source meshes are the shipped Poly Haven `boulder_01` scan (Rico Cilliers, CC0), already recorded in `assets/source/inkstorm/scanned-geology/public-geology-receipt.json`. No new assets were downloaded or generated.

| Form ID suffix | Forward | Right | Uniform authored scale | Layer | Guard after wide craft and interval debit |
| --- | ---: | ---: | ---: | --- | ---: |
| near-west-toe | 225 | -190 | 0.72 | near | 35.61 m |
| west-valley-shelf | 445 | -430 | 1.10 | middle | 22.94 m |
| east-basin-notch | 430 | 245 | 1.10 | middle | 240.74 m |
| west-inner-shoulder | 735 | -260 | 1.15 | middle | 73.29 m |
| refinery-back-crown | 1160 | 405 | 0.80 | far | 833.25 m |

All five use the same source XYZ proportions with uniform authored scale. Existing grounding buries their toes and extends their bottom; actual rendered vertical-to-horizontal scale ratios range 1.32–1.583. The planner rejects a location if that ratio exceeds 1.75, rather than accepting an arbitrarily stretched facade. Actual low source vertices are below the terrain at every accepted toe tested.

The existing high and low source bounds are `[-40,0,-50]..[40,120,50]`. A disk of radius `hypot(40*s,50*s)` contains all yaw-transformed high/LOD geometry. The planner checks that complete disk against all main and branch segments, including full lane half-width, a 9.6 m wide-craft half-width, the required 7 m scenery guard, and 2 m sampling allowance. This scenery remains an ordinary world mesh with normal depth testing and occlusion; no collision or course visibility shortcuts were added.

Explicit added budget: five instances, at most 140,000 triangles if all five use the 28,000-triangle high mesh, or 21,000 if all use the 4,200-triangle LOD. They join the existing canyon-buttress instance families, source geometries, materials, textures, frustum checks and projected-size LOD. No additional mesh family or per-frame allocation was introduced. The actual launch frame reports 19 total high instances, 6 low instances and 201,832 instanced triangles across the existing world families; that total is not a count of the five additions alone.

## Verification and actual capture

`tests/render/inkstormLaunchDepth.test.ts` parses both actual shipped GLBs through the production GLTFLoader, including accessor strides and mesh scene transforms. It checks every transformed vertex is inside the enclosing disk, outside the central panorama and guarded founded yard rectangles; independently sweeps 16,384 actual main-route samples and 3,761 branch samples at no more than 0.4 m spacing, debiting the whole maximum interval plus width change (0.489726 m); verifies the remaining guard exceeds 7 m after the 9.6 m craft half-width; checks actual toe vertices, bounded proportions and triangle cost; and ensures physical data is unchanged and steep/other-course sites do not gain forms. The old launch ownership test now applies its unchanged low-relief rules specifically to ridge accents, separately from the new depth forms.

Passed typecheck, production build, 19 tests in the four focused launch/Vista/finish files, and `git diff --check`. Initial test development hit the shipped GLB's interleaved 36-byte stride and the app's deliberate lack of Node types; the final test uses the existing narrow dynamic file import and GLTFLoader, with no application type-configuration change.

Ran the existing `scripts/inkstorm-gauntlet.mjs` after root released the shared GPU and froze material/public edits. It produced seven section captures, garage, live drive, and the three supplementary approach/crest/descent views (12 PNGs total), with no page/console errors. Owned browser closed in `finally`; preview port 5186 had no listener afterward. Root and arch agent received GPU release immediately. This short diagnostic capture is not full frame-rate acceptance.

Actual evidence:

- `output/gauntlet/round26-launch-v1/05-launch.png`, progress 0.17968750000000008
- `output/gauntlet/round26-launch-v1/launch-approach.png`, progress 0.153
- `output/gauntlet/round26-launch-v1/launch-crest.png`, progress 0.169
- `output/gauntlet/round26-launch-v1/launch-descent.png`, progress 0.218
- `output/gauntlet/round26-launch-v1/receipts.json`: browser/device/bundle, simulation, world-detail and error receipts
- `output/gauntlet/round26-launch-v1/placement-receipt.json`: exact transforms, conservative clearances, grounding, asset/source hashes, source-map agreement
- `output/gauntlet/round26-launch-v1-build.log`: compiling checkpoint

Captured production bundle: `index-LT9VmgUT.js`, SHA-256 `4e8f9ab57ef0090540c39d98439c09cd506ed769d0c202ca9e3901f808775805`. CSS viewport 1440×900, DPR 1.5, screenshots 2160×1350, Chrome 152.0.7977.77. Source receipt hashes for Vista, basin, grounding, world and shared materials were checked against the exact captured bundle source map. The isolated arch v3 was not integrated.
