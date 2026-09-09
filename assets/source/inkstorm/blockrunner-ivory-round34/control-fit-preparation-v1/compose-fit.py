"""External filesystem preparation only; never executes Blender code."""
import ast
import hashlib
import json
from pathlib import Path

BASE = Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-ivory-round34')
OUT = BASE / 'control-fit-preparation-v1'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def assignment(tree, name):
    return next(ast.literal_eval(node.value) for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == name for target in node.targets))


def runs(indices):
    result = []
    for index in indices:
        if result and result[-1][0] + result[-1][1] == index:
            result[-1][1] += 1
        else:
            result.append([index, 1])
    return result


old_path = BASE / 'cleanup-mcp-preparation-v1/02b-cleanup-json-value-guard-prepared-v2.py'
old_raw = old_path.read_bytes()
assert sha(old_raw) == 'beee618bfeef95c1147cf326a360c624545f4ae28d860d4b8e6926ea64457e99'
old = old_raw.decode()
tree = ast.parse(old)
functions = {node.name: ast.get_source_segment(old, node) for node in tree.body if isinstance(node, ast.FunctionDef)}
reference = assignment(tree, 'REFERENCE')
cleanup = assignment(tree, 'CLEANUP')
proof = assignment(tree, 'PROOF')
proof = {'normalReconstruction': {'actualEncodedNormalFnv1a64': proof['normalReconstruction']['actualEncodedNormalFnv1a64']}}
receipt_path = BASE / 'cleanup-mcp-preparation-v1/02b-cleanup-json-value-guard-executed-v2-receipt.json'
receipt_raw = receipt_path.read_bytes()
assert sha(receipt_raw) == '72f9efa252dcb233d7b95b484a8c9d766d42269bd7b250f59a8ec9040301c4e3'
receipt = json.loads(receipt_raw)
assert receipt['cleanupPassed'] and receipt['cleanupAudit']['actualTriangles'] == 43556
measurement_raw = (OUT / 'own-clearance-measurements-v1.json').read_bytes()
measurement = json.loads(measurement_raw)
assert measurement['cleanupReceiptSha256'] == sha(receipt_raw)
controls = measurement['controls']
fit = {'scene': 'PodRacing — Blockrunner Ivory fitted controls V1 e42fb924b344481ea013c58cb0f52ad7',
       'prefix': 'Blockrunner Ivory fitted V1 ', 'cleanupReceiptSha256': sha(receipt_raw),
       'offlineReceiptSha256': sha(measurement_raw), 'controls': controls,
       'cleanupObjects': receipt['cleanupAudit']['objectLineage'], 'cleanupMaterials': receipt['cleanupAudit']['materialLineage'],
       'cleanupSignatures': receipt['cleanupAudit']['sourceNameNormalizedSignatures'],
       'cleanupNormals': receipt['cleanupAudit']['rawCornerNormalSignatures'],
       'gloveCleanedRuns': runs(receipt['semanticReferenceLineageOnly']['gloves']['cleanedPolygonIndices']),
       'offlineLiveWorldAgreementMetres': 0.00001}
assert sum(count for start, count in fit['gloveCleanedRuns']) == 680
wanted = ['fnv1a64_signature', 'name_key', 'matrix_rows', 'mesh_signature', 'socket_value', 'material_record',
          'source_signature', 'normal_signatures', 'context_record', 'render_record', 'scene_record',
          'collection_record', 'datablock_sets', 'fresh_snapshot', 'restore_original_context',
          'mesh_signature_remapped', 'require_source', 'copy_parity', 'cleanup_parity',
          'verify_owned_snapshot', 'rollback_owned', 'existing_copy_maps']
helper_code = '\n\n\n'.join(functions[name] for name in wanted)
clone = functions['cleanup_parity'].replace('def cleanup_parity(source, stage, object_map, mesh_map, material_map):',
    'def clone_core_audit(source, stage, object_map, mesh_map, material_map, mounts, expected_core):')
