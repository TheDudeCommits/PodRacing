# Teemto authored damage V16 — source and implementation checkpoint

2026-09-09. Blender authoring, export, packaging and renderer integration are executed. Native V16 gameplay, cadence and visual review are pending at this checkpoint. V15's fresh seven-image critic remained **4/10, FAIL 8**; technical recovery evidence did not override that rejection. This prototype addresses the intact-shell/tether silhouette with actual alternative geometry.

## Preserved source and authority

The underlying model is **Teemto Pagalies' Podracer**, UID `4eff45899ada40bb920c5c744663db90`, by **Rafael Fernández Calvo (rafarelo)**, reported **CC BY 4.0** in the preserved official metadata. [Original model](https://sketchfab.com/3d-models/teemto-pagalies-podracer-4eff45899ada40bb920c5c744663db90). Exact metadata, original import and receipt remain in `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/`. This is a modified derivative; published attribution identifies the additional cuts/caps. No new source acquisition or texture generation occurred.

The admitted intact files were copied before authoring and remain byte-identical in public:

| Intact file | SHA-256 |
| --- | --- |
| `teemto-hero-open-v2.glb` | `af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e` |
| `teemto-rival.glb` | `3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f` |

Blender MCP used the original pinned user prompt verbatim. Five isolated persistent scenes increased the actual scene count from 158 to 163: intact hero copy, author A, author B, intact rival copy, rival B. Every actual mutation/render/export receipt records source geometry/corner-normal preservation, prior scene memberships and restored original Cruise/Going Merry context. Temporary render/export scenes were removed. **No shared `.blend` was saved.**

## Actual authored geometry and packages

Hero topology identified two exact 144-triangle long-tether components. A game-space Z=3.5 cut retains short cockpit stubs and creates a separate departing tether mass. The right engine is cut at Z=15.2 into front and rear sections, with bounded jagged edges, inset bevels and dark caps using the original atlas. The two engine boundary loops are individually recessed to avoid coplanar caps. Original mechanical interior surfaces remain visible. The rival is authored from its **own** simplified geometry; it already lacks the hero's long tethers, so only its right engine is replaced.

Original pilot meshes remain separate and are reused by the runtime. No second visible pilot is loaded. The left engine remains intact and participates in the existing rigid opening. Runtime damage meshes have measured pivots and exact names: `teemto-damage-right-front-v16`, `teemto-damage-right-rear-v16`, and hero-only `teemto-damage-cockpit-stubs-v16` / `teemto-damage-severed-tethers-v16`.

| Package | New geometry | Visible whole craft | Resident triangles | Bytes / SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Hero | 30,719 triangles / 4 meshes | 58,624 triangles / 6 body + 6 pilot draws | 88,337 | 1,997,952 / `31cf1c7bfb3ea539d19598b466abd9eaec1b8e5f0c4ece58e9014c686c3c13d8` |
| Rival | 5,786 triangles / 2 meshes | 26,588 triangles / 4 body + 4 pilot draws | 31,966 | 451,628 / `631e8a0e7a2809e0e9e077cebf9306c5b0ad8167980b3394f1cd276f16671e20` |

Final files are in [packaged-b](packaged-b/) and copied to new public URLs `/assets/inkstorm/vehicles/teemto-damage-{hero,rival}-v16.glb`. The 60k hero / 30k rival visible limits are unchanged. Resident statistics disclose both intact and dormant replacement geometry; they are not visible draw counts. Both geometry-only packages retain POSITION/NORMAL/UV0, have no textures or authored material payload, and borrow the matching source cockpit/right-engine CelMaterials. No shader program or material is added for damage.

`package-geometry-b.mjs` merges only bitwise-identical attribute tuples. [Package receipt](package-b-receipt.json) pins identical ordered triangle-position/normal/UV streams before and after the lossless weld. Khronos results have **zero errors and warnings** for both packages. Hero has five informational index-degenerate triangles, all traced to already coincident source triangles in [the lineage audit](degenerate-lineage-audit.json); no cap triangle is among them. UV-unused informational messages are expected in the material-free transport package.

