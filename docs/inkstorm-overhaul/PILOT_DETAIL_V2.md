# Original Inkstorm pilot detail v2 — isolated Blender study

**Status: geometry and actual study renders completed; premium target acceptance, export, runtime integration and performance are still open.** This changes an isolated Teemto pilot study only. It does not replace any source, public GLB, runtime presentation or Sebulba pilot.

The task responds to [the fresh vehicle critic](BLIND_VEHICLE_STUDY_ROUND22.md). The generator is [`scripts/blender/inkstorm-pilot-v2.py`](../../scripts/blender/inkstorm-pilot-v2.py), SHA-256 `15f771b9006667032e38ec2de21e7ee9ca924c39c91b76b07ca16a171417fb34`. It was executed through Blender MCP using the user's original vehicle request. No image editing was used to produce the study captures.

## Latest actual images

- [Side view, v2c](../../output/vehicles/pilot-v2-review/teemto-side-v2c.png), SHA-256 `7221205fa9634cce014ece2c4f1a65578a61c0361c2d936439bc0383637ce0b2`.
- [Front quarter view, v2c](../../output/vehicles/pilot-v2-review/teemto-front-quarter-v2c.png), SHA-256 `40b6b0b925c14269ea0f36c85a9aabc7eeaeb159e53eea90c0f4c48cffc84432`.

Both are 1400 × 1000 CPU Cycles renders at 24 samples, with copied source-study lighting and the source vehicle visible. They are **Blender study images, not in-game screenshots**. The second camera is `(1.18, .78, .34)`, looking toward `(0, -.035, -.02)`, lens 57 mm. The side camera uses the prior source-study view at `(1.7, .25, .22)`, also 57 mm. Captures named `v2` and `v2b` remain beside these files as failed/intermediate evidence.

## Geometry changes and observed result

The body is built from authored cross-section meshes and swept details, using four material batches. A tapered jacket has a shaped waist and ribcage, panel boundaries, shoulder yokes, pocket welts, center zip and cuffs. Bent sleeves and trousers have restrained low folds, with constructed boots and closure straps. A five-point harness follows the chest and waist, with adjusters, bound edges, a central buckle and seat-contact anchor tabs.

The helmet uses a dome, tapered jaw, an actual shell opening, curved narrow visor, gasket, brow lip, flush chin vents, side hinge hardware, crown seams and narrow orange stripes. The first rendered draft had a tall straight-sided shell and projecting chin box. Those were rejected during self-review and parent review, then replaced. The next render exposed a visor-shell intersection and gaps at the neck and wrists; the v2c captures show those defects corrected.

The gloves have tapered palms, four curved finger groups, a separate opposing thumb and a visible cuff transition. The final side view shows the finger groups wrapping around the source control grips. The inherited hand coordinates were **not** actual contact points: a BVH query against the copied source body found nearest-surface distances of `0.0317605` source units on the left and `0.0258027` on the right. Those coordinates are therefore retained as pose references, while the grasp extends to separate authored grip centers. This corrects the prior claim that merely retaining the old hand anchors proved contact.

The latest result has more legible equipment construction and improved visible control contact. It still falls short of the concept's garment texture, surface wear, nuanced proportions and material separation. The helmet and sleeves remain simplified at close range. One shared dark hardware material covers rubber, harness and visor roles to respect the four-material limit; it does not fully reproduce their distinct target roughness. Source overhead hoses still cross the helmet silhouette, and the cabin remains open behind the driver. Those vehicle changes are outside this isolated pilot task. This self-review does **not** establish a blind-critic pass.

## Executed Blender receipt

Latest scene: `PodRacing — Teemto pilot detail v2`.

| Mesh batch | Triangles | Vertices | Blender mesh validation corrected data |
| --- | ---: | ---: | --- |
| `teemto-pilot-v2-suit.003` | 4,104 | 2,166 | false |
| `teemto-pilot-v2-shell.003` | 1,540 | 836 | false |
| `teemto-pilot-v2-accent.003` | 276 | 160 | false |
| `teemto-pilot-v2-hardware.003` | 2,752 | 1,487 | false |
| **Total** | **8,672** | **4,649** | **No corrections** |

The `.003` suffixes are Blender's global name collision suffixes from preserved earlier drafts. Runtime export must select the latest scene, not search for the unsuffixed first object globally.

There are 138 authored feature additions and 71 copied body meshes. The generator uses no random inputs (`authored-static-v2`) and asserts the pilot stays below 10,500 triangles. Relative to the existing normalized Teemto body count of 43,545 triangles, this pilot would imply 52,217 combined triangles; that is a budget calculation, **not a verified new GLB export**. The pilot remains static and has no animation or skin.

Source-frame anchors, +Y forward and +Z up:

```json
{
  "pelvis": [0, -0.130, -0.205],
  "helmetCenter": [0, -0.160, 0.143],
  "inheritedHandPoseReferences": [[-0.122, 0.103, -0.071], [0.122, 0.103, -0.071]],
  "authoredGripCenters": [[-0.145, 0.153, -0.096], [0.130, 0.153, -0.096]],
  "pilotBounds": [[-0.168174833, -0.236000001, -0.296268255], [0.153174832, 0.303000003, 0.217999995]],
  "pilotMeshes": 4,
  "pilotTriangles": 8672,
  "rendered": true,
  "exported": false,
  "runtimeModified": false
}
```

## Preservation and validation

The generator evaluates `PodRacing — Teemto material study v1` before copying world transforms, avoiding stale matrices from rendering an inactive scene. It copies body mesh data and uses fresh objects, materials and review camera/light data. Source body materials are shared read-only. It never saves a `.blend`, exports scene extras, reads credentials, or changes the source study. The current public Teemto and Sebulba assets remain untouched by this task.

Previous owned study scenes remain: `PodRacing — Teemto pilot detail v2 pre-normal draft`, `PodRacing — Teemto pilot detail v2 first render`, and `PodRacing — Teemto pilot detail v2 second render`. The unrendered first geometry draft had custom loft windings corrected before image review. These scenes are not acceptance candidates.

After construction and each render, the active shared context was restored/verified as `Cruise — Going Merry source 4b2cb678`, `ViewLayer`, active object `Sketchfab_model.001`, with the original 15 selected objects. The script restores exact selection and active object in `finally`. Python syntax compilation and `git diff --check` passed. Blender reported no mesh validation repairs in the final four pilot batches. Those checks do not prove silhouette clearance in every camera, export correctness or runtime performance.

No browser was opened by this task. Blender/GPU ownership was released to the root task after the final two captures. Remaining acceptance: fresh blind image review, richer pilot material treatment and any requested geometry correction, then selected-scene normalization/export, GLB validation, actual runtime views and the full performance gauntlet before replacing the currently shipped candidate.