clone = clone.replace("CLEANUP['futurePrefix']", "FIT['prefix']")
clone = clone.replace('set(stage.objects) == set(object_map.values())', 'set(stage.objects) == set(object_map.values()).union(set(mounts))')
clone = clone.replace('set(stage.collection.objects) == set(object_map.values())', 'set(stage.collection.objects) == set(object_map.values()).union(set(mounts))')
start = clone.index("    assert signatures['objectsFnv1a64']")
end = clone.index('    assert len(object_map)', start)
clone = clone[:start] + "    assert json_value(signatures) == expected_core['signatures'], 'Copied core source-name-normalized signature mismatch.'\n    assert json_value(corner_signatures) == expected_core['normals'], 'Copied core raw normal signature mismatch.'\n" + clone[end:]
clone = clone.replace("'scope': 'All55object transforms/hierarchy and51material graphs preserved;50 untargeted meshes/rawnormals exact. Target retains4828 own faces with explicit geometry/UV/edge/normal reconstruction proof. Not universal art acceptance or raw file-byte equality.'", "'scope': 'Base55-node hierarchy and all51 material graphs exact; geometry and raw normal signatures match unchanged cleanup plus the two explicitly measured own fitted profiles. Mounts audited separately; no art acceptance.'")
measure_code = (OUT / 'measure-own-fit.py').read_text()
measure_tree = ast.parse(measure_code)
measure_functions = {node.name: ast.get_source_segment(measure_code, node) for node in measure_tree.body if isinstance(node, ast.FunctionDef)}
math_helpers = '\n\n\n'.join(measure_functions[name] for name in ['add', 'sub', 'mul', 'dot', 'cross', 'length', 'unit', 'clamp', 'bounds', 'point_triangle', 'segment_segment', 'segment_triangle', 'rotate_z', 'capsule_clearances', 'wall_hits'])
payload = '"""Prepared own Ivory isolated control fit. No external file IO, no render, no save. Root executes serially."""\nimport bpy\nimport json\nimport math\nfrom mathutils import Vector\n\n'
payload += '\n'.join(name + ' = ' + repr(value) for name, value in [('REFERENCE', reference), ('CLEANUP', cleanup), ('PROOF', proof), ('FIT', fit)])
payload += '\n\n' + helper_code + '\n\n' + clone + '\n\n' + math_helpers + '\n\n' + (OUT / 'fit-body.py').read_text()
parsed = ast.parse(payload)
parents = {child: node for node in ast.walk(parsed) for child in ast.iter_child_nodes(node)}
for node in ast.walk(parsed):
    assert not isinstance(node, ast.Lambda)
    if isinstance(node, ast.Import):
        assert all(alias.name in {'bpy', 'json', 'math'} and alias.asname is None for alias in node.names)
    if isinstance(node, ast.ImportFrom):
        assert node.module == 'mathutils' and all(alias.name == 'Vector' for alias in node.names)
    if isinstance(node, ast.Name):
        assert node.id not in {'getattr', 'setattr', 'delattr', 'open', 'exec', 'eval', 'globals', 'hashlib', 'Path', 'os', 'traceback', '__import__'}, node.id
        if node.id in {'bpy', 'json', 'math'}:
            assert isinstance(parents.get(node), ast.Attribute) and parents[node].value is node
    if isinstance(node, ast.Attribute):
        assert '__' not in node.attr
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'hasattr':
        assert isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        assert node.func.attr not in {'calc_normals', 'calc_normals_split', 'transform', 'render', 'save_as_mainfile', 'export_scene', 'import_scene'}
assert len(payload.encode()) <= 200000
compile(payload, '<prepared-ivory-fit>', 'exec')
path = OUT / '01-ivory-isolated-control-fit-prepared-v1.py'
assert not path.exists(), 'Never overwrite an immutable prepared payload.'
path.write_text(payload)
validation = {'status': 'PREPARED NOT EXECUTED', 'mcpExecuted': False, 'payload': str(path),
              'bytes': len(payload.encode()), 'sha256': sha(payload.encode()), 'astParsedAndCompiledOnly': True,
              'safeImports': ['bpy', 'json', 'math', 'mathutils.Vector'], 'computedAttributes': False,
              'all12DatablockSetsAndFreshContextGuarded': True, 'existingThreeIvoryScenesGuarded': True,
              'originalNodeTransformsPreserved': 55, 'changedExistingControlMeshes': 2, 'newMountMeshes': 2,
              'expectedAddedIds': {'scenes': 1, 'objects': 57, 'meshes': 53, 'materials': 51},
              'targetCounts': measurement['plannedTargetCounts'], 'cleanupReceiptSha256': sha(receipt_raw),
              'offlineMeasurementsSha256': sha(measurement_raw),
              'liveClearanceAgreementMetres': fit['offlineLiveWorldAgreementMetres'],
              'normalPolicy': 'Measure four own disposable profile encodings in same invocation; retained fit must reproduce those exact JSON values. Encoding angles reported separately, no Colour tolerance, normal/visual review remains pending.',
              'receiptPolicy': 'Always print final JSON without terminal rethrow; acceptance false and rollback path retained on failures.',
              'invocation': ['Wait for root GPU/Blender release.', 'Execute exact payload once, save actual returned JSON and executed payload.', 'Inspect fitConstructedAndAudited, actual clearances, normal differences, all preservation guards and expected ID additions.', 'Only then render matched neutral driver/fullcraft for fit inspection; no mask or paint in this payload.']}
(OUT / 'prepared-validation.json').write_text(json.dumps(validation, indent=2) + '\n')
print(json.dumps(validation, indent=2))
