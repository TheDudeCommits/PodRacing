"""Prepare the authorized dated checkpoint; application is a separate hash-guarded step."""
import copy
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/Users/amir/Projects/PodRacing')
OUT = Path(__file__).resolve().parent
DRAFT = OUT.parent / 'documentation-candidate-v1'
BACK = ROOT / 'docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation'
S = 'assets/source/inkstorm/blockrunner-round34'
P = S + '/runtime-admission-preparation/packaged-atlas-v6-v1'
AD = 'output/gauntlet/round34-blockrunner-admission-v1'
FROZEN = 'output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime'
AGG = 'output/playwright/blockrunner-final-framing-v3-attempt1-round34-verification-summary.json'
PERF_REPORT = 'docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md'
VIS_REPORT = 'docs/inkstorm-overhaul/BLOCKRUNNER_INGAME_FRAMING_V3_REVIEW_ROUND34.md'
BUNDLE = 'index-Cnysa7ZZ.js'
BSHA = '10ef7eb7189f407f530f73e802cdbc59acc1ebd47f5cfb2a26e3341e3b9bb04e'
TAIL_SHA = 'ae67e1e01f16a115cbecbe514529e50a2d1bb450e7605f323471a7b332cc726b'
STAMP = datetime.now(timezone.utc).isoformat()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_json(path):
    return json.loads((ROOT / path).read_text())


def file_record(path):
    raw = (ROOT / path).read_bytes()
    return {'path': path, 'bytes': len(raw), 'sha256': sha(raw)}


backup = json.loads((BACK / 'inventory.json').read_text())
for row in backup['files']:
    raw = (ROOT / row['preserved']).read_bytes()
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256'], row['preserved']
    assert (ROOT / row['source']).read_bytes() == raw, ('live changed', row['source'])
tail = (BACK / 'HANDOVER.md').read_bytes()[-9333:]
assert sha(tail) == TAIL_SHA and tail.startswith(b'## Links and source state')
draft_inventory = json.loads((DRAFT / 'candidate-inventory.json').read_text())
files = {}
for row in draft_inventory['candidateFiles']:
    raw = (DRAFT / 'files' / row['destination']).read_bytes()
    assert len(raw) == row['bytes'] and sha(raw) == row['sha256']
    files[row['destination']] = raw

agg = read_json(AGG)
freeze = read_json(FROZEN + '/inventory.json')
assert sha((ROOT / AGG).read_bytes()) == 'ee09ed352d1cea6c4cf480dc1797a4168148299ce98d98e3ecf3f2e2c31884c9'
assert sha((ROOT / FROZEN / 'inventory.json').read_bytes()) == 'fb8b4b820300b830cf7732974af714549de6935abbbc6b8e913af17f2298613c'
assert freeze['fileCount'] == 503 and freeze['bytes'] == 178371665
assert freeze['allSourceAndCopiedHashesMatch'] is True
assert agg['outcome'].startswith('PARTIAL:') and len(agg['fullRaces']) == 2
assert all(r['outcome'] == 'PASS' and r['acceptance']['outcome'] == 'PASS' for r in agg['fullRaces'])
assert agg['resourceCycles']['outcome'] == 'FAIL' and agg['resourceCycles']['plateau'] is False
assert all((r['geometries'], r['textures'], r['programs']) == (2, 2, 0) for r in agg['resourceCycles']['finalCycleDelta'][:7])
assert agg['cupContinue'] == {'event': 'cup-foundry', 'championshipRound': 1, 'awaitingStart': True}
for role in ['hero', 'rival']:
    package = read_json(P + f'/blockrunner-{role}-v1.package-receipt.json')
    public = file_record(f'public/assets/inkstorm/vehicles/blockrunner-{role}-v1.glb')
    assert public['bytes'] == package['bytes'] and public['sha256'] == package['sha256']
    issues = read_json(P + f'/blockrunner-{role}-v1.khronos.json')['issues']
    assert all(issues[k] == 0 for k in ['numErrors', 'numWarnings', 'numInfos', 'numHints'])
captures = read_json(AD + '/captures-framing-v3/receipts.json')
assert captures['errors'] == [] and captures['environment']['scripts'][0]['sha256'] == BSHA
assert len(list((ROOT / AD / 'captures-framing-v3').glob('*.png'))) == 13

