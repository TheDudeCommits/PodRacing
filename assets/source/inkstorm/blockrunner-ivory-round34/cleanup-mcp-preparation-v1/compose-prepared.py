"""External filesystem preparer only. Never executes a Blender payload.

Run with no arguments to prepare the disposable preflight and fail-closed cleanup template.
After reading a successful actual preflight receipt, pass its path to bind the executable cleanup.
"""
import ast
import hashlib
import json
import sys
from pathlib import Path

BASE = Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-ivory-round34')
OUT = BASE / 'cleanup-mcp-preparation-v1'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def runs(indices):
    result = []
    for index in indices:
        if result and index == result[-1][0] + result[-1][1]:
            result[-1][1] += 1
        else:
            result.append([index, 1])
    assert [index for start, count in result for index in range(start, start + count)] == indices
    return result


def safe_check(payload):
    tree = ast.parse(payload)
    parents = {child: node for node in ast.walk(tree) for child in ast.iter_child_nodes(node)}
    literal_checks = []
    for node in ast.walk(tree):
        assert not isinstance(node, ast.Lambda)
        if isinstance(node, ast.Import):
            assert all(a.name in {'bpy', 'json', 'math'} and a.asname is None for a in node.names)
        if isinstance(node, ast.ImportFrom):
            assert node.module == 'mathutils' and node.level == 0 and all(a.name == 'Vector' and a.asname is None for a in node.names)
        if isinstance(node, ast.Name):
            assert node.id not in {'getattr', 'setattr', 'delattr', 'open', 'exec', 'eval', 'globals', 'hashlib', 'Path', 'os', 'traceback', '__import__'}, node.id
            if node.id in {'bpy', 'json', 'math'}:
                assert isinstance(parents.get(node), ast.Attribute) and parents[node].value is node
        if isinstance(node, ast.Attribute):
            assert '__' not in node.attr
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'hasattr':
            assert isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str)
            literal_checks.append(node.args[1].value)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            assert node.func.attr not in {'calc_normals', 'calc_normals_split', 'transform', 'render', 'save_as_mainfile', 'export_scene', 'import_scene'}, node.func.attr
    assert len(payload.encode('utf-8')) <= 200000
    return {'astParsed': True, 'safeImportsAndLiteralAttributes': True, 'moduleNamespacesNotUsedAsValues': True,
            'hasattrLiteralNames': literal_checks, 'bytes': len(payload.encode('utf-8')), 'sha256': sha(payload.encode('utf-8'))}


inputs_bytes = (BASE / 'cleanup-preparation-v1/operation-inputs.json').read_bytes()
inputs = json.loads(inputs_bytes)
copy_bytes = (BASE / 'source-copy-executed-v1-receipt.json').read_bytes()
copy = json.loads(copy_bytes)
assert copy['copyPassed'] and copy['sourcePreserved'] and copy['sourceCornerNormalsPreserved']
old = (BASE / 'source-copy-preparation-v1/ivory-unchanged-source-copy-prepared-v1.py').read_text()
tree = ast.parse(old)
reference = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'REFERENCE' for t in n.targets))
assert sha(Path(next(p['path'] for p in inputs['provenance'] if p['path'].endswith('source-imported.glb'))).read_bytes()) == reference['sourceGlbSha256']
target = next(r for r in inputs['meshes'] if r['candidateRemovedCount'])
assert target['exactOpposedPairsKeepRemove'] == [[i, i + 1] for i in range(0, 9656, 2)]
roles = inputs['pilotSemanticLineage']
role_runs = {name: runs(row['sourcePolygonIndices']) for name, row in roles['sourceRoles'].items()}
role_runs['body-remainder'] = runs(roles['bodyRemainderSourcePolygonIndices'])
cleanup = {'sourceCopyScene': copy['targetScene'], 'copyReceiptSha256': sha(copy_bytes),
           'inputsSha256': sha(inputs_bytes), 'targetSourceObject': target['sourceObject'],
           'targetSourceMesh': target['sourceMesh'], 'targetCopyObject': target['auditedSourceCopyObject'],
           'pairCount': 4828, 'pairsFnv': target['pairsFnv1a64'], 'roleRuns': role_runs,
           'futureScene': inputs['requiredFutureCleanupScene'], 'futurePrefix': inputs['futureObjectPrefix'],
           'copyObjects': copy['copyAudit']['objectLineage'], 'copyMaterials': copy['copyAudit']['materialLineage']}
