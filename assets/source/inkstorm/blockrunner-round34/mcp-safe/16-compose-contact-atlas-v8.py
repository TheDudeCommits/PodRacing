"""EXTERNAL ONLY. Compose V7 -> V8 clamped atlas with two real color bakes
and two explicitly reused original V4B roughness receipts. No Blender execution.
"""
import ast
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUTPUT = BASE / '16-contact-atlas-v8-composed-payload.py'
assert not OUTPUT.exists()


def read(name):
    return json.loads((BASE / name).read_text())


def subset(data, keys):
    return {key: data[key] for key in keys.split()}


def replace_once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)


def fnv(value):
    signature = 14695981039346656037
    for character in json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False, ensure_ascii=True):
        signature = ((signature ^ ord(character)) * 1099511628211) & 18446744073709551615
    return format(signature, '016x')


def digest(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


audit = read('audit-receipt.json')
fit = read('control-fit-v1-receipt.json')
author = read('contact-author-v7-receipt.json')
state = read('bake-v7-pilot-color-receipt.json')
parent = read('bake-v4b-pilot-roughness-receipt.json')
baseline = read('atlas-clamp-v6-receipt.json')
bake_names = ['bake-v7-body-color-receipt.json', 'bake-v4b-body-roughness-receipt.json', 'bake-v7-pilot-color-receipt.json', 'bake-v4b-pilot-roughness-receipt.json']
bakes = [read(name) for name in bake_names]
assert state['targetScene'] == author['targetScene'] == 'PodRacing — Blockrunner short contact color round34 V7'
assert state['newImageRetained'] and state['extendedContactGraphsRestored'] and state['existingPackedImagesPreserved']
assert state['paintMeshUvAndMaterialSlotsPreserved'] and state['paintCornerNormalsPreserved']
assert len(state['packedImageRecords']) == len(state['linkedPaintImages']) == 4
assert [(b['owner'], b['channel']) for b in bakes] == [('body', 'color'), ('body', 'roughness'), ('pilot', 'color'), ('pilot', 'roughness')]
assert bakes[0]['targetScene'] == bakes[2]['targetScene'] == state['targetScene']
assert bakes[1]['targetScene'] == bakes[3]['targetScene'] == parent['targetScene']
for owner, index in [('body', 1), ('pilot', 3)]:
    assert author['reusedRoughnessMasterAuthority'][owner]['receiptSha256'] == digest(BASE / bake_names[index])['sha256']
    assert author['reusedRoughnessMasterAuthority'][owner]['image'] == state['packedImageRecords'][bakes[index]['imageName']]
image_pins = []
for name, row in state['packedImageRecords'].items():
    path = Path(row['filepath'])
    data = path.read_bytes()
    signature = 14695981039346656037
    for byte in data:
        signature = ((signature ^ byte) * 1099511628211) & 18446744073709551615
    assert len(data) == row['packedBytes'] and format(signature, '016x') == row['packedBytesFnv1a64']
    image_pins.append(digest(path))
names = ['00-source-reference.py', '01-source-guard.py', 'pilot-paint-reference-v1.py', '13-v4-attribute-signatures.py', '14-atlas-wrap-guards.py', '15d-ao-contact-guards.py']
prefix = '\n'.join((BASE / name).read_text() for name in names) + '\n'
values = {
 'BLOCKRUNNER_AUDIT': subset(audit, 'sourceSignature'),
 'BLOCKRUNNER_FIT': subset(fit, 'targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_AUTHOR': subset(author, 'targetScene paintSignature bodyMeshName pilotMeshName paintCornerNormalSignature objectLineage ownerCopies normalEncodingBudget paintBounds'),
 'BLOCKRUNNER_PAINT_STATE': subset(state, 'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages contactGraphSignatures packedImageRecords'),
 'BLOCKRUNNER_ATLAS_RECEIPTS': bakes,
 'BLOCKRUNNER_REUSED_ROUGHNESS': author['reusedRoughnessMasterAuthority'],
 'BLOCKRUNNER_CONTACT_PARENT': subset(parent, 'targetScene paintSignature paintCornerNormalSignature paintAttributeSignatures'),
 'BLOCKRUNNER_V6_BASELINE': subset(baseline, 'targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures atlasGraphSignatures atlasPackedImageRecords'),
 'BLOCKRUNNER_CONTACT_SETTINGS': author['contactSettings']}
f = (BASE / '11b-copy-finalize-atlas-v3-socket-iteration.py').read_text()
f = f.replace('V3', 'V8').replace('v3', 'v8').replace('V2', 'V7').replace('v2', 'v7')
f = f.replace('PodRacing — Blockrunner Inkstorm atlas paint round34 V7', author['targetScene'])
f = f.replace('c8da6bd752d2485a', author['paintSignature']['objectsFnv1a64'])
f = f.replace('9e45fb9bc1a499ab', fnv(state['paintSignature']))
f = f.replace('c255745cce8c26bb', fnv(state['linkedPaintImages']))
f = f.replace("['50215ec1a66752e0', '94619d1924f81486', '6342d00416aae43f', 'd16671acbb97f8d5']", repr([fnv(b) for b in bakes]))
f = f.replace("BLOCKRUNNER_ATLAS_RECEIPTS[-1]", "BLOCKRUNNER_ATLAS_RECEIPTS[2]")
f = replace_once(f, "    color.interpolation = 'Linear'\n", "    color.interpolation = 'Linear'\n    color.extension = 'EXTEND'\n")
f = replace_once(f, "    roughness.interpolation = 'Linear'\n", "    roughness.interpolation = 'Linear'\n    roughness.extension = 'EXTEND'\n")
f = replace_once(f, "        'normalMap': False, 'useBackfaceCulling': material.use_backface_culling})", "        'normalMap': False, 'useBackfaceCulling': material.use_backface_culling, 'atlasExtension': 'EXTEND', 'samplerIntent': 'CLAMP_TO_EDGE'})")
a = f.index('    # Clearing slots resets polygon material indices.')
z = f.index('    ob = original.copy()', a)
f = f[:a] + '''    # Keep the index layer alive. Pilot slots replace in place; body role
    # indices become zero, then only the two unused copied slots are removed.
    if pilot:
        assert len(mesh.materials) == len(materials) == 4
        for index, material in enumerate(materials):
            mesh.materials[index] = material
    else:
        assert len(mesh.materials) == 3 and len(materials) == 1
        mesh.materials[0] = materials[0]
        for polygon in mesh.polygons:
            polygon.material_index = 0
        mesh.materials.pop(index=2)
        mesh.materials.pop(index=1)
    assert [polygon.material_index for polygon in mesh.polygons] == expected_indices
''' + f[z:]
f = replace_once(f, 'success = False\n', 'success = False\ncandidate_ready = False\ncontact_parent = None\ncontact_parent_graphs = None\nv6_baseline = None\n')
f = replace_once(f, "    'materials': [], 'ownerCopies': [], 'atlasImages': [],\n", "    'materials': [], 'ownerCopies': [], 'atlasImages': [],\n    'reusedRoughnessMasterAuthority': BLOCKRUNNER_REUSED_ROUGHNESS,\n    'contactSettingsBakedIntoColor': BLOCKRUNNER_CONTACT_SETTINGS,\n")
point = '    paint_before = source_signature(paint)\n'
f = replace_once(f, point, point + '''    assert paint_attribute_signatures(paint) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert contact_graph_signatures(paint) == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']
    assert wrap_linked_image_records(paint) == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
    contact_parent = bpy.data.scenes.get(BLOCKRUNNER_CONTACT_PARENT['targetScene'])
    assert contact_parent is not None
    assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
    assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
    assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
    assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_V6_BASELINE['atlasPackedImageRecords']
    contact_parent_graphs = contact_graph_signatures(contact_parent)
    v6_baseline = bpy.data.scenes.get(BLOCKRUNNER_V6_BASELINE['targetScene'])
    assert v6_baseline is not None
    assert source_signature(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintSignature']
    assert wrap_normal_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintCornerNormalSignature']
    assert paint_attribute_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintAttributeSignatures']
    assert wrap_atlas_graph_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['atlasGraphSignatures']
    assert wrap_linked_image_records(v6_baseline) == BLOCKRUNNER_V6_BASELINE['atlasPackedImageRecords']
''')
f = replace_once(f, "        assert receipt['sourceUid'] == REFERENCE['uid'] and receipt['targetScene'] == paint.name\n", '''        assert receipt['sourceUid'] == REFERENCE['uid']
        if key[1] == 'color':
            assert receipt['targetScene'] == paint.name
            assert receipt['extendedContactGraphsRestored'] and receipt['existingPackedImagesPreserved']
            reuse_mode = 'new actual V7 contact-color bake'
        else:
            assert receipt['targetScene'] == BLOCKRUNNER_CONTACT_PARENT['targetScene']
            assert receipt['imageName'] == BLOCKRUNNER_REUSED_ROUGHNESS[key[0]]['image']['name']
            assert BLOCKRUNNER_PAINT_STATE['packedImageRecords'][receipt['imageName']] == BLOCKRUNNER_REUSED_ROUGHNESS[key[0]]['image']
            reuse_mode = 'original unchanged V4B roughness master reused; no V7 roughness bake'
''')
f = replace_once(f, "            'sourceBakePaintSignature': receipt['paintSignature']})", "            'sourceBakePaintSignature': receipt['paintSignature'], 'actualSourceBakeScene': receipt['targetScene'], 'reuseMode': reuse_mode})")
point = "    target = bpy.data.scenes.new(ATLAS_SCENE)\n"
f = replace_once(f, point, '''    baseline_body = v6_baseline.objects[BLOCKRUNNER_V6_BASELINE['bodyMeshName']]
    baseline_pilot = v6_baseline.objects[BLOCKRUNNER_V6_BASELINE['pilotMeshName']]
    assert body_response == response_record(baseline_body.material_slots[0].material)
    for index in range(4):
        assert response_record(original_pilot.material_slots[index].material) == response_record(baseline_pilot.material_slots[index].material)
    report['nonColorPrincipledResponsesMatchV6'] = True
''' + point)
f = replace_once(f, "    report['objectLineageScope'] = 'Original source/fit to V7 consolidation ranges; ownerCopies maps V7 polygon/loop indices identically to V8.'\n", "    report['objectLineageScope'] = 'Inherited original source/fit-to-V2 ranges; unchanged polygon/loop lineage through V4B/V7; ownerCopies maps V7 identically to V8.'\n    report['parentOwnerCopies'] = BLOCKRUNNER_PAINT_AUTHOR['ownerCopies']\n    report['normalEncodingBudget'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudget']\n")
point = "    report['paintSignature'] = source_signature(target)\n"
f = replace_once(f, point, '''    report['paintAttributeSignatures'] = paint_attribute_signatures(target)
    for old_name, new_name in [(BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BODY_NAME), (BLOCKRUNNER_PAINT_STATE['pilotMeshName'], PILOT_NAME)]:
        assert report['paintAttributeSignatures'][new_name] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures'][old_name]
    report['atlasGraphSignatures'] = wrap_atlas_graph_signatures(target)
    report['atlasPackedImageRecords'] = wrap_linked_image_records(target)
    assert report['atlasPackedImageRecords'] == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
    texture_nodes = [node for material in owned_materials for node in material.node_tree.nodes if node.bl_idname == 'ShaderNodeTexImage']
    assert len(texture_nodes) == 10 and all(node.extension == 'EXTEND' for node in texture_nodes)
    report['allTenAtlasNodesClamped'] = True
''' + point)
f = replace_once(f, '    success = True\nfinally:', '    candidate_ready = True\nfinally:')
a = f.index('\nfinally:\n')
old_finally = f[a:]
verification = old_finally[old_finally.index('    if source_before is not None:'):]
verification = replace_once(verification, '    print_receipt(report)\n', '')
point = "    report['globalPreservation'] = verify_global(snapshot)\n"
verification = replace_once(verification, point, '''    if paint_before is not None:
        assert paint_attribute_signatures(paint) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
        assert contact_graph_signatures(paint) == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']
        assert wrap_linked_image_records(paint) == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
        report['proceduralContactGraphsMasksPackedImagesPreserved'] = True
    if contact_parent_graphs is not None:
        assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
        assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
        assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
        assert contact_graph_signatures(contact_parent) == contact_parent_graphs
        assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_V6_BASELINE['atlasPackedImageRecords']
        report['v4bGeometryNormalsMasksGraphsAndImagesPreserved'] = True
    if v6_baseline is not None:
        assert source_signature(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintSignature']
        assert wrap_normal_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintCornerNormalSignature']
        assert paint_attribute_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['paintAttributeSignatures']
        assert wrap_atlas_graph_signatures(v6_baseline) == BLOCKRUNNER_V6_BASELINE['atlasGraphSignatures']
        assert wrap_linked_image_records(v6_baseline) == BLOCKRUNNER_V6_BASELINE['atlasPackedImageRecords']
        report['v6AtlasPreserved'] = True
''' + point)
f = f[:a] + '\nfinally:\n    try:\n        restore_context(snapshot)\n' + '\n'.join('    ' + line if line else line for line in verification.split('\n')) + '''
        success = candidate_ready
    finally:
        if not success:
            for ob in reversed(owned_objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            if target is not None:
                bpy.data.scenes.remove(target)
            for mesh in owned_meshes:
                assert mesh.users == 0
                bpy.data.meshes.remove(mesh)
            for material in owned_materials:
                assert material.users == 0
                bpy.data.materials.remove(material)
        report['newSceneRetained'] = success
        report['status'] = ('new clamped V8 atlas copy created; matched image and export validation pending'
                            if success else 'V8 atlas candidate rolled back; execution or preservation guard failed')
        print_receipt(report)
'''
payload = prefix + '\n'.join(name + ' = json.loads(' + repr(json.dumps(value, separators=(',', ':'), allow_nan=False)) + ')' for name, value in values.items()) + '\n' + f
tree = ast.parse(payload)
for node in ast.walk(tree):
    assert not isinstance(node, ast.Lambda)
    if isinstance(node, ast.Import):
        assert all(a.name in {'bpy', 'math', 'json', 'collections', 'mathutils'} for a in node.names)
    if isinstance(node, ast.ImportFrom):
        assert node.module in {'bpy', 'math', 'json', 'collections', 'mathutils'}
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {'getattr', 'hasattr', 'setattr'}:
        assert isinstance(node.args[1], ast.Constant) and isinstance(node.args[1].value, str)
    if isinstance(node, ast.Name):
        assert node.id not in {'exec', 'eval', 'open', 'globals', 'locals', 'Path', 'os', 'hashlib', 'traceback'} and not node.id.startswith('__')
    if isinstance(node, ast.Attribute):
        assert not node.attr.startswith('__')
assert len(payload.encode()) < 200000
with OUTPUT.open('x') as handle:
    handle.write(payload)
meta = OUTPUT.with_suffix('.preparation.json')
assert not meta.exists()
with meta.open('x') as handle:
    json.dump({'status': 'prepared only; no Blender execution', 'payload': digest(OUTPUT), 'actualLatestState': digest(BASE / 'bake-v7-pilot-color-receipt.json'), 'actualAuthor': digest(BASE / 'contact-author-v7-receipt.json'), 'actualBakeReceipts': [digest(BASE / name) for name in bake_names], 'imageInputs': image_pins, 'sourceFragments': [digest(BASE / name) for name in names + ['11b-copy-finalize-atlas-v3-socket-iteration.py']], 'changes': 'Two unchanged geometry owners, 1 body + 4 pilot simple atlas materials, exact V6 non-color response, ten EXTEND image nodes; V7 color masters plus explicit original V4B roughness reuse; no bake/export/LOD/normalization', 'staticChecks': 'AST/allowed imports/literal attribute names/payload size pass'}, handle, indent=2)
    handle.write('\n')
print(json.dumps(digest(OUTPUT), indent=2))