COUNTS = '**26 preserved source families; four registered families (Teemto, Sebulba, Polwo, Blockrunner), eight logical hero/rival variants, 12 preserved public GLBs, three project drivers added, and 22 source families pending runtime preparation.** Blockrunner retains its original minifigure pilot; it is not a fourth added driver. The 26 saved catalogue downloads are complete and total 748,730,812 source-GLB bytes.'
PARTIAL = '**Dated tested checkpoint — 8 September 2026, V3 attempt 1: INCOMPLETE.** Full Time Attack, Canyon Cup round 1 and Continue, seven staged sections, and Foundry context recovery PASS. The exact resource plateau gate FAILS: cycle 2→3 adds two geometries and two textures at each matching section, with no program increase. Equal final garage totals do not pass that gate; a leak is not established. [Actual technical report](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md).'
CRITIC = '**V3 visual admission remains 6/10 for Blockrunner, world parity and overall: FAIL against the 8/10 gate.** The independent reviewer had prior narrow code and V1-image context; this is **not fresh blind**. Chase identity improved, while flat material response, garage pilot occlusion and world/route depth remain open. [Actual V3 review](BLOCKRUNNER_INGAME_FRAMING_V3_REVIEW_ROUND34.md).'
HIST = 'The earlier foundation-material V1 build `index-DAcqiho8.js` (1,617,115 bytes, SHA256 `3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a`) and its 648-test/two-Polwo-race technical PASS remain **frozen historical evidence**. [Historical report](FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md). Round32 remains the prior three-appearance/six-race matrix; this representative Blockrunner attempt does not repeat that matrix.'

files['HANDOVER.md'] = (f'''# PodRacing handover — 8 September 2026 checkpoint

**The full Inkstorm overhaul remains incomplete.** Colour Blockrunner is locally registered using its V6 atlas packages and original minifigure pilot. The dated V3 attempt1 passes two full races/Continue, seven staged sections and context recovery, but **fails the resource plateau gate** (+2 geometries/+2 textures/0 programs at matching stages). A leak is not established. **Visual admission is 6/10, FAIL against 8**, from an independent reviewer with prior code/V1 context, not a fresh blind review.

Tested bundle **{BUNDLE}**, **1,619,624 bytes**, SHA256 `{BSHA}`; **671 tests / 120 executed files**, typecheck/build PASS. The 13 actual V3 captures are error-free. This is a dated tested checkpoint, not a final overhaul or a claim that later working-tree revisions are verified. [Exact technical report](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md) and [503-file runtime freeze](output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime/inventory.json) own the evidence.

Work in **/Users/amir/Projects/PodRacing**, branch **codex/now-this-is-podracing**, baseline **0f0e8ab209cc5156efaf92b545630bd243b14478**; remote TheDudeCommits/PodRacing. The task folder `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all uncommitted work. No overhaul commit, push or deployment has occurred.

The user approved recommendations 1–8, direction **B / Inkstorm**, all downloaded catalogue vehicles with drivers, Blender MCP/imagegen, independent criticism and 40–60fps. [STATUS](docs/inkstorm-overhaul/STATUS.md) owns acceptance and remaining scope; [ROUND34](docs/inkstorm-overhaul/ROUND34.md) owns this tested revision; [CURRENT_VISUALS](docs/inkstorm-overhaul/CURRENT_VISUALS.md) owns the dated image set; [Blockrunner source record](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md) owns source/package provenance; [catalogue](docs/inkstorm-overhaul/VEHICLE_CATALOG.md) and its manifest own counts and licence boundaries.

{COUNTS}

Blockrunner hero/rival files are 3,693,000 / 3,228,580 bytes and 44,028 / 29,682 triangles, each retaining the 4,128-triangle original pilot and five opaque material draws before additional passes. Both actual hero and Cup Sola rival responses were hash-verified during the races. TA finished in 63.75s and Cup round1 in 129.675s; Continue opened Foundry awaiting Start, without completing that second Cup race. Local adaptive means were 59.500 / 59.138Hz; these do not establish fixed-DPR2 or other-device performance.

Blender source work ends at **152 preserved scenes**, including isolated cleanup, fitted controls, paint and normalized V6 export. Restore **Cruise — Going Merry source 4b2cb678**, its ViewLayer, active **Sketchfab_model.001** and exact 15-object selection after each call; never save the shared `.blend`. Retain source-file hashes, structural/normal guards, earlier failed candidates and the Ben-import membership observation. Keep the NoDerivs source private and do not blindly stage the source archive.

Next work: investigate the resource gate failure, improve material and garage pilot readability, address world/route target gaps, then prepare the remaining 22 families. Preserve V3's clearer engine/road separation. Ivory Blockrunner needs its own source references because beam placement, triangulation and normals differ. Human/controller/audio, full championship balance, other-device and multiplayer acceptance remain open. Keep simulation/network/terrain authority, course9/drive4/rules2 and existing driving classes unchanged by presentation work.

All four owned attempt1 browsers, servers, process groups and ports were closed; unrelated port5211 was untouched. Close each owned browser immediately after use. Earlier foundation and round32 results remain historical and apply only to their frozen artifacts. The seven pre-admission documents/manifest are [byte-preserved](docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).

## Archived pre-overhaul product handover — preserved verbatim

The following 9,333 bytes are historical, including their old counts, “current” wording and asset restrictions. They are retained for provenance; the active scope and evidence above take precedence.

''').encode() + tail