functions = {node.name: ast.get_source_segment(old, node) for node in tree.body if isinstance(node, ast.FunctionDef)}
audit_code = (BASE / 'audit-preparation-v2/ivory-read-only-audit-prepared-v2.py').read_text()
audit_tree = ast.parse(audit_code)
functions['verify_snapshot'] = next(ast.get_source_segment(audit_code, node) for node in audit_tree.body if isinstance(node, ast.FunctionDef) and node.name == 'verify_snapshot')
wanted = ['fnv1a64_signature', 'name_key', 'matrix_rows', 'mesh_signature', 'socket_value', 'material_record',
          'source_signature', 'normal_signatures', 'context_record', 'render_record', 'scene_record',
          'collection_record', 'datablock_sets', 'fresh_snapshot', 'restore_original_context',
          'verify_snapshot', 'mesh_signature_remapped', 'require_source', 'copy_parity',
          'verify_owned_snapshot', 'rollback_owned']
prefix = '"""Prepared safe Ivory cleanup preparation; external composition only, no file IO in payload."""\nimport bpy\nimport json\nimport math\nfrom mathutils import Vector\n\nREFERENCE = ' + repr(reference) + '\nCLEANUP = ' + repr(cleanup) + '\n\n'
common = prefix + '\n\n\n'.join(functions[name] for name in wanted) + '\n\n' + (OUT / 'cleanup-common.py').read_text()
preflight = common + '\n\n' + (OUT / 'normal-preflight-body.py').read_text()
copy_new = functions['copy_parity'].replace('def copy_parity(', 'def copy_parity_new(').replace("REFERENCE['objectPrefix']", "CLEANUP['futurePrefix']")
cleanup_parity = copy_new.replace('def copy_parity_new(', 'def cleanup_parity(')
cleanup_parity = cleanup_parity.replace("assert len(copied.data.polygons) == len(original.data.polygons), ('Copied polygon count differs', original.name)", "assert len(copied.data.polygons) == (4828 if original.name == CLEANUP['targetSourceObject'] else len(original.data.polygons)), ('Copied polygon count differs', original.name)")
cleanup_parity = cleanup_parity.replace("assert signatures == REFERENCE['sourceSignature'], 'Copy differs from own source after normalizing deliberate copied ID names.'", "assert signatures['objectsFnv1a64'] == REFERENCE['sourceSignature']['objectsFnv1a64'], 'Object hierarchy/transforms changed.'\n    assert signatures['materialsFnv1a64'] == REFERENCE['sourceSignature']['materialsFnv1a64'], 'Material values changed.'\n    for name, value in signatures['meshesFnv1a64'].items():\n        if name != CLEANUP['targetSourceMesh']:\n            assert value == REFERENCE['sourceSignature']['meshesFnv1a64'][name], ('Untargeted mesh changed', name)")
cleanup_parity = cleanup_parity.replace("assert corner_signatures == REFERENCE['cornerNormals'], 'Copied raw corner normals differ; no recalculation or setter is allowed.'", "for name, value in corner_signatures.items():\n        if name == CLEANUP['targetSourceObject']:\n            assert value['cornerCount'] == 14484 and value['hasCustomNormals'] and value['cornerNormalsFnv1a64'] == PROOF['normalReconstruction']['actualEncodedNormalFnv1a64'], 'Retained normals differ from own measured reconstruction.'\n        else:\n            assert value == REFERENCE['cornerNormals'][name], ('Untargeted raw normals changed', name)")
cleanup_parity = cleanup_parity.replace("== 48384, 'Copied triangle total differs.'", "== 43556, 'Copied triangle total differs.'").replace("'actualTriangles': 48384", "'actualTriangles': 43556")
cleanup_parity = cleanup_parity.replace("'scope': 'Exact measured source geometry/topology/UV/slot/material/transform/hierarchy and raw corner-normal FNV parity after only copied ID names are normalized. Not every undocumented Blender property or raw file bytes.'", "'scope': 'All55object transforms/hierarchy and51material graphs preserved;50 untargeted meshes/rawnormals exact. Target retains4828 own faces with explicit geometry/UV/edge/normal reconstruction proof. Not universal art acceptance or raw file-byte equality.'")
assert "== 43556, 'Copied triangle total differs.'" in cleanup_parity
assert "for name, value in corner_signatures.items():" in cleanup_parity
tail = '\n\n' + copy_new + '\n\n' + cleanup_parity + '\n\n' + (OUT / 'cleanup-body.py').read_text()
proof = None
proof_sha = None
if len(sys.argv) > 1:
    proof_raw = Path(sys.argv[1]).read_bytes()
    proof = json.loads(proof_raw)
    proof_sha = sha(proof_raw)
    assert proof['preflightPassed'] and proof['stage'] == 'IVORY_DISPOSABLE_RETAINED_NORMAL_PREFLIGHT_V1'
    assert proof['sourceCopyReceiptSha256'] == cleanup['copyReceiptSha256'] and proof['cleanupInputsSha256'] == cleanup['inputsSha256']
    assert proof['sourcePreserved'] and proof['auditedSourceCopyPreserved'] and proof['auditedCopyRawNormalsAndParityPreserved']
    assert proof['globalPreservation']['noPersistentDatablocksCreatedOrRemoved']
    proof = {k: proof[k] for k in ['preflightPassed', 'sourceCopyReceiptSha256', 'cleanupInputsSha256', 'sourceGlbSha256',
                                  'liveExactPairVerification', 'normalReconstruction', 'globalPreservation', 'sourceSignature', 'sourceCopySignature']}
