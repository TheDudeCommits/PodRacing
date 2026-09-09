"""Private documentation candidates only. Does not apply files to repository destinations."""
import copy,hashlib,json
from pathlib import Path
ROOT=Path('/Users/amir/Projects/PodRacing')
OUT=Path(__file__).resolve().parent
BACK=ROOT/'docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation'
S='assets/source/inkstorm/blockrunner-round34'
P=S+'/runtime-admission-preparation/packaged-atlas-v6-v1'
AD='output/gauntlet/round34-blockrunner-admission-v1'
BUNDLE='index-Cnysa7ZZ.js'
BSHA='10ef7eb7189f407f530f73e802cdbc59acc1ebd47f5cfb2a26e3341e3b9bb04e'
TESTS=671;TESTFILES=120;BUNDLE_BYTES=1619624
TAIL_SHA='ae67e1e01f16a115cbecbe514529e50a2d1bb450e7605f323471a7b332cc726b'
source_snapshot=json.loads((BACK/'inventory.json').read_text())
for item in source_snapshot['files']:
 raw=(ROOT/item['preserved']).read_bytes();assert len(raw)==item['bytes'] and hashlib.sha256(raw).hexdigest()==item['sha256']
 assert (ROOT/item['source']).read_bytes()==raw, ('Live documentation changed since preserved snapshot',item['source'])
tail=(BACK/'HANDOVER.md').read_bytes()[-9333:];assert hashlib.sha256(tail).hexdigest()==TAIL_SHA and tail.startswith(b'## Links and source state')
public_receipt=json.loads((ROOT/AD/'public-admission.json').read_text())
packages={}
for kind in ['hero','rival']:
 d=json.loads((ROOT/P/f'blockrunner-{kind}-v1.package-receipt.json').read_text());path=ROOT/f'public/assets/inkstorm/vehicles/blockrunner-{kind}-v1.glb';raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==d['sha256'] and len(raw)==d['bytes'];packages[kind]=d
 assert json.loads((ROOT/P/f'blockrunner-{kind}-v1.khronos.json').read_text())['issues']['numErrors']==0
 assert json.loads((ROOT/P/f'blockrunner-{kind}-v1.khronos.json').read_text())['issues']['numWarnings']==0