status = files['docs/inkstorm-overhaul/STATUS.md'].decode()
status = status.replace('# Inkstorm implementation and acceptance — round34', '# Inkstorm implementation and acceptance — 8 September 2026 checkpoint')
status = status.replace('The active revision adds', 'The dated V3 attempt1 adds')
status = re.sub(r'Current V3 build:.*?\[Verification\]\([^\n]+\)\.', f'Tested V3 bundle **{BUNDLE}**, **1,619,624 bytes**, SHA256 `{BSHA}`; **671 tests / 120 executed files**, typecheck/build PASS. [Verification](../../{AD}/verify-framing-v3.log). Later working-tree changes do not inherit this evidence.', status)
status = re.sub(r'\*\*Final full-race, section/context/resource checks.*?these checks\.', PARTIAL, status)
status = re.sub(r'The completed V1 in-game review remains.*?No final art PASS is claimed\.', CRITIC, status)
status = status.replace('Current craft material readability, final visual gate, full lifecycle/performance scope pending below.', 'Craft materials and garage pilot view; final visual gate and failed resource plateau. Representative two-race/Continue evidence is complete; full fleet/device coverage remains open.')
status = status.replace('Complete craft/world', 'Complete craft/world')
status = re.sub(r'The earlier round34 foundation-material V1 build.*?entire matrix\.', HIST, status)
status = status.replace('Keep the original seven world concepts', f'The [attempt1 freeze](../../{FROZEN}/inventory.json) preserves 503 files / 178,371,665 bytes. All four owned browsers/servers/ports closed; the failed resource run is retained without a relaxed gate or substituted retry. A complete four-check technical PASS is not claimed.\n\nKeep the original seven world concepts')
files['docs/inkstorm-overhaul/STATUS.md'] = status.encode()