cleanup_payload = common + '\n\nPROOF = ' + repr(proof) + '\nPROOF_RECEIPT_SHA256 = ' + repr(proof_sha) + '\n' + tail
validation = {'status': 'PREPARED NOT EXECUTED', 'mcpExecuted': False,
              'compactRoleRangeCount': sum(len(v) for v in role_runs.values()), 'pairEncoding': '4828 exact independently measured pairs[2i,2i+1], verified live before mutations.',
              'preflight': safe_check(preflight), 'cleanup': safe_check(cleanup_payload),
              'cleanupBoundToActualProof': proof is not None, 'normalProofReceiptSha256': proof_sha,
              'invocationOrder': ['Execute disposable normal preflight while Blender renderer is idle; retain its printed actual receipt.', 'Inspect the measured own Ivory reconstruction and preservation result; no Colour tolerance is imported.', 'Externally compose this script with the actual successful receipt path, inspect the bound code/hash, then execute cleanup serially.', 'Verify cleanup receipt before any masks/fitting; retain both original and audited source-copy scenes.'],
              'cleanupTargetCounts': {'objects': 55, 'meshes': 51, 'materials': 51, 'triangles': 43556},
              'untargetedMeshCount': 50, 'semanticMasksApplied': False,
              'noNormalDirectionRecalculationCalled': True, 'normalSetterOnlyOnNewOwnedDerivative': True,
              'failureRollbackOnlyOwnedIds': True, 'all12IdSetsAndFreshContextGuarded': True}
preflight_path = OUT / '01-ivory-disposable-normal-preflight-prepared-v1.py'
if preflight_path.exists():
    assert preflight_path.read_text() == preflight, 'Never overwrite a different prepared preflight.'
else:
    preflight_path.write_text(preflight)
cleanup_path = OUT / ('02-ivory-cleanup-bound-prepared-v1.py' if proof is not None else '02-ivory-cleanup-unbound-template-v1.py')
assert not cleanup_path.exists(), 'Never overwrite a prepared cleanup payload.'
cleanup_path.write_text(cleanup_payload)
(OUT / ('bound-validation.json' if proof is not None else 'prepared-validation.json')).write_text(json.dumps(validation, indent=2) + '\n')
print(json.dumps(validation, indent=2))