capture=json.loads((ROOT/AD/'captures-framing-v3/receipts.json').read_text());assert capture['errors']==[]
assert capture['environment']['scripts'][0]['sha256']==BSHA
assert len(list((ROOT/AD/'captures-framing-v3').glob('*.png')))==13
facts={'status':'PRIVATE DRAFT; do not apply until root supplies final performance and critic facts','bundle':BUNDLE,'bundleBytes':BUNDLE_BYTES,'bundleSha256':BSHA,'verification':{'tests':TESTS,'files':TESTFILES,'outcome':'PASS','log':AD+'/verify-framing-v3.log'},'captures':{'directory':AD+'/captures-framing-v3','pngs':13,'errors':[],'receipt':AD+'/captures-framing-v3/receipts.json'},'coverage':{'sourceFamilies':26,'runtimeFamilies':4,'logicalHeroRivalVariants':8,'preservedPublicGlbs':12,'projectDriversAdded':3,'originalSourceDriversRetained':1,'runtimePreparationPending':22},'sourceScenes':152,'finalFullRacePerformance':None,'finalCritic':None,'finalFrozenInventory':None,'finalCleanupEvidence':None,'rootApplyGo':False}
(OUT/'draft-facts.json').write_text(json.dumps(facts,indent=2)+'\n')
PERF='**Final full-race, section/context/resource checks and frozen evidence inventory: PENDING ROOT FINAL FACTS.** The build/capture pass below does not substitute for these checks.'
CRITIC='The completed V1 in-game review remains **5.5/10 selected craft / 6/10 world, FAIL**. It is independent but **not fresh blind** because the reviewer previously saw limited aperture/catalogue implementation context; the agent limit prevented a new reviewer. V3 camera changes are captured; their final review is **PENDING ROOT FINAL FACTS**. No final art PASS is claimed.'
BLINE=f'Current V3 build: **{BUNDLE}**, **{BUNDLE_BYTES:,} bytes**, SHA256 `{BSHA}`; **{TESTS} tests / {TESTFILES} files**, typecheck and build PASS. [Verification](../../{AD}/verify-framing-v3.log).'
COUNTS='**26 preserved source families; four registered families (Teemto, Sebulba, Polwo, Blockrunner), eight logical hero/rival variants, 12 preserved public GLBs, three project drivers added, and 22 source families pending runtime preparation.** Blockrunner retains its original minifigure pilot; it is not a fourth added driver. All 26 saved catalogue downloads are complete; source GLBs total 748,730,812 bytes.'
HIST='The earlier round34 foundation-material V1 build `index-DAcqiho8.js` (1,617,115 bytes, SHA256 `3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a`) and its 648-test/two-Polwo-race technical PASS remain **frozen historical evidence**, not current-dist verification. [Exact historical performance](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md). Round32 remains the prior three-appearance/six-race matrix; later representative runs do not repeat that entire matrix.'
files={}
files['HANDOVER.md']=f'''# PodRacing handover — round34 Blockrunner admission

**The full Inkstorm overhaul remains incomplete.** Colour Blockrunner is now the fourth locally registered family, using the actual V6 atlas packages and its original minifigure pilot. Final art is not accepted. Current V3 build **{BUNDLE}**, **{BUNDLE_BYTES:,} bytes**, SHA256 `{BSHA}` passes **{TESTS} tests / {TESTFILES} files**, typecheck/build and 13 error-free runtime captures.

{PERF}

Work in **/Users/amir/Projects/PodRacing**, branch **codex/now-this-is-podracing**, baseline **0f0e8ab209cc5156efaf92b545630bd243b14478**; remote TheDudeCommits/PodRacing. The task folder `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all uncommitted work. No overhaul commit, push or deployment has occurred.

The user approved recommendations 1–8, art **B / Inkstorm**, all downloaded catalogue vehicles with drivers, Blender MCP/imagegen, independent criticism and 40–60fps. [STATUS](docs/inkstorm-overhaul/STATUS.md) owns acceptance and remaining scope; [ROUND34](docs/inkstorm-overhaul/ROUND34.md) owns this runtime revision and exact technical evidence; [CURRENT_VISUALS](docs/inkstorm-overhaul/CURRENT_VISUALS.md) owns current images; [Blockrunner source record](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md) owns preparation/provenance; [catalogue](docs/inkstorm-overhaul/VEHICLE_CATALOG.md) and its manifest own vehicle counts and licence boundaries.

{COUNTS}

The V6 hero/rival public files are 3,693,000 / 3,228,580 bytes and 44,028 / 29,682 triangles, each with the same 4,128-triangle original pilot and five material submissions before extra passes. Normalization, source-preserving control fit, baked palette/wear, derivative LOD and ClampToEdge are recorded by actual receipts. Their registration is separate from final gameplay and art acceptance. [Source/export/package scope](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md).

{CRITIC}

The previous foundation-material V1 freeze and its performance results are historical; do not describe `index-DAcqiho8.js` as current. [Preserved report](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md). The seven pre-admission documents/manifest are [byte-preserved](docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).

Blender has **152 preserved scenes**, ending with the isolated normalized V6 export; source, cleanup, control-fit and paint histories remain. Restore original **Cruise — Going Merry source 4b2cb678**, its ViewLayer, active **Sketchfab_model.001** and exact 15-object selection after every call. Never save the shared `.blend`. Structural FNV checks and separate source-file SHA256 receipts have their recorded scope; preserve the earlier Ben-import membership observation. Keep the NoDerivs source private and do not blindly stage the source archive.

Continue with the remaining visual material/framing/world gaps and the other 22 families; the ivory variant needs independent source references because its beam placement, triangulation and normals differ. Retain deterministic simulation/network/terrain authority, course9/drive4/rules2 and existing driving classes. Human/controller/audio, full championship balance, other-device and multiplayer acceptance remain open. Close every owned browser immediately after use; never adopt or signal unrelated port5211. Current final cleanup details remain pending with the final performance evidence.

## Archived pre-overhaul product handover — preserved verbatim

The following 9,333 bytes are historical, including their old counts, “current” wording and asset restrictions. They are retained for provenance; the active scope and evidence above take precedence.

'''.encode()+tail
files['docs/inkstorm-overhaul/STATUS.md']=f'''# Inkstorm implementation and acceptance — round34

**The full request is incomplete; final art remains unaccepted.** Direction B / Inkstorm. The active revision adds local Blockrunner registration, measured exhaust-aperture handling, and V3 chase/garage framing to the earlier Foundry corridor, hoist V3, solid effects V2 and foundation material work.

{BLINE}

{PERF}

{CRITIC}

{COUNTS}

## Acceptance by work package

| Work package | Implemented locally | Still open |
| --- | --- | --- |
| Driving | Four existing classes, input-only benchmark laps, AI recovery, chase/grade preview and flight lesson. | Human/controller handling, comfort and medal balance. |
| Authored circuit | Fixed 7,646m flagship, seven sections, branches, supported shortcut, physical launch basin and finish gulf; shared terrain/physics. | Seven original world targets remain unaccepted; fork/launch/finish composition and retaining construction. |
| Asset production | 26 official source GLBs preserved; original environment/LOD pipeline and lazy loading with failure handling. | 22 remaining vehicle families, source-specific driver/anchor preparation and final textures/materials. |
| Hero vehicles | Teemto, Sebulba, Polwo and Blockrunner hero/rival registration; original Blockrunner driver retained. | Current craft material readability, final visual gate, full lifecycle/performance scope pending below. |
| World/lighting | Authored industrial modules, terrain/rock LOD, shared scenery shadows, Foundry landforms, hoist and metre-scaled foundation wear. | Ground contacts, varied process assemblies, geological depth, selective light and target parity. |
| HUD/garage | Selection, inspection, Workshop/events, visible launch, pause/results flows; Blockrunner front inspection/framing. | Final accessibility and human readability; no touch-driving adapter. |
| Replayability | Versioned local PBs/ghosts/history, Time Attack, Flight School, three-round Cup, UTC Daily Flight; Expedition/multiplayer retained. | Full championship study, long-session balance and server-verified competition. |
| Sensory | Engine identities, spatial responses, synthesized score and comfort settings. | Critical direct headphone audition, controller feel and final mix. |

The V6 source work fixes exact opposing-face artifacts, fits the existing controls to the original pilot, consolidates geometry, bakes geometry-aware paint and corrects a measured atlas wrap seam. These are bounded source outcomes; narrow cleanup 8.5/10 and static fit 8/10 passes do not accept finished in-game art. [Source record](BLOCKRUNNER_CLEANUP_ROUND34.md) · [Current images](CURRENT_VISUALS.md) · [Round evidence](ROUND34.md) · [Catalogue/licences](VEHICLE_CATALOG.md).

{HIST}

Keep the original seven world concepts and supplemental12/13 distinct from actual screenshots. Staged stills do not prove motion, FPS or complete races; local adaptive timing does not prove fixed-DPR or other-device performance. Work is local/uncommitted on `codex/now-this-is-podracing`; no overhaul release. Preserve all prior failures and the [pre-admission documents](evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).
'''
files['docs/inkstorm-overhaul/ROUND34.md']=f'''# Round34 — Blockrunner registration and current evidence

Colour Blockrunner is now locally registered with its V6 hero/rival packages and original source pilot. The current runtime also retains the earlier Foundry corridor, hoist V3, solid effects V2 and foundation material-coordinate correction. **Final art is unaccepted; the full overhaul remains incomplete.**

{BLINE}

{PERF}

## Current runtime scope

Blockrunner uses the existing podracer class and lazy imported-asset path. Its two public packages retain the original pilot, source silhouette, physical engine crossbeam and measured nozzle openings. Hero/rival geometry is 44,028 / 29,682 triangles; the 4,128-triangle pilot is unchanged by rival simplification. Each uses one body/four pilot material submissions, four baked images and no normal map. [Exact source, LOD and package receipts](BLOCKRUNNER_CLEANUP_ROUND34.md).

An optional per-asset exhaust aperture scales the existing procedural flames; omitted metadata preserves the earlier `.54` radial scale. Blockrunner uses a conservative 0.34m aperture within its measured approximately0.346m inner throat. It omits duplicate generic nozzle lips and energy coupling because the source has authored exhaust hardware and a rigid crossbeam. Cached presentation state changes atomically; simulation, flame geometry/shaders and axial animation remain authoritative in their existing systems. The [independent code review](BLOCKRUNNER_RUNTIME_CODE_REVIEW_ROUND34.md) found no confirmed regression, while explicitly distinguishing synthetic contract tests from decoded package and GPU evidence.

The first in-game V1 captures exposed engine occlusion in chase and a small rear-facing garage presentation. V2 raised the chase framing to 4.8 and added front inspection; V3 uses the shallower garage view `(-1.8,.45,.65)`. These presentation changes preserve the vehicle source/geometry and driving editions. Their actual 13-image V3 capture is error-free; [receipt](../../{AD}/captures-framing-v3/receipts.json), [gallery](CURRENT_VISUALS.md). A staged410KPH/zero-clock section is a still, not a normal-speed race. The separate short ordinary Start/W frame is not a full-race result.

## Visual acceptance

{CRITIC}

[Completed V1 review](BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md) covers 13 actual captures and eight targets. It identifies weak craft/engine framing, flat paint/material response, insufficient garage inspection and incomplete world depth/landmark payoff. The earlier fresh foundation/world6.5FAIL and effects6FAIL retain their own scope. Different reviewers' numbers are not an objective improvement curve. No original world target is accepted merely by source or technical progress.

## Source and package checkpoint

{COUNTS}

Blender now contains 152 scenes, including every earlier source/cleanup/fit/paint revision and the normalized V6 export. Original source, selected retained corner normals, loop/triangle lineage, masks, palette/response inputs and packed image identities are guarded across the applicable stages. The author and export records retain their exact scope and the small declared DCC normal-encoding budget. No shared `.blend` save occurred. [Authoring details and preserved failures](BLOCKRUNNER_CLEANUP_ROUND34.md).

## Historical foundation checkpoint

{HIST}

The foundation-only material branch corrected unit-box paint stretched across94m supports by using physical instance-axis lengths; it did not change foundation geometry/placement. The earlier corridor added ten grounded landforms through existing batches; solid effects revised opaque pickup/mine hardware and five-chunk rubble while retaining gameplay radii/events. Terrain authority, course9/drive4/rules2 and the course layout remain unchanged. The earlier detailed chronology is preserved in the [pre-admission round document](evidence/round-34/pre-blockrunner-admission-documentation/ROUND34.md), along with its source-clearance and resource evidence.

The frozen historical foundation report records local adaptive Polwo Time Attack/Canyon Cup/Continue, seven sections, context recovery and three resource cycles. It cannot verify the new Blockrunner files or current bundle. Prior context-readiness failures, staged-effects timing limitations, renderer counters above the600k target and earlier round31/32/33 snapshots remain preserved.

## Continuation and operational state

Final V3 full-race/performance/frozen-inventory/cleanup results will be inserted only from actual receipts. No final FPS or universal-device claim is made in this draft. Complete craft/world art revision, then the remaining22 source families. Ivory Blockrunner can reuse algorithms and mapped pilot semantics, but has different beam placement, triangulation and normals; [measured comparison](../../{S}/IVORY_VARIANT_SOURCE_COMPARISON.md).

No overhaul commit, push or deployment. Close owned browsers and ports immediately; never adopt unrelated5211. Preserve source licences, NoDerivs restrictions, all prior failures and the original Cruise scene/selection. [Seven preserved pre-admission documents](evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).
'''
files['docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md']=f'''# Blockrunner source, packages and registration — round34

**Colour Blockrunner now has locally registered V6 hero/rival packages and retains its original minifigure pilot.** This is the fourth family, not a fourth project driver. Final in-game art remains unaccepted. Source work ends at152 preserved Blender scenes; the full runtime/performance checkpoint is recorded separately in [ROUND34](ROUND34.md).

Source UID `a6f14ae799ab40d7ac425f043f824ff8`, **Pod Racer Colour**, author **20001748**, **CC BY4.0**. The preserved2,667,212-byte [source GLB](../../assets/source/inkstorm/vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb) has SHA256 `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`. Official metadata, independent variant identities and licence restrictions remain in the [catalogue](VEHICLE_CATALOG.md) and manifest. No original vendor archive is claimed.

## Actual source stages

| Stage | Measured result | Evidence |
| --- | --- | --- |
| Original audit | 268 objects,59 mesh occurrences,48,384 instantiated triangles; four neutral views. | [Audit](../../{S}/mcp-safe/audit-receipt.json) |
| Exact opposing-face cleanup | Removes4,828 duplicate triangles only in five meshes;43,556 remain. Pilot8,256→4,128. Source coordinates, selected normals and holes preserved. | [Cleanup receipt](../../{S}/mcp-safe/cleanup-v1-receipt.json) |
| Control fit V1 | Two shortened source-profile grips and two side mounts;61 meshes/44,028 triangles. Original pilot and other56 objects unchanged. Full-length leg-intersecting trial preserved. | [Executed fit](../../{S}/CONTROL_FIT_V1_EXECUTED.md) |
| Paint V2/V4/V4B | Consolidates into two owners; effective winding for7,172 mirrored triangles retained; source-lineage masks and baked palette/roughness. V4B breaks repeated wear rings/stripes. | [Stage summary and failures](../../{S}/SOURCE_PAINT_STAGE_SUMMARY_ROUND34.md) |
| Atlas V5/V6 | One body/four pilot atlas materials. V6 changes only ten texture extension flags to fix a measured border-wrap stud seam; no rebake/UV/normal repair. | [Executed V6 review](../../{S}/V6_EXECUTED_SOURCE_REVIEW.md) |
| Private normalized V6 export |152 scenes; preserves all151 earlier scenes/context. Exactly-once artist scale1.6, game+Zforward/+Yup; no shared blend save. | [Export receipt](../../{S}/runtime-admission-preparation/export-atlas-v6-v1-receipt.json) |

The DCC consolidation uses an explicit0.1° normal-encoding budget after a preserved stricter failure; actual V2 maxima are approximately0.07174° body and0.03010° pilot. Original requested world normals were re-fed after UV authoring, and later exact-copy stages do not re-encode them. These limits are distinct from immutable original-source/fit signatures. Mask attributes are removed only from the export copy after baking to prevent unintended vertex-colour tint; authoring histories retain them.

The V6 driver seam ROI changed from22.073% darker than adjacent ivory to effectively no deficit; actual V5/V6 cameras match. The exported sampler is explicitly ClampToEdge in both axes. Source stage inventories record FNV structure/mask/packed-image guards separately from file SHA256 provenance. They do not claim byte identity of every Blender property or all-lighting art acceptance.

## Actual public packages

| Variant | Bytes | Triangles: body + original pilot | Base-colour / roughness sizes | SHA256 |
| --- | ---: | ---: | --- | --- |
| [Hero](../../public/assets/inkstorm/vehicles/blockrunner-hero-v1.glb) |3,693,000|39,900+4,128=44,028|Both owners1024² /512²|`7eeca075e2a8ea9b1b11e381ff447d6ec7bb83d8f73f6ddb41f843b4cbadfeb4`|
| [Rival](../../public/assets/inkstorm/vehicles/blockrunner-rival-v1.glb) |3,228,580|25,554+4,128=29,682|Both owners512² /256²|`ae90b8f56c2ebca7e128aeee14c6a6e5c59d473a6a0898f8fc64dfbfc283342a`|

Both packages have five material submissions before extra render passes, four images, no normal map and identity mesh-root transforms. Estimated RGBA8 full mip allocation is13,981,008 /3,495,248 bytes. Khronos validation reports zero errors/warnings for both, and the local public bytes match their actual package receipts. [Hero receipt](../../{P}/blockrunner-hero-v1.package-receipt.json) · [Rival receipt](../../{P}/blockrunner-rival-v1.package-receipt.json) · [Public admission](../../{AD}/public-admission.json).

The source pilot datum is positioned at game Z−5.2; exported bounds are approximately9.39×5.05×19.2m. This scale is an explicit presentation choice, not canonical vehicle size. The inner nozzle radius measures approximately0.346m; runtime metadata uses conservative0.34m. Existing physical crossbeam/nozzle hardware suppress duplicate coupling/lips. Geometry, anchors and the current game's visual performance must be assessed through their own evidence.

## Acceptance and preserved source identity

Narrow fresh source cleanup8.5PASS and static control fit8PASS remain bounded historical results. Earlier paint criticism, V4/V4B self-review and V6 seam verification are separately scoped; no self-score replaces a fresh blind final gate. {CRITIC}

The [current runtime gallery](CURRENT_VISUALS.md) and [round checkpoint](ROUND34.md) own current images/build/performance. The ivory source `e42fb924b344481ea013c58cb0f52ad7` remains one of22 pending families: its whole pilot maps, but two beam halves differ in placement and87 triangles use alternate triangulation. [Numeric comparison and reuse boundaries](../../{S}/IVORY_VARIANT_SOURCE_COMPARISON.md). Retain both original files and each source's own normals/lineage.

Restore the original Cruise scene/layer/active object/15-object selection after every Blender operation, remove temporary render data, and never save the shared `.blend`. All earlier source/cleanup/fit/paint revisions and failures are retained; [pre-admission source document](evidence/round-34/pre-blockrunner-admission-documentation/BLOCKRUNNER_CLEANUP_ROUND34.md) preserves the longer preceding chronology.
'''
# The runtime gallery has one job: identify the actual current image bytes and scope.
shots=[('Garage','garage'),('Grid','01-grid'),('Salt run','02-salt-run'),('Canyon','03-canyon'),('Fork','04-fork'),('Launch','05-launch'),('Foundry','06-foundry'),('Foundry approach','foundry-approach'),('Foundry near span','foundry-near-span'),('Foundry middle','foundry-middle'),('Foundry exit','foundry-exit'),('Finish','07-finish'),('Short ordinary Start/W capture','live-drive')]
gallery=f'''# Current Inkstorm runtime images — Blockrunner V3

These **13 unedited actual game PNGs** come from `{BUNDLE}`, SHA256 `{BSHA}`, at1440×900 CSS/DPR1.5. [Actual capture receipt](../../{AD}/captures-framing-v3/receipts.json) records zero errors. The chase framing is4.8; V3 garage uses the shallower front view `(-1.8,.45,.65)`. These images supersede the foundation-material gallery as the current runtime presentation.

{CRITIC}

{PERF}

Section stills showing410KPH/zero clock are staged, not live-race or FPS evidence. The short ordinary Start/W image is also not a complete-race result. [Current implementation and technical scope](ROUND34.md) · [Acceptance](STATUS.md).

'''
for title,name in shots:gallery+=f'## {title}\n\n![{title} — actual V3 runtime](../../{AD}/captures-framing-v3/{name}.png)\n\n'
gallery+=f'''## Separate source and target references

[Actual V6 neutral driver source comparison](../../{S}/paint-v1-driver-20260908-round34-clamp-v6.png) verifies the atlas wrap seam under matched source lighting; it is not a game screenshot. [Executed scope](../../{S}/V6_EXECUTED_SOURCE_REVIEW.md).

[Supplemental Blockrunner concept12](concepts/12-blockrunner-round34.png) is generated art direction. Its invented rear inset is not source geometry or anchor authority. Original world concepts01–07 remain unchanged and unaccepted. The [previous foundation gallery document](evidence/round-34/pre-blockrunner-admission-documentation/CURRENT_VISUALS.md) and its original image files remain historical evidence.
'''
files['docs/inkstorm-overhaul/CURRENT_VISUALS.md']=gallery
catalogue=(BACK/'VEHICLE_CATALOG.md').read_text();table=catalogue.split('## Complete catalogue',1)[1].split('## Driver, material and distribution boundaries',1)[0]
lines=table.splitlines()
for i,line in enumerate(lines):
 if '| 22 |' in line:
  line=line.replace('Runtime pending. Minifigure driver visible; fit/style pending. Variant retained.','Blockrunner V6 hero/rival packages publicly copied and locally registered; original minifigure retained. Exact cleanup, fitted controls, baked paint/roughness and ClampToEdge complete. Final in-game art unaccepted; current technical scope in [ROUND34](ROUND34.md). Variant retained.');lines[i]=line
 if '| 23 |' in line:
  line=line.replace('Runtime pending. Minifigure driver visible; fit/style pending. Variant retained.','Runtime pending; original minifigure confirmed. External comparison finds different beam placement, topology and normals; preserve its own source. [Reuse boundaries](../../'+S+'/IVORY_VARIANT_SOURCE_COMPARISON.md). Variant retained.');lines[i]=line