files['docs/inkstorm-overhaul/ROUND34.md'] = f'''# Round34 — Blockrunner V3 tested checkpoint, 8 September 2026

Colour Blockrunner is locally registered with actual V6 hero/rival packages and its original source pilot. The tested revision retains the Foundry corridor, hoist V3, solid effects V2 and foundation material-coordinate correction. **The full overhaul and final art remain incomplete.**

{PARTIAL}

Tested bundle **{BUNDLE}**, **1,619,624 bytes**, SHA256 `{BSHA}`; **671 tests / 120 executed files**, typecheck/build PASS. [Verification](../../{AD}/verify-framing-v3.log). Results apply to the frozen V3 attempt1 only; subsequent edits require their own validation.

## Runtime change and actual admission

Blockrunner uses the existing podracer class and lazy imported-asset path. Its hero/rival retain the original silhouette, physical engine crossbeam and measured nozzle openings: 44,028 / 29,682 triangles, including the same 4,128-triangle pilot. Each package has one body/four pilot material draws, four baked images and no normal map. [Source, LOD and package receipts](BLOCKRUNNER_CLEANUP_ROUND34.md).

An optional per-asset aperture scales the existing procedural exhaust flame; omitted metadata retains the earlier `.54` radial default. Blockrunner uses a conservative 0.34m inside the measured approximately 0.346m inner throat. Authored nozzle hardware and the rigid crossbeam suppress duplicate generic lips and energy coupling. Presentation metadata updates atomically; driving/simulation authority and source geometry remain unchanged. [Independent code review and scope](BLOCKRUNNER_RUNTIME_CODE_REVIEW_ROUND34.md).

V1 chase hid most engine mass; V2 raised chase framing to 4.8 and added front inspection. Tested V3 uses the shallower garage view `(-1.8,.45,.65)`. [Thirteen actual error-free captures](CURRENT_VISUALS.md) show the revision; staged 410KPH/zero-clock stills do not prove normal racing or FPS.

Actual ordinary races decoded the final 44,028-triangle hero and the 29,682-triangle Cup **ai-sola** rival. Both browser-response hashes match the packaged public/dist files and each reports five opaque draws. Rax remains the class-gated procedural landspeeder; Time Attack has no Sola and does not request the absent rival. [Actual admission receipt](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/receipt.json).

## Technical checkpoint — attempt1 incomplete

| Check | Actual result | Scope |
| --- | --- | --- |
| Time Attack | PASS; valid gold, 63.750s, 10 sectors; mean 59.500373Hz, p95 16.8ms | 3,793 racing intervals; 32 over25ms, none over50ms. |
| Canyon Cup round1 / Continue | PASS; valid gold, 129.675s, 20 sectors; mean 59.138075Hz, p95 16.8ms | 8,142 racing intervals; 119 over25ms, none over50ms. Continue reaches Foundry awaiting Start; that second Cup race is not completed. |
| Seven staged sections | PASS; 2,527 intervals, none over25ms | Original 1.5s warmup and six-second sampling; diagnostic placement followed by live W. Ending DPR1–1.75. |
| Foundry context recovery | PASS | Original suspension, frozen simulation, history/shadow reset, injected framebuffer fallback and recovery assertions. Readiness retains >10 samples; restored cadence16.7ms. |
| Three-cycle resources | **FAIL** | Each corresponding grid–finish stage gains +2 geometries/+2 textures/0 programs from cycle2→3; final garage delta is zero. Cause unresolved; leak not established. |

Two ordinary virtual-gamepad races use the original mean≥40Hz, p95≤25ms and 0.05s coverage gates. All 12,270 raw rows and 11,935 racing intervals are retained. Cup classification grace extends the racing-phase collector after the 129.675s player finish: 481 intervals ending after finish total 8,016.2ms; the first may straddle finish. This is not 137.683s of player driving. No frame filtering, gate relaxation or substituted retry occurred.

Local Chrome152 / ANGLE Metal / Apple M4, 1440×900, requested DPR2 with the adaptive governor: observed TA DPR1–2, Cup1.75–2. These are local RAF results, not fixed-DPR2, GPU-time or other-device proof. Submitted triangles include render passes and peak above the600k target; no unique-geometry budget pass is inferred. Human handling, weapons/recovery coverage and a full four-family race matrix remain open. [Full metrics, raw evidence and limitations](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md).

The [runtime freeze](../../{FROZEN}/inventory.json) contains **503 files / 178,371,665 bytes** (142 source,43 public,49 complete dist,126 harness,6 configuration,137 physical test files), SHA256 `fb8b4b820300b830cf7732974af714549de6935abbbc6b8e913af17f2298613c`. The physical inventory differs from the 120 executed test files. All 30 saved manifests match their frozen groups. The [127-file evidence inventory](../../{FROZEN}/verification-evidence-inventory.json) and [independent exact aggregate](../../{AGG}) retain the failed resource boundary and every run. All four owned browsers, servers, process groups and ports were closed; unrelated5211 was untouched.

## Visual acceptance and next work

{CRITIC}

The material score remains4.5; the garage front wall hides nearly the whole pilot, and the chase craft is compact despite improved engine separation. World gaps include salt/launch depth, fork/finish landmark composition and Foundry crests hiding route continuation. Native-resolution motion inspection remains open. The [V1 review](BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md) remains preserved at5.5 craft /6 world; reviewer scores are not an objective improvement curve. Technical races do not overrule the visual rejection.

Investigate the resource plateau failure, then review the actual material/framing/world changes and repeat affected technical checks on their own frozen build. Prepare the remaining22 families with their own driver/anchor evidence. No final overhaul, all-family performance, art PASS, commit, push or deployment is claimed.

## Source coverage and historical evidence

{COUNTS}

Source authoring ends at152 preserved Blender scenes, including every source/cleanup/fit/paint history and normalized V6 export. The declared DCC normal-encoding budget and exact later-copy/source guards remain scoped in [Blockrunner source details](BLOCKRUNNER_CLEANUP_ROUND34.md). No shared `.blend` save occurred. Ivory Blockrunner differs in beam placement, triangulation and normals; [measured reuse boundaries](../../{S}/IVORY_VARIANT_SOURCE_COMPARISON.md).

{HIST}

Earlier foundation/corridor/effects chronology, context-readiness failures, resource evidence and operational source constraints are preserved in the [pre-admission round document](evidence/round-34/pre-blockrunner-admission-documentation/ROUND34.md). Keep terrain authority, course9/drive4/rules2, source licences and original Cruise context. [All seven preserved documents](evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).
'''.encode()