Actual [neutral full view](neutral-b-full.png) and [torn-engine detail](neutral-b-torn-engine.png) were individually inspected. The full view shows the complete posed craft; the detail intentionally crops to the cut. These studio poses establish authored geometry readability only, not gameplay contact, runtime framing, cadence or visual acceptance.

## Renderer behavior and verification

`TeemtoAuthoredDamage` installs only the exact supported two/four-part contract. Bind-time source samples and bounds cover every moving mass and the retained cockpit/pilot. Updates use event-relative age, open over 0.12 simulation seconds, settle the right fragments/tethers over 0.20 seconds and reuse fixed matrices/bounds. Birth and reset restore the exact intact transforms/visibility. Missing or rejected damage loads retain the existing playable rigid-breakup fallback. Simulation, network snapshots and physics are unchanged.

The installed adapter pre-registers fixed beauty/prepass/shadow objects, borrows the existing materials, and releases both leases on cancellation/disposal. It exposes `damageVariantAvailable`, `damageVariantActive`, `damageVariantError` and `residentStatistics`; fallback activation alone cannot satisfy the native authored-damage gate. Exhaust-right FX follows the rear fragment; coupling-right follows the front. Rupture is still an existing exhaust-based visual event, not an asserted fracture collision.

Evidence at source freeze:

- **139 affected tests PASS**, typecheck and scoped diff check PASS. Initial eight source-only mock failures after adding optional URLs are preserved; fixture isolation kept their original ownership/cancellation assertions, and two unmocked tests now load the exact production hero/rival URLs. [Adapter audit](../damage-adapter-v16/damage-adapter-audit.json).
- **Four actual geometry tests PASS**: deterministic random-access ages, exact birth/reset, original pilot identity, attachment transforms, and no runtime vertex reads. Geometry buffers remain shared/unchanged.
- Native ordinary-input terrain trajectory sampled at 48 checkpoints per variant: 4,330,355 hero and 2,185,713 rival visible positions checked. Minimum actual rear-fragment gap ≈0.100m; front 0.158m hero / 0.180m rival; hero tethers 0.180m. No checked visible vertex is buried. Cached support queries per authored update max **210 hero / 169 rival**. These measurements cover this trajectory, not every possible terrain configuration.
- Side and protected chase fitting at 1440:900, 16:9, 390:844 and 844:390 contain all checked source vertices and complete cached bounds: 18,708,648 hero / 9,465,688 rival projected positions/corners. This is CPU containment evidence, not a native camera-quality verdict. [Metrics](geometry-camera-metrics.json), [test output](geometry-camera-metrics.log).

The separate V16 recovery-specific FX patch removes opaque green casing debris from the recovered event and uses two bounded transparent ground pulses; EMP/shield effects remain unchanged. [Recovery audit](../recovery-fx-v16/recovery-fx-audit.json). Its native appearance remains to be reviewed with the damage sequence.

## Preserved failures and remaining review

The first Blender author call failed because Blender 5.2's tessellator returned indices; it rolled back and is retained as `author-a-failure.txt`. Author A remains preserved; B staggers the cap recesses. A private hero-to-rival simplification trial could not meet the existing rival budget and is retained as `rival-simplification-failed.json`; the final rival instead uses its own source geometry. The rival export receipt has an inherited “export A” stage label; its actual source scene, output path and package clearly identify rival B.

Native V16 must still show actual damage activation, legible split/caps/tethers and fire, source-pilot safety, ground appearance, clean matte/recovery, normal driving after reset and fallback behavior. Dark cuts and thin rods may read differently in game lighting. First GPU upload of dormant geometry and concurrent AI wreck cadence are unmeasured here. No fresh V16 critic or art pass is claimed. The larger original overhaul remains incomplete.

[Actual source-stage inventory and hashes](actual-stage-inventory.json).