catalogue=f'''# Sketchfab vehicle catalogue and ingestion status

Updated from preserved official acquisition, source and actual Blockrunner V6 export/package/public-copy receipts. This documentation pass makes no network, Blender, browser or source-binary change. The prior seven documents/manifest are [byte-preserved](evidence/round-34/pre-blockrunner-admission-documentation/inventory.json); all earlier manifest histories remain retained.

{COUNTS}

The saved downloadable `podracer` search contains29 results,26 candidates and three explicit exclusions. Zero downloads are pending; zero raw vendor archives were retained. These counts describe the saved catalogue, not every model on Sketchfab. Formal occupancy inspections remain5 and first-pass visual source inspections26; other21 source occupancies still require specific confirmation where currently probable/obscured/unverified.

Current registration and packages are separate from art and complete-race acceptance. {CRITIC} [Current build/images/performance scope](ROUND34.md) · [Blockrunner source/package details](BLOCKRUNNER_CLEANUP_ROUND34.md) · [Machine-readable manifest](../../assets/source/inkstorm/vehicle-manifest.json).

## Runtime families and evidence

| Family | Logical variants | Driver origin | Current provenance/acceptance scope |
| --- | ---: | --- | --- |
| Teemto |2|Project driver added|Hero uses retained open-cockpit V2/V4C driver; older public exports retained. Frozen round32 functional/six-race matrix remains historical; art unaccepted.|
| Sebulba |2|Project driver added|Existing hero/rival retained; frozen round32 technical evidence remains historical; art unaccepted.|
| Polwo |2|Project driver added|Hero48,975/rival28,830 triangles with fitted source derivative. Round32 technical results retained; strict source/runtime art FAIL.|
| Blockrunner Colour |2|Original source minifigure retained|Actual V6 hero44,028/rival29,682 triangles, five material submissions each, exact public-byte copies and zero-error/warning Khronos validation. Current full-race/final critic pending actual results.|

The12 preserved public GLBs include older Teemto revisions; they do not represent12 families. [Blockrunner package manifest](../../{P}/blockrunnerPackage.json). The earlier foundation-material V1/round32/round31 bundles and performance records apply only to their frozen artifacts; [historical foundation report](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md), [round32 matrix](FULL_RACE_PERFORMANCE_ROUND32.md), [round31](FULL_RACE_PERFORMANCE_ROUND31.md).

## Complete catalogue
'''+ '\n'.join(lines)+f'''
## Source, driver and distribution boundaries

The [all-source acquisition receipt](../../assets/source/inkstorm/vehicle-progress-20260908-all-candidate-sources.json) pins the26 connector-normalized GLBs by UID, size and SHA256. Use each manifest record's `download.sourceGlb` path; filenames differ between earlier imports and later `source-imported.glb` exports. No original vendor archive or artist/DCC project is claimed. Titles mentioning STL/OBJ do not prove those original formats were retained. Table geometry counts come from saved GLB/accessor headers unless explicitly measured later; they are not runtime budgets or proof about every instance.

Retain author, model link, verified licence version and adaptation description. CC BY requires attribution; noncommercial restrictions remain. The single CC BY-NC-ND source stays private noncommercial adapted-study only without public-adaptation permission. Do not bypass the official acquisition path or erase the eight historical429 requests (four each for Benn and the earlier Podracer). The prior catalogue preserves the [standalone archive CLI workflow and full acquisition chronology](evidence/round-34/pre-blockrunner-admission-documentation/VEHICLE_CATALOG.md).

Existing pilots are preserved and assessed before adding any replacement. Blockrunner's pilot is original; three project-added drivers remain the count. Source renders, model metadata, package validation and current registration are not final driver/world art acceptance. All22 remaining families need source-specific fit/anchors/derivatives and actual runtime review. Keep originals, rejected candidates, duplicate cleanup lineage and the full separate ivory variant.
'''
files['docs/inkstorm-overhaul/VEHICLE_CATALOG.md']=catalogue
# Manifest: preserve all model records and histories, then update only the actual
# fourth-family source/registration facts. No fabricated final performance receipt.
manifest=json.loads((BACK/'vehicle-manifest.json').read_text())
old_counts=copy.deepcopy(manifest['counts']);old_acq=copy.deepcopy(manifest['acquisitionState']);old_checkpoint=copy.deepcopy(manifest['acceptanceCheckpoint'])
manifest['updatedAt']=None  # Deliberately pending until the actual application/reconciliation time.
manifest['documentationDraft']={'status':'awaiting_root_final_performance_and_critic_facts','applyAuthorized':False,'sourceSnapshot':'docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/inventory.json'}
for key,value in {'stylizedExports':4,'stylizedSourceStudies':4,'stylizedExportVariants':8,'driversAdded':3,'runtimeIntegrations':4,'stylizedExportFiles':12}.items():manifest['counts'][key]=value
manifest['counts']['originalSourceDriversRetained']=1
manifest['counts']['runtimePreparationPending']=22
manifest.setdefault('acquisitionStateHistory',[]).append({'scope':'Preserved acquisition state before round34 Blockrunner registration reconciliation','state':old_acq})
for key in ['stylizedExports','stylizedSourceStudies','stylizedExportVariants','driversAdded','runtimeIntegrations','stylizedExportFiles']:
 manifest['acquisitionState'][key]=manifest['counts'][key]