source = files['docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md'].decode()
source = source.replace('# Blockrunner source, packages and registration — round34', '# Blockrunner source, packages and registration — 8 September 2026 checkpoint')
source = re.sub(r'The completed V1 in-game review remains.*?No final art PASS is claimed\.', 'The actual V3 in-game review is **6/10 craft /6 world, FAIL against 8**; its independent reviewer had prior code/V1 context, so it is not fresh blind. [V3 review](BLOCKRUNNER_INGAME_FRAMING_V3_REVIEW_ROUND34.md).', source)
source = source.replace('The [current runtime gallery]', 'Actual V3 attempt1 races hash-verify both hero and Cup Sola rival, with two races/Continue, staged sections and context PASS. Resource stage plateau fails (+2 geometries/+2 textures/0 programs); this does not establish a leak. These dated technical results do not accept finished art. [Full technical scope](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md).\n\nThe [dated V3 runtime gallery]')
files['docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md'] = source.encode()

gallery = files['docs/inkstorm-overhaul/CURRENT_VISUALS.md'].decode()
gallery = gallery.replace('# Current Inkstorm runtime images — Blockrunner V3', '# Inkstorm runtime images — tested Blockrunner V3, 8 September 2026')
gallery = gallery.replace('These images supersede the foundation-material gallery as the current runtime presentation.', 'These images document the tested V3 attempt1 and supersede the historical foundation gallery for this checkpoint. Later working-tree revisions do not inherit their visual or technical evidence.')
gallery = re.sub(r'The completed V1 in-game review remains.*?No final art PASS is claimed\.', CRITIC, gallery)
gallery = re.sub(r'\*\*Final full-race, section/context/resource checks.*?these checks\.', 'The separate [actual performance attempt1](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md) passes two races/Continue, seven staged checks and context recovery but fails the exact resource plateau gate. These screenshots are not its timing evidence.', gallery)
files['docs/inkstorm-overhaul/CURRENT_VISUALS.md'] = gallery.encode()

catalogue = files['docs/inkstorm-overhaul/VEHICLE_CATALOG.md'].decode()
catalogue = catalogue.replace('Updated from preserved official acquisition, source and actual Blockrunner V6 export/package/public-copy receipts.', 'Dated 8 September 2026: updated from preserved official acquisition, actual Blockrunner V6 source/export/package/public-copy receipts and tested V3 attempt1 evidence.')
catalogue = re.sub(r'Current registration and packages are separate from art and complete-race acceptance\. The completed V1 in-game review remains.*?No final art PASS is claimed\.', 'Registration/package completion is separate from finished art. Actual V3 visual admission is **6/10 craft /6 world, FAIL against 8**, independently reviewed with prior code/V1 context and **not fresh blind**. Two full races/Continue, staged sections and context PASS; the exact resource stage plateau FAILS. These are dated V3 attempt1 results, not universal fleet acceptance.', catalogue)
catalogue = catalogue.replace('Current full-race/final critic pending actual results.', 'Dated V3 attempt1: two races/Continue, staged and context PASS; resource stage plateau FAIL. Visual6/10 FAIL8, independent but not fresh blind.')
files['docs/inkstorm-overhaul/VEHICLE_CATALOG.md'] = catalogue.encode()

# Structured evidence is derived from the actual exact aggregate, with explicit
# pass/fail scopes rather than assigning its aggregate partial result to races.
race_evidence = []
for row in agg['fullRaces']:
    race_evidence.append({
        'event': row['event'], 'outcome': row['outcome'],
        'playerFinishSeconds': row['resultTimeSeconds'], 'medal': row['medal'],
        'validSectors': row['validSectors'], 'rawRows': row['rawRows'],
        'racing': copy.deepcopy(row['summary']['racing']),
        'acceptance': copy.deepcopy(row['acceptance']),
        'postPlayerFinishRacingIntervals': row['postPlayerFinishRacingIntervals'],
        'postPlayerFinishIntervalDurationMs': row['postPlayerFinishIntervalDurationMs'],
        'postPlayerFinishScope': row['postPlayerFinishScope'],
        'rendererExtrema': copy.deepcopy(row['rendererExtrema']),
    })
