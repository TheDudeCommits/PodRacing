"""Reconcile official MCP imports; never download, render, or change runtime art."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import copy, hashlib, json, re, shutil, struct

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'assets/source/inkstorm'
MANIFEST = BASE / 'vehicle-manifest.json'
def read(p): return json.loads(p.read_text())
def stamp(p):
    data = p.read_bytes()
    return {'path': str(p.relative_to(BASE)), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
def write(p, data): p.write_text(json.dumps(data, indent=2) + '\n')

backup = BASE / 'vehicle-manifest-before-acquisition-20260908.json'
assert not backup.exists(), 'Refuse to overwrite historical manifest'
shutil.copyfile(MANIFEST, backup)
m = read(MANIFEST)
before = copy.deepcopy(m)
now = datetime.now(timezone.utc).isoformat()
source_rows = []
for model in m['models']:
    if not model['classification']['included']: continue
    folder = BASE / 'vehicles' / model['uid']
    fresh_meta = read(folder / 'official-metadata-20260908.json')
    metadata = fresh_meta['response']
    assert metadata['uid'] == model['uid'] and metadata['isDownloadable']
    model.setdefault('licenseHistory', []).append({'recordedAt': now, 'record': copy.deepcopy(model['license'])})
    license_data = metadata['license']
    model['license'].update({'reported': license_data, 'licenseUrl': license_data['url'],
        'verifiedAt': fresh_meta['retrievedAt'], 'verifiedFrom': fresh_meta['sourceUrl'],
        'metadataReceipt': str((folder / 'official-metadata-20260908.json').relative_to(BASE))})
    version = re.search(r'/([0-9]+\.[0-9]+)/', license_data['url'])
    if version: model['license']['version'] = version.group(1)
    # Preserve all earlier acquisition and legal-scope records. Source acquisition
    # is distinct from permission to distribute a stylized derivative.
    if model['ordinal'] > 2:
        prior = copy.deepcopy(model['download'])
        receipt_path = folder / ('mcp-download-retry-20260908-0710.json' if model['ordinal'] == 4 else 'mcp-download-20260908.json')
        receipt = read(receipt_path)
        source = folder / 'source-imported.glb'
        assert source.exists() and 'Successfully imported model.' in json.dumps(receipt['result'])
        model.setdefault('downloadHistory', []).append({'recordedAt': now,
            'reason': 'Official MCP source import succeeded after the preserved rate-limit period', 'record': prior})
        identity = stamp(source)
        model['download'] = {'status': 'downloaded', 'method': 'official_blender_mcp',
            'archive': None, 'sourceGlb': identity['path'], 'sourceSha256': identity['sha256'],
            'sourceBytes': identity['bytes'], 'receipt': str(receipt_path.relative_to(BASE)),
            'receiptSha256': stamp(receipt_path)['sha256'], 'attemptCount': prior.get('attemptCount', 0) + 1,
            'attemptedAt': receipt.get('completedAt', receipt.get('at', receipt.get('recordedAt'))),
            'sourceImported': True, 'rawArchivePreserved': False,
            'scope': 'Official MCP import followed by isolated active-scene GLB export; not the original download archive or a runtime-ready asset.'}
    source = BASE / model['download']['sourceGlb']
    identity = stamp(source)
    with source.open('rb') as f:
        header = f.read(20); assert header[:4] == b'glTF'
        size = struct.unpack_from('<I', header, 12)[0]
        doc = json.loads(f.read(size))
    triangles = sum(doc['accessors'][p['indices']]['count'] // 3 for mesh in doc.get('meshes', []) for p in mesh['primitives'] if p.get('mode', 4) == 4 and 'indices' in p)
    source_rows.append({**identity, 'uid': model['uid'], 'title': model['title'],
        'meshDefinitions': len(doc.get('meshes', [])), 'materials': len(doc.get('materials', [])),
        'headerTriangleSum': triangles, 'triangleScope': 'Sum of indexed triangle primitive definitions; instances and nontriangle primitives are not counted.',
        'sourceScenes': [s.get('name') for s in doc.get('scenes', [])],
        'metadata': stamp(folder / 'official-metadata-20260908.json')})

# Preserve the former V4C hero metadata before identifying the current V2 sibling.
teemto = m['models'][0]
teemto.setdefault('stylizedExportHistory', []).append({'recordedAt': now, 'record': copy.deepcopy(teemto['stylizedExport'])})
export = teemto['stylizedExport']; hero = next(v for v in export['variants'] if v['kind'] == 'hero')
hero.update({'path': 'public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb',
    'sha256': 'af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e',
    'bytes': 7698824, 'triangles': 57618, 'primitives': 10, 'pilotPrimitives': 6, 'materials': 9,
    'revision': 'teemto-open-cockpit-v2',
    'processedCandidate': 'teemto-open-cockpit-round31/v2/teemto-open-cockpit-round31-v2-candidate.glb'})
export.update({'path': hero['path'], 'scope': 'Current open-cockpit V2 hero and preserved rival; loading/lifecycle PASS, finished cockpit and strict art parity FAIL.'})
public_files = sorted((ROOT / 'public/assets/inkstorm/vehicles').glob('*.glb'))
statuses = Counter(x['download']['status'] for x in m['models'] if x['classification']['included'])
m['counts'].update({'downloaded': len(source_rows), 'blockedOrPending': 26 - len(source_rows),
    'downloadStatuses': dict(statuses), 'mcpImportedSourceGlbs': len(source_rows),
    'rawArchivesPreserved': 0, 'stylizedExportFiles': len(public_files)})
m['acquisitionStateHistory'] = m.get('acquisitionStateHistory', []) + [{'recordedAt': now, 'record': copy.deepcopy(m['acquisitionState'])}]
m['acquisitionState'].update({'status': 'all_catalogue_candidate_sources_imported', 'httpStatus': None,
    'lastAttemptUid': '0baa936f45434c7eb8d58c31890402a2', 'lastAttemptAt': now,
    'lastAttemptReceipt': 'vehicles/0baa936f45434c7eb8d58c31890402a2/mcp-download-20260908.json',
    'recordedAttemptCountForLastUid': 1,
    'contextRestoration': 'All official imports used isolated intake scenes and restored the original active scene/layer/selection and cleared temporary configuration. Ben export observed one added object in an unrelated pre-existing Cruise scene; cause unestablished and object left untouched. All other recorded membership comparisons match.',
    'remainingWork': '24 newly imported families need occupancy inspection, bounded derivatives/LODs, anchors, runtime integration and visual acceptance. One BY-NC-ND asset remains restricted from public adapted distribution.'})
progress = {'recordedAt': now, 'counts': copy.deepcopy(m['counts']), 'sourceFiles': source_rows,
    'catalogueRefresh': 'sketchfab-search-20260908.json', 'catalogueResults': 29,
    'catalogueMembershipChanged': False, 'newOfficialImports': 24, 'newRateLimits': 0,
    'historicalRateLimits': 8, 'runtimeIntegrations': 2, 'rawArchivesPreserved': 0,
    'scope': 'Acquisition checkpoint only. Source files are not optimized or accepted runtime art.',
    'priorManifest': stamp(backup)}
progress_name = 'vehicle-progress-20260908-all-candidate-sources.json'
write(BASE / progress_name, progress)
m['updatedAt'] = now
m.setdefault('progressHistory', []).append(progress_name)
m['latestProgressReceipt'] = progress_name
assert len(m['models']) == len(before['models']) == 29 and len(source_rows) == 26
write(MANIFEST, m)
print(json.dumps({'sources': len(source_rows), 'newImports': 24, 'sourceBytes': sum(x['bytes'] for x in source_rows),
    'runtimeIntegrations': 2, 'physicalPublicVehicleGlbs': len(public_files), 'catalogueCandidates': 26}))