manifest['acquisitionState']['remainingWork']='22 of26 source families still require runtime preparation, source-specific driver/anchor review and acceptance. Teemto/Sebulba/Polwo/Blockrunner are registered locally. Blockrunner retains its original driver; three project drivers have been added. Current V3 final full-race and critic results are pending. No final vehicle/world art PASS.'
manifest['acquisitionState']['countsReconciliationReceipt']='vehicle-progress-20260908-blockrunner-round34.json'
model=next(m for m in manifest['models'] if m['uid']=='a6f14ae799ab40d7ac425f043f824ff8')
for key in ['driver','stylizedExport','classification']:
 model.setdefault(key+'History',[]).append({'scope':'Preserved before actual round34 Blockrunner V6 registration','state':copy.deepcopy(model[key])})
model['classification']['basis']='Official imported GLB and actual source audit; original pilot, twin engines and full source lineage measured. Existing podracer runtime class retained.'
model['license']['stylizationNote']='CC BY4.0 confirmed by saved official metadata. Retain author20001748, original UID/title/model URL, licence link and explicit cleanup/control-fit/paint/LOD adaptation description.'
model['sourceProvenanceNote']='Official MCP imported-source GLB remains byte-preserved at SHA2561ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e. Original minifigure retained. All isolated cleanup/fit/paint/atlas/export histories preserved through152 scenes; no shared blend save. No raw vendor archive claimed.'
model['driver'].update(status='existing_source_driver_retained_in_runtime_export',pilotAdded=False,originalSourcePilotRetained=True,derivedOccupancy='present_static_original_minifigure',runtimeEmbeddedPilotVerified=True,fitAcceptance='Narrow static source-fit8/10 PASS only; hidden/mechanical motion and finished game art remain separate.',runtimeAcceptance='locally registered and captured; final V3 performance/visual review pending',requiredAction='Preserve the original pilot and source body; complete actual runtime readability and full-race/visual review, not a replacement pilot.',currentSource=S+'/mcp-safe/atlas-clamp-v6-receipt.json',receipt=S+'/CONTROL_FIT_V1_EXECUTED.md',runtimeReceipt=AD+'/captures-framing-v3/receipts.json')
model['stylizedSourceStudy']={'status':'complete','directory':S,'scope':'Actual exact opposing-face cleanup, original-pilot control fit, two-owner consolidation, geometry-aware baked paint and V6 ClampToEdge;152 scenes preserved with no shared blend save. Narrow source checks do not accept finished game art.','receipt':S+'/SOURCE_PAINT_STAGE_SUMMARY_ROUND34.md','sourceSceneCount':152,'latestAuthorReceipt':S+'/mcp-safe/atlas-clamp-v6-receipt.json','latestExportReceipt':S+'/runtime-admission-preparation/export-atlas-v6-v1-receipt.json'}
variants=[]
for kind,d in packages.items():
 variants.append({'kind':kind,'path':f'public/assets/inkstorm/vehicles/blockrunner-{kind}-v1.glb','processedCandidate':P+f'/blockrunner-{kind}-v1.glb','sha256':d['sha256'],'bytes':d['bytes'],'triangles':d['triangles'],'bodyTriangles':d['bodyTriangles'],'pilotTriangles':d['pilotTriangles'],'bodyPrimitives':1,'pilotPrimitives':4,'primitives':5,'materials':5,'uniqueImages':4,'rgba8FullMipBytesEstimate':d['rgba8FullMipBytes'],'packageReceipt':P+f'/blockrunner-{kind}-v1.package-receipt.json','khronosReceipt':P+f'/blockrunner-{kind}-v1.khronos.json','samplerWrapS':33071,'samplerWrapT':33071})