performance = {
    'outcome': 'PASS', 'testedDate': '2026-09-08', 'attempt': 1,
    'scope': 'Representative Blockrunner Time Attack and Canyon Cup round1, plus actual Continue to Foundry awaiting Start. Second Cup race and full four-family matrix not completed. Resource lifecycle has its separate FAIL below.',
    'report': PERF_REPORT, 'aggregate': AGG, 'races': race_evidence,
    'totals': copy.deepcopy(agg['totals']), 'cupContinue': copy.deepcopy(agg['cupContinue']),
    'requestedDpr': 2, 'adaptiveGovernor': True,
    'observedDpr': {'timeAttack': [1, 2], 'cupRound1': [1.75, 2]},
    'fixedDpr2Verified': False, 'otherDeviceAcceptance': False,
}
resources = copy.deepcopy(agg['resourceCycles'])
resources['receipt'] = 'output/playwright/round34-blockrunner-final-framing-v3-resources-attempt1/receipt.json'
resources['leakEstablished'] = False
resources['causeStatus'] = 'under investigation; exact stage gate fails despite equal final garage totals'
resources['gateRelaxed'] = False
resources['retrySubstituted'] = False
visual = {
    'outcome': 'FAIL', 'reviewedRevision': 'V3', 'testedDate': '2026-09-08',
    'receipt': VIS_REPORT, 'selectedCraftScore': 6, 'worldScore': 6, 'overallScore': 6,
    'requiredScore': 8, 'freshBlind': False,
    'reviewType': 'independent, with prior narrow code and V1 image/review context disclosed',
    'scope': '13 individually opened actual V3 stills; retained concept01-07/12 viewing reused with hashes checked. Full-frame delivery resized; not native-pixel or motion acceptance.',
    'openIssues': ['flat material response', 'garage pilot occlusion', 'compact chase craft and small exhaust read', 'world depth/landmark parity', 'Foundry route continuation over crests', 'native-size motion inspection'],
    'aaaAccepted': False,
    'previousV1': {'receipt': 'docs/inkstorm-overhaul/BLOCKRUNNER_INGAME_V1_REVIEW_ROUND34.md', 'selectedCraftScore': 5.5, 'worldScore': 6, 'outcome': 'FAIL', 'freshBlind': False},
}
checkpoint = {
    'testedDate': '2026-09-08', 'attempt': 1, 'revision': 'Blockrunner framing V3',
    'technicalOutcome': 'INCOMPLETE',
    'scope': 'Dated tested checkpoint only. Full-race/Continue, staged and context PASS; exact resource plateau FAIL; visual6/10 FAIL8. Not final overhaul. Later working-tree changes do not inherit this evidence.',
    'fullRacePerformance': performance,
    'stagedSections': {'outcome': 'PASS', 'sections': 7, 'intervals': 2527, 'over25ms': 0, 'warmupSeconds': 1.5, 'endingDprRange': [1, 1.75], 'receipt': 'output/playwright/round34-blockrunner-final-framing-v3-staged-attempt1/section-performance.json'},
    'foundryContext': {'outcome': 'PASS', 'receipt': 'output/playwright/round34-blockrunner-final-framing-v3-context-attempt1/receipt.json', 'scope': 'Original suspension/frozen-simulation/history/shadow/framebuffer fallback and explicit recovery assertions; readiness keeps >10 samples. Linked programs/submitted geometry are not emitted-pixel art acceptance.'},
    'resourceCycles': resources, 'visualAcceptance': visual,
    'frozenRuntime': copy.deepcopy(agg['frozenRuntime']),
    'evidenceInventory': file_record(FROZEN + '/verification-evidence-inventory.json'),
    'aggregate': file_record(AGG),
    'cleanup': {'ownedRuns': 4, 'allBrowsersClosed': True, 'allPreviewServersExited': True, 'residualOwnedPidProcessGroupsListeners': False, 'fallbackKillsUsed': False, 'unrelated5211Untouched': True, 'ports': [57957, 58081, 58140, 58181], 'report': PERF_REPORT},
}

