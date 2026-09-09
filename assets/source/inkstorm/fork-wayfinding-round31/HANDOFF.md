# Fork advance guidance — round 31 source candidate

**Staged only. Not integrated or visually accepted.** Root owns the frozen round30 races. This folder adds no runtime/public/dist edits, road changes, physics, terrain/foundations, camera changes, source-art replacements, textures, canvas work, or per-frame callbacks.

`runtime-candidate.patch` adds one render module and a three-line `InkstormWorld` hook (one import, construction, and conditional append). The existing world road-mesh lifecycle owns material/geometry disposal and shadow-caster cloning. Apply this narrow patch after the round30 freeze; do not replace World with the preserved before-copy. `package-patch.py` can regenerate against a newer World without editing it.

## Purpose and construction

The original `docs/inkstorm-overhaul/concepts/04-fork.png` makes both routes continuous around a central rock. The latest actual `output/gauntlet/round-30-fork-foundry-v3-complete/{04-fork,fork-approach,fork-after-entry}.png` makes the raised deck legible but leaves the lower choice in sand. `BLIND_FORK_FOUNDRY_V3_ROUND30.md` explicitly rejects advance lower-route readability. This is a narrow wayfinding response; signage cannot reveal terrain-hidden road or reproduce the target's architecture.

There is **one** shoulder-mounted directory 175 canonical road metres before `branch-1-shortcut` entry. Its two stems are independently seated into the actual terrain, with a dark painted body and restrained trim. A shared approach divides into cream main-road and cyan bridge paths. Route handedness comes from the actual bridge/main separation in the incoming course basis. The main path is slightly wider. Its open twin lane strokes differ from the bridge's deck-and-piers glyph; the distinction is shape plus color. No text is required to use the diagram. `route-key.svg` is original source artwork illustrating the front view; its labels are editorial and are not runtime decals.

Seven narrow cream confirmation markers follow the real lower-road edges at +35, +75, +120, and +175 canonical metres. One cyan bridge marker sits at routeProgress 0.16, aligned to the actual bridge tangent. Each marker uses a buried foot, continuous stem, small backing, and matching road/bridge glyph. The unsafe main +35 inner placement and later bridge 0.30 placement are deliberately omitted, rather than moved onto another lane or hung above a gulf. Original pylons, chevrons, roads, steel trim, stone foundation and bridge piers remain intact.

The source is flagship-only (`0x494e4b53`); all positions use the actual course/branch points and supplied terrain sampler. It allocates two opaque material groups once during course setup: existing Inkstorm machinery shading for structures and a basic vertex-color material for reflective route graphics. No bloom, outline-based visibility trick, overlay, or render-pass addition is introduced.

## Source checks

`cpu-receipt.json` passes the bounded actual-course audit using signature `2dacfc90` and total length 7646.005613m:

- One advance directory, seven main-road markers, one bridge marker; no station centers closer than 41.50m.
- Every solid's exact XZ bounding rectangle clears **every** continuous segment of the 2048-point main route and exact alternate samples by at least **4.1868m**. This includes sign faces, rolled arrow slats, posts, and feet. It is not just a nearest-route or center-point test.
- Foundation-bottom probes embed in the actual terrain by at least **0.4794m**. Ground variation/gulf guards suppress unsupported placement.
- **780 added triangles, 84,240 attribute bytes, two additional main-pass material draws**, zero allocated textures, zero render-pass additions, zero frame callbacks. Shadow/prepass overhead is not measured here.
- Non-flagship courses produce no geometry. Generated components are finite; two opaque material groups are present.
- The final bounded audit took 0.765s including course/terrain setup and geometry construction. This is a CPU receipt, not race-performance evidence.

`git apply --check` and isolated strict runtime-module TypeScript verification passed after the timing quiet window was released. The source checks were repeated against root’s intentional launch31 CourseGulfField change (`bcffab83...`); fork clearance and geometry counts stayed the same. The final audit includes the 2.5cm separation between the two route colors at their shared diagram root, avoiding coplanar color flicker. The CPU audit itself ran with `tsx`; this checkout has no local Node type definitions, so the isolated tsconfig intentionally typechecks the runtime candidate only, following the existing source-candidate pattern.

## Required integration evidence

Capture ordinary unchanged chase views at entry-relative distances **-325, -275, -225, -175, -100, -45 and +35m**, followed by the existing fork hero/approach/after-entry views. The directory is behind the camera in the late views, so those alone cannot judge an advance cue. At 410km/h, -275m is approximately 2.41s before entry; this is an arithmetic check only, not measured visibility time.

Check that the diagram is unobscured and its two routes can be distinguished before commitment; the glyph directions must match the routes seen by the actual camera. Confirm the cream marker sequence leads the eye through the lower curve without reading as another barrier or noisy specks. Inspect directory scale, pole construction, ground seating, intersection with existing rock/scenery, and the bridge marker's support. Reject or resize a directory that dominates the landscape. Preserve both legal drive paths and the existing fork-foundation contact. Require normal driving, screen-space evidence and a fresh critic before retaining the candidate; this source stage makes no acceptance claim.

Reproduce after the timing window:

```sh
npx --no-install tsx assets/source/inkstorm/fork-wayfinding-round31/audit.ts
node node_modules/typescript/bin/tsc -p assets/source/inkstorm/fork-wayfinding-round31/tsconfig.json
python3 assets/source/inkstorm/fork-wayfinding-round31/package-patch.py
git apply --check assets/source/inkstorm/fork-wayfinding-round31/runtime-candidate.patch
```

The receipt pins the road, branch, height-field, bridge, foundation, camera and material sources used by the static checks. Any change to those placement authorities requires repeating the source checks. This review does not establish clearance from arbitrary scenery triangles or visual visibility.