model['stylizedExport']={'status':'complete','scope':'Actual V6 hero/rival packages and byte-matching local public copies complete. Final current V3 full-race/visual review pending; no art acceptance or deployment.','path':'public/assets/inkstorm/vehicles/blockrunner-hero-v1.glb','variantCount':2,'exportedVariantFileCount':2,'variants':variants,'receipt':AD+'/public-admission.json','attribution':'public/assets/inkstorm/vehicles/ATTRIBUTION.md','sourceUid':model['uid'],'sourceLicense':'CC BY4.0','sourceLicenseReceipt':'assets/source/inkstorm/'+model['license']['metadataReceipt'],'sourcePreservationReceipt':S+'/source-clamp-v6-actual-inventory.json','anchors':{'receipt':P+'/blockrunner-hero-v1.package-receipt.json','attachments':packages['hero']['attachments'],'exhaustApertureRadius':.34,'hasAuthoredExhaustHardware':True,'couplingOmitted':True,'normalizationAppliedExactlyOnce':True,'artistScaleChoice':1.6},'visualAcceptance':{'outcome':'FAIL for completed V1; final V3 review pending','receipt':'docs/inkstorm-overhaul/BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md','selectedCraftScore':5.5,'worldScore':6,'reviewType':'independent but not fresh blind; prior limited aperture/catalogue context disclosed','aaaAccepted':False}}
model['runtimeIntegration']={'status':'complete','scope':'Local registration and actual V3 captured appearance complete; final current full-race/performance/critic pending. Status does not imply final art acceptance.','appearanceId':'blockrunner','path':'src/game/vehicleAppearance.ts','embeddedPilotNodePrefix':'blockrunner-pilot-','receipt':AD+'/public-admission.json','bundle':BUNDLE,'bundleSha256':BSHA,'verification':facts['verification'],'functionalRaceCapture':{'status':'captured_without_errors','receipt':AD+'/captures-framing-v3/receipts.json','images':13,'scope':'Seven staged sections, four Foundry viewpoints, garage and one short ordinary drive still; not full races or lifecycle proof.'},'fullRacePerformance':{'outcome':'PENDING_ROOT_FINAL_FACTS'},'visualAcceptance':copy.deepcopy(model['stylizedExport']['visualAcceptance'])}
# The other preserved variant gains the measured comparison only, not adoption.
ivory=next(m for m in manifest['models'] if m['uid']=='e42fb924b344481ea013c58cb0f52ad7')
ivory['sourceComparison']={'status':'external_numeric_comparison_complete','receipt':S+'/IVORY_VARIANT_SOURCE_COMPARISON.md','topologyTransformsNormalsIdentical':False,'originalPilotTrianglesMapped':8256,'runtimePreparationPending':True,'scope':'46,641 triangles correspond after translation at30micrometers; two828-triangle beam halves have distinct placement and87 triangles alternate triangulation. Preserve own source and normals.'}
manifest.setdefault('acceptanceCheckpointHistory',[]).append({'scope':'Historical frozen round32 checkpoint preserved before actual round34 Blockrunner documentation reconciliation','checkpoint':old_checkpoint})
manifest['acceptanceCheckpoint']={'round':34,'lastCompletedRound':32,'status':'current_V3_build_capture_pass_final_performance_and_review_pending','scope':'Actual current V3 build/capture plus four-family registration. Full-race performance and final critic pending; old completed round32 matrix is preserved in history and must not be assigned to the current bundle.','bundle':BUNDLE,'bundleBytes':BUNDLE_BYTES,'bundleSha256':BSHA,'verification':facts['verification'],'fullRacePerformance':'PENDING_ROOT_FINAL_FACTS','worldArtAcceptance':{'outcome':'no_final_PASS','latestCompletedReview':'docs/inkstorm-overhaul/BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md','latestCompletedWorldScore':6,'reviewedRevision':'V1','currentV3Review':'PENDING_ROOT_FINAL_FACTS','freshBlind':False,'limitation':'Reviewer reused after limited code context because of agent limit.'},'coverage':facts['coverage'],'deployment':{'committed':False,'pushed':False,'deployed':False},'historicalFoundationCheckpoint':{'bundle':'index-DAcqiho8.js','bundleSha256':'3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a','report':'docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md','scope':'Frozen historical648-test Polwo checkpoint; not current Blockrunner verification.'}}
manifest['latestPerformanceReceipt']=None
manifest['latestPerformanceReceiptStatus']='Current V3 performance pending; prior value is preserved in the pre-admission manifest and checkpoint history.'
progress={'status':'PRIVATE DRAFT awaiting root final facts','round':34,'scope':'Reconcile actual source152-scenes/public V6 packages/four-family registration without inventing final current performance or art acceptance.','manifestBeforeSnapshot':'docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/vehicle-manifest.json','manifestBeforeSha256':hashlib.sha256((BACK/'vehicle-manifest.json').read_bytes()).hexdigest(),'countsBefore':old_counts,'counts':manifest['counts'],'publicCopyReceipt':AD+'/public-admission.json','sourceExportReceipt':S+'/runtime-admission-preparation/export-atlas-v6-v1-receipt.json','bundle':BUNDLE,'bundleSha256':BSHA,'fullRacePerformance':None,'finalCritic':None,'historicalTailBytes':9333,'historicalTailSha256':TAIL_SHA}
manifest['progressHistory'].append(copy.deepcopy(progress));manifest['latestProgressReceipt']='vehicle-progress-20260908-blockrunner-round34.json'
files['assets/source/inkstorm/vehicle-manifest.json']=json.dumps(manifest,indent=2)+'\n'
files['assets/source/inkstorm/vehicle-progress-20260908-blockrunner-round34.json']=json.dumps(progress,indent=2)+'\n'
for dest,value in files.items():
 p=OUT/'files'/dest;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(value if isinstance(value,bytes) else value.encode())