manifest = json.loads(files['assets/source/inkstorm/vehicle-manifest.json'])
original_manifest = json.loads((BACK / 'vehicle-manifest.json').read_text())
manifest['updatedAt'] = STAMP
manifest.pop('documentationDraft')
manifest['documentationReconciliation'] = {
    'status': 'applied_dated_partial_checkpoint', 'recordedAt': STAMP,
    'authorizedBy': 'Root explicitly authorized seven principal documents and supporting progress manifest after backup/hash checks',
    'sourceSnapshot': 'docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/inventory.json',
    'scope': checkpoint['scope'], 'receipt': S + '/documentation-reconciliation-attempt1/applied-inventory.json',
}
manifest['acquisitionState']['remainingWork'] = '22 of26 preserved source families still need runtime preparation and source-specific driver/anchor review. Four families are registered locally, with three project-added drivers and one retained original Blockrunner pilot. Dated V3 attempt1 races/Continue, staged sections and context PASS; exact resource plateau FAIL with cause unresolved. In-game visual6/10 FAIL8, not fresh blind. No final vehicle/world art PASS.'
model = next(m for m in manifest['models'] if m['uid'] == 'a6f14ae799ab40d7ac425f043f824ff8')
model['driver']['runtimeAcceptance'] = 'Actual V3 hero and Cup Sola rival decoded with original source pilot. Representative full races/Continue PASS; static visual6/10 FAIL8 and exact resource plateau FAIL remain open.'
model['driver']['requiredAction'] = 'Retain original pilot/seat/body; improve garage pilot visibility and material readability, investigate resource stage delta, then revalidate affected evidence. No replacement pilot.'
model['stylizedExport']['scope'] = 'V6 hero/rival packages and exact local public copies complete and decoded in actual V3 races. This source/export completion does not accept final art or failed resource lifecycle; no deployment.'
model['stylizedExport']['visualAcceptance'] = copy.deepcopy(visual)
model['runtimeIntegration']['scope'] = 'Local registration and actual hero/Sola rival decoding complete. Dated V3 attempt1 full races/Continue, staged and context PASS; exact resource stage plateau FAIL. Status complete means registration, not finished game/art acceptance.'
model['runtimeIntegration']['fullRacePerformance'] = copy.deepcopy(performance)
model['runtimeIntegration']['stagedSections'] = copy.deepcopy(checkpoint['stagedSections'])
model['runtimeIntegration']['foundryContext'] = copy.deepcopy(checkpoint['foundryContext'])
model['runtimeIntegration']['resourceCycles'] = copy.deepcopy(resources)
model['runtimeIntegration']['technicalOutcome'] = 'INCOMPLETE'
model['runtimeIntegration']['visualAcceptance'] = copy.deepcopy(visual)
model['runtimeIntegration']['actualAssetAdmissionReceipt'] = 'output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/receipt.json'
model['runtimeIntegration']['frozenRuntime'] = copy.deepcopy(agg['frozenRuntime'])
new_acceptance = manifest['acceptanceCheckpoint']
new_acceptance.update(copy.deepcopy(checkpoint))
new_acceptance['status'] = 'dated_V3_attempt1_partial_resource_FAIL_visual_FAIL'
new_acceptance['lastTestedRound'] = 34
new_acceptance['lastCompletedRoundScope'] = 'Retained round32 historical three-appearance/six-race matrix; round34 attempt1 does not achieve all four technical checks or final art acceptance.'
new_acceptance['worldArtAcceptance'] = copy.deepcopy(visual)
new_acceptance['worldArtAcceptance']['latestCompletedReview'] = VIS_REPORT
new_acceptance['worldArtAcceptance']['latestCompletedWorldScore'] = 6
manifest['latestPerformanceReceipt'] = AGG
manifest['latestPerformanceReceiptStatus'] = 'Dated V3 attempt1 PARTIAL: races/Continue, staged and context PASS; exact resource plateau FAIL. Not a complete technical checkpoint or art PASS.'
progress = json.loads(files['assets/source/inkstorm/vehicle-progress-20260908-blockrunner-round34.json'])
progress.update({
    'status': 'applied_dated_partial_checkpoint', 'recordedAt': STAMP,
    'scope': checkpoint['scope'], 'checkpoint': copy.deepcopy(checkpoint),
    'fullRacePerformance': copy.deepcopy(performance), 'finalCritic': copy.deepcopy(visual),
    'sourceSceneCount': 152, 'bundleBytes': 1619624,
    'documentationReconciliationReceipt': S + '/documentation-reconciliation-attempt1/applied-inventory.json',
})
assert manifest['progressHistory'][-1]['status'].startswith('PRIVATE DRAFT')
manifest['progressHistory'][-1] = copy.deepcopy(progress)
files['assets/source/inkstorm/vehicle-manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
files['assets/source/inkstorm/vehicle-progress-20260908-blockrunner-round34.json'] = (json.dumps(progress, indent=2) + '\n').encode()

# Validate immutable historical source/acquisition data and current counts.
assert len(manifest['models']) == 29
assert sum(m['download'].get('status') == 'downloaded' for m in manifest['models'] if m.get('classification', {}).get('included')) == 26
assert sum(m.get('runtimeIntegration', {}).get('status') == 'complete' for m in manifest['models']) == 4
assert sum(m.get('driver', {}).get('pilotAdded') is True for m in manifest['models']) == 3
assert manifest['counts']['stylizedExportVariants'] == 8 and manifest['counts']['stylizedExportFiles'] == 12
assert manifest['counts']['originalSourceDriversRetained'] == 1 and manifest['counts']['runtimePreparationPending'] == 22
for old, new in zip(original_manifest['models'], manifest['models']):
    assert old['uid'] == new['uid'] and old['download'] == new['download']
    assert old['license']['reported'] == new['license']['reported']
assert manifest['progressHistory'][:-1] == original_manifest['progressHistory']
assert manifest['acceptanceCheckpointHistory'][-1]['checkpoint'] == original_manifest['acceptanceCheckpoint']
assert files['HANDOVER.md'][-9333:] == tail

links_checked = 0
for destination, raw in files.items():
    text = raw.decode()
    active = text[:-len(tail.decode())] if destination == 'HANDOVER.md' else text
    if destination.endswith('.md'):
        assert not any(marker in active for marker in ['PENDING ROOT', 'PENDING_ROOT', 'PRIVATE DRAFT', 'pending actual results', 'results will be inserted', 'Current final cleanup details remain pending'])
        for target in re.findall(r'\]\(([^)]+)\)', active):
            target = target.split('#', 1)[0]
            if not target or '://' in target or target.startswith(('mailto:', 'codex:')):
                continue
            path = (ROOT / destination).parent / target
            assert path.resolve().exists() or str(path.resolve().relative_to(ROOT)) in files, (destination, target)
            links_checked += 1
    else:
        json.loads(raw)
    output = OUT / 'files' / destination
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(raw)

authority_paths = [PERF_REPORT, VIS_REPORT, AGG, FROZEN + '/inventory.json', FROZEN + '/verification-evidence-inventory.json', AD + '/verify-framing-v3.log', AD + '/captures-framing-v3/receipts.json', AD + '/public-admission.json', S + '/runtime-admission-preparation/export-atlas-v6-v1-receipt.json']
authority_paths += [P + f'/blockrunner-{role}-v1.{kind}.json' for role in ['hero', 'rival'] for kind in ['package-receipt', 'khronos']]
record = {
    'status': 'prepared_for_hash_guarded_application', 'recordedAt': STAMP,
    'scope': checkpoint['scope'], 'backupInventory': file_record(str((BACK / 'inventory.json').relative_to(ROOT))),
    'historicalTailBytes': 9333, 'historicalTailSha256': TAIL_SHA,
    'sourceSnapshotAndLiveFilesMatch': True, 'original29DownloadAndReportedLicenseRecordsPreserved': True,
    'originalProgressHistoryPreserved': True, 'priorAcceptanceCheckpointPreserved': True,
    'counts': copy.deepcopy(manifest['counts']), 'activeMarkdownLocalLinksChecked': links_checked,
    'authority': [file_record(path) for path in authority_paths],
    'candidateFiles': [{'destination': dest, 'candidate': str((OUT / 'files' / dest).relative_to(ROOT)), 'bytes': len(raw), 'sha256': sha(raw), 'beforeSha256': next((r['sha256'] for r in backup['files'] if r['source'] == dest), None)} for dest, raw in files.items()],
    'excludedOperations': ['No browser or Blender', 'No source/public/dist/test/harness mutation', 'No build/test rerun', 'No commit/push/deployment'],
}
(OUT / 'candidate-inventory.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'status': record['status'], 'files': len(files), 'localLinksChecked': links_checked, 'tailPreserved': True, 'counts': record['counts']}, indent=2))
