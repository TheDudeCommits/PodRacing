"""EXTERNAL PREPARATION ONLY. Compose a pinned safe MCP payload; never run Blender.
This file uses filesystem/hash utilities externally; none enter the MCP payload.
Run from any directory; unique outputs are created exclusively, not overwritten.
"""
import ast
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUTPUT = BASE / '15b-author-contact-v7-composed-payload.py'
INVENTORY = BASE.parent / 'v7-contact-preparation' / 'preparation-inventory-v2.json'
assert not OUTPUT.exists() and not INVENTORY.exists(), 'Preserve an already prepared version.'


def read(name):
    return json.loads((BASE / name).read_text())


def subset(data, keys):
    return {key: data[key] for key in keys.split()}


def digest(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def fnv(value):
    result = 14695981039346656037
    for byte in value:
        result = ((result ^ byte) * 1099511628211) & 18446744073709551615
    return format(result, '016x')


audit = read('audit-receipt.json')
fit = read('control-fit-v1-receipt.json')
author = read('paint-author-v4b-receipt.json')
state = read('bake-v4b-pilot-roughness-receipt.json')
clamp = read('atlas-clamp-v6-receipt.json')
assert state['targetScene'] == author['targetScene']
assert state['paintSignature']['objectsFnv1a64'] == author['paintSignature']['objectsFnv1a64'] == '890a4a28e5ecb2ce'
assert state['paintSignature']['meshesFnv1a64'] == author['paintSignature']['meshesFnv1a64']
assert state['paintCornerNormalSignature'] == author['paintCornerNormalSignature']
assert state['paintAttributeSignatures'] == author['paintAttributeSignatures']
assert state['proceduralGraphsRestored'] and state['paintMeshUvAndMaterialSlotsPreserved']
assert clamp['parentAtlasImageRecordsPreserved'] and clamp['imageDatablocksUnchanged']
images = clamp['atlasPackedImageRecords']
identities = {name: {key: row[key] for key in ['name', 'size', 'colorSpace', 'filepath']} for name, row in images.items()}
assert identities == state['linkedPaintImages']
image_pins = []
for name, row in images.items():
    path = Path(row['filepath'])
    data = path.read_bytes()
    assert len(data) == row['packedBytes'] and fnv(data) == row['packedBytesFnv1a64']
    image_pins.append(digest(path))
roughness = {}
for owner in ['body', 'pilot']:
    filename = f'bake-v4b-{owner}-roughness-receipt.json'
    receipt = read(filename)
    assert receipt['owner'] == owner and receipt['channel'] == 'roughness'
    assert receipt['newImageRetained'] and receipt['proceduralGraphsRestored']
    assert receipt['imageName'] in images
    roughness[owner] = {'receipt': filename, 'receiptSha256': digest(BASE / filename)['sha256'],
                        'image': images[receipt['imageName']],
                        'reuseType': 'same unchanged V4B roughness master; no V7 roughness bake claimed'}

names = ['00-source-reference.py', '01-source-guard.py', '13-v4-attribute-signatures.py',
         '14-atlas-wrap-guards.py', '15-ao-contact-guards.py']
prefix = '\n'.join((BASE / name).read_text() for name in names) + '\n'
values = {
 'BLOCKRUNNER_AUDIT': subset(audit, 'sourceSignature'),
 'BLOCKRUNNER_FIT': subset(fit, 'targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_STATE': subset(state, 'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages'),
 'BLOCKRUNNER_PAINT_AUTHOR': subset(author, 'targetScene paintCornerNormalSignature paintAttributeSignatures materialSlots objectLineage ownerCopies normalEncodingBudget normalEncodingBudgetInherited paintBounds'),
 'BLOCKRUNNER_V7_PARENT_IMAGES': images,
 'BLOCKRUNNER_V7_ROUGHNESS_MASTERS': roughness
}
payload = prefix + '\n'.join(name + ' = json.loads(' + repr(json.dumps(value, separators=(',', ':'), allow_nan=False)) + ')' for name, value in values.items()) + '\n'
payload += (BASE / '15b-copy-contact-color-v7-transaction.py').read_text()
tree = ast.parse(payload)
allowed_imports = {'bpy', 'math', 'json', 'collections', 'mathutils'}
for node in ast.walk(tree):
    assert not isinstance(node, ast.Lambda), 'No lambda in MCP code.'
    if isinstance(node, ast.Import):
        assert all(alias.name in allowed_imports for alias in node.names)
    if isinstance(node, ast.ImportFrom):
        assert node.module in allowed_imports and node.level == 0
    if isinstance(node, ast.Name):
        assert node.id not in {'open', 'exec', 'eval', 'globals', 'locals', 'compile', 'hashlib', 'Path', 'pathlib', 'os', 'traceback'}
        assert not node.id.startswith('__')
    if isinstance(node, ast.Attribute):
        assert not node.attr.startswith('__')
        assert node.attr not in {'save', 'save_render', 'pack', 'bake', 'render', 'save_as_mainfile', 'save_mainfile', 'import_scene', 'export_scene'} or not isinstance(node.ctx, ast.Store)
# This authoring payload may read source.render flags but must call no operators.
assert not any(isinstance(node, ast.Attribute) and node.attr == 'ops' for node in ast.walk(tree))
assert len(payload.encode('utf-8')) < 200000
with OUTPUT.open('x') as handle:
    handle.write(payload)
receipts = ['audit-receipt.json', 'control-fit-v1-receipt.json', 'paint-author-v4b-receipt.json',
            'bake-v4b-pilot-roughness-receipt.json', 'bake-v4b-body-roughness-receipt.json', 'atlas-clamp-v6-receipt.json']
inventory = {
 'stage': 'V7 short contact color preparation', 'status': 'prepared only; no Blender execution', 'supersedesPreparedOnlyPayload': '15-author-contact-v7-composed-payload.py', 'transactionFix': 'Cleanup nested finally; success only after all source/context/image/graph guards pass',
 'sourceUid': state['sourceUid'], 'parentScene': state['targetScene'],
 'preparedTargetScene': 'PodRacing — Blockrunner short contact color round34 V7',
 'parentWas148thHistoricalScene': True, 'currentSceneInventory': 'captured dynamically on later execution; every preexisting scene preserved',
 'payload': digest(OUTPUT),
 'fragments': [digest(BASE / name) for name in names + ['15b-copy-contact-color-v7-transaction.py']],
 'externalComposer': digest(Path(__file__).resolve()),
 'receiptInputs': [digest(BASE / name) for name in receipts],
 'imageInputs': image_pins,
 'staticValidation': {'astParse': True, 'allowedImportsOnly': sorted(allowed_imports), 'noLambdaDunderOrFileIO': True, 'noBpyOperators': True, 'lessThan200000Utf8Bytes': True},
 'changeContract': {'objects': 2, 'triangles': 44028, 'materialSlots': {'body': 3, 'pilot': 4},
                    'addedNodes': {'ShaderNodeAmbientOcclusion': 7, 'ShaderNodeMixRGB': 7},
                    'renamedOldColorNodes': 7, 'removedDisconnectedOldColorBakeNodes': 7,
                    'retainedDisconnectedRoughnessBakeNodes': 7,
                    'distanceSourceWorldUnits': .16, 'strength': .38, 'samples': 16,
                    'inside': False, 'onlyLocal': False, 'normalInputUnlinked': True,
                    'newImages': 0, 'newBakes': 0, 'newExports': 0},
 'laterRequiredChecks': ['Current installed Blender version and AO socket/property compatibility',
                        'Actual guard-complete author receipt', 'Matched actual neutral views and color bakes with both owners present',
                        'Reused roughness receipt lineage in finalizer, not synthetic bake receipts',
                        'Clamp atlas image nodes; judge contacts at final runtime atlas resolutions',
                        'In-game material review and unchanged runtime geometry/normal metadata'],
 'primaryReferencesProvidedByParent': ['https://docs.blender.org/manual/en/latest/render/shader_nodes/input/ao.html',
                                      'https://docs.blender.org/api/current/bpy.types.ShaderNodeAmbientOcclusion.html']
}
with INVENTORY.open('x') as handle:
    json.dump(inventory, handle, indent=2)
    handle.write('\n')
print(json.dumps({'payload': inventory['payload'], 'inventory': digest(INVENTORY), 'executedBlender': False}, indent=2))