assert (OUT/'files/HANDOVER.md').read_bytes()[-9333:]==tail
assert len(manifest['models'])==29 and sum(m['download'].get('status')=='downloaded' for m in manifest['models'] if m.get('classification',{}).get('included'))==26
assert sum(m.get('runtimeIntegration',{}).get('status')=='complete' for m in manifest['models'])==4
assert sum(m.get('driver',{}).get('pilotAdded') is True for m in manifest['models'])==3
for old,new in zip(json.loads((BACK/'vehicle-manifest.json').read_text())['models'],manifest['models']):
 assert old['uid']==new['uid'] and old['download']==new['download'] and old['license']['reported']==new['license']['reported']
record={'status':'PRIVATE DRAFT ONLY; repository destination files untouched','sourceSnapshot':str(BACK/'inventory.json'),'pending':['Final V3 full-race/section/context/resource performance','Final V3 critic and independence scope','Frozen runtime/evidence inventories and cleanup','Root GO before applying documentation'],'historicalTailBytes':9333,'historicalTailSha256':TAIL_SHA,'candidateFiles':[{'destination':dest,'candidate':str(OUT/'files'/dest),'bytes':(OUT/'files'/dest).stat().st_size,'sha256':hashlib.sha256((OUT/'files'/dest).read_bytes()).hexdigest()} for dest in files]}
(OUT/'candidate-inventory.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'status':record['status'],'files':len(files),'counts':manifest['counts'],'tailPreserved':True,'pending':record['pending']},indent=2))
