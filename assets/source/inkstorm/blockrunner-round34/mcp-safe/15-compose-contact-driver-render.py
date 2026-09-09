"""EXTERNAL ONLY. Compose an actual-receipt-driven V7 matched driver render.
No Blender execution. Creates a new payload only after successful author receipt.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--state', required=True)
parser.add_argument('--token', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
assert 6 <= len(args.token) <= 32 and all(c.isascii() and (c.isalnum() or c == '-') for c in args.token)
output = BASE / args.output
assert output.resolve().is_relative_to(BASE) and not output.exists()
image_path = BASE.parent / f'paint-v1-driver-{args.token}.png'
assert not image_path.exists()


def read(name):
    return json.loads((BASE / name).read_text())


def subset(data, keys):
    return {key: data[key] for key in keys.split()}


def replace_once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new)


def digest(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


state = read(args.state)
assert state['stage'] == 'copy-short-contact-color-v7' and state['newSceneRetained']
assert state['parentContactGraphsPreserved'] and state['parentPackedImagesPreserved']
assert state['parentPaintPreserved'] and state['parentPaintCornerNormalsPreserved'] and state['parentPaintAttributesPreserved']
assert state['sourcePreservation'] and state['sourceCornerNormalsPreserved'] and state['fitPreservation'] and state['fitCornerNormalsPreserved']
assert state['targetScene'] == 'PodRacing — Blockrunner short contact color round34 V7'
assert state['bodyMeshName'] == 'blockrunner-body-paint-v7' and state['pilotMeshName'] == 'blockrunner-pilot-paint-v7'
assert len(state['contactGraphSignatures']) == 7 and len(state['packedImageRecords']) == 2
assert state['contactSettings'] == {'distanceSourceWorldUnits': .16, 'strength': .38, 'samples': 16, 'inside': False, 'onlyLocal': False, 'normalInput': 'unlinked source shading normal'}
audit = read('audit-receipt.json')
fit = read('control-fit-v1-receipt.json')
camera = read('atlas-clamp-v6-driver-render-receipt.json')
parent = read('bake-v4b-pilot-roughness-receipt.json')
parent_images = read('atlas-clamp-v6-receipt.json')['atlasPackedImageRecords']
assert camera['status'] == 'rendered; human inspection pending' and camera['exactOriginalCameraReused']
names = ['00-source-reference.py', '01-source-guard.py', '13-v4-attribute-signatures.py', '14-atlas-wrap-guards.py', '15d-ao-contact-guards.py']
prefix = '\n'.join((BASE / name).read_text() for name in names) + '\n'
values = {
 'BLOCKRUNNER_AUDIT': subset(audit, 'status sourcePreservation sourceUid sourceReference globalPreservation sourceSignature'),
 'BLOCKRUNNER_CONTROL_FIT_RECEIPT': subset(fit, 'sourceUid sourcePreservation sourceCornerNormalsPreserved newSceneRetained cleanupPreservation cleanupCornerNormalsPreserved status globalPreservation targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_STATE': subset(state, 'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages contactGraphSignatures packedImageRecords contactSettings'),
 'BLOCKRUNNER_SOURCE_RENDER': subset(camera, 'view sourceUid sourcePreservation camera lighting sourceBounds path'),
 'BLOCKRUNNER_CONTACT_PARENT': subset(parent, 'targetScene paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages'),
 'BLOCKRUNNER_CONTACT_PARENT_IMAGES': parent_images,
 'BLOCKRUNNER_VIEW': 'driver', 'BLOCKRUNNER_RENDER_TOKEN': args.token}
fragment = (BASE / 'render-paint-comparison-v1.py').read_text()
fragment = replace_once(fragment, 'stage = None\n', 'stage = None\ncontact_parent = None\ncontact_parent_graphs = None\nsource_normals_before = None\n')
fragment = replace_once(fragment, '    before = source_signature(source)\n', '    before = source_signature(source)\n    source_normals_before = wrap_normal_signatures(source)\n')
point = '    cleanup_before = source_signature(cleanup)\n'
check = '''    assert paint_attribute_signatures(cleanup) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert contact_graph_signatures(cleanup) == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']
    assert wrap_linked_image_records(cleanup) == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
    contact_parent = bpy.data.scenes.get(BLOCKRUNNER_CONTACT_PARENT['targetScene'])
    assert contact_parent is not None
    assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
    assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
    assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
    assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_CONTACT_PARENT_IMAGES
    contact_parent_graphs = contact_graph_signatures(contact_parent)
'''
fragment = replace_once(fragment, point, point + check)
start = fragment.index('        polygon_material_indices = [polygon.material_index for polygon in mesh.polygons]')
end = fragment.index("        ob = bpy.data.objects.new('Blockrunner neutral copy '", start)
fragment = fragment[:start] + '''        for slot_index, slot in enumerate(original.material_slots):
            assert slot.material is not None
            material = copied_materials.get(slot.material)
            if material is None:
                material = slot.material.copy()
                copied_materials[slot.material] = material
                owned_materials.append(material)
                copied_graph = contact_material_record(material)
                copied_graph['name'] = slot.material.name
                assert copied_graph == contact_material_record(slot.material)
            mesh.materials[slot_index] = material
        assert wrap_geometry_record(mesh) == wrap_geometry_record(original.data)
        assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature'][original.name]
''' + fragment[end:]
point = '        ob.hide_render = original.hide_render\n'
fragment = replace_once(fragment, point, point + '''        assert paint_attribute_signatures(stage)[ob.name] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures'][original.name]
''')
point = "    report['camera'] = dict(BLOCKRUNNER_SOURCE_RENDER['camera'])\n"
fragment = replace_once(fragment, point, point + '''    report['contactSettings'] = BLOCKRUNNER_PAINT_STATE['contactSettings']
    report['contactShadeScope'] = 'AO evaluated on this temporary two-owner copy; no floor or additional occluding geometry. Original V7 untouched. Same V6 camera, lights and 1280x960 output; both owners remain renderable.'
    assert len([ob for ob in stage.objects if ob.type == 'MESH']) == 2
''')
# Always remove temporary copies even when restoration asserts. As with the
# actual source author stage, successful status is printed only after guards.
fragment = replace_once(fragment, 'finally:\n    restore_context(snapshot)\n', 'finally:\n    try:\n        restore_context(snapshot)\n    finally:\n')
a = fragment.index('    for ob in reversed(owned_objects):', fragment.index('\nfinally:\n'))
z = fragment.index('    if before is not None:', a)
fragment = fragment[:a] + '\n'.join('    ' + line if line else line for line in fragment[a:z].split('\n')) + fragment[z:]
point = "    report['globalPreservation'] = verify_global(snapshot)\n"
extra = '''    if source_normals_before is not None:
        report['sourceCornerNormalsPreserved'] = wrap_normal_signatures(source) == source_normals_before
        assert report['sourceCornerNormalsPreserved']
    if cleanup_before is not None:
        report['paintAttributeSignatures'] = paint_attribute_signatures(cleanup)
        report['contactGraphSignatures'] = contact_graph_signatures(cleanup)
        report['packedImageRecords'] = wrap_linked_image_records(cleanup)
        assert report['paintAttributeSignatures'] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
        assert report['contactGraphSignatures'] == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']
        assert report['packedImageRecords'] == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
        report['paintContactGraphsAndImagesPreserved'] = True
    if contact_parent_graphs is not None:
        assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
        assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
        assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
        assert contact_graph_signatures(contact_parent) == contact_parent_graphs
        assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_CONTACT_PARENT_IMAGES
        report['v4bGeometryNormalsMasksGraphsAndImagesPreserved'] = True
'''
fragment = replace_once(fragment, point, extra + point)
fragment = replace_once(fragment, '    print_receipt(report)\n', '')
fragment += '    print_receipt(report)\n'
payload = prefix + '\n'.join(name + ' = json.loads(' + repr(json.dumps(value, separators=(',', ':'), allow_nan=False)) + ')' for name, value in values.items()) + '\n' + fragment
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
with output.open('x') as handle:
    handle.write(payload)
inventory = {'status': 'prepared only; no Blender execution', 'payload': digest(output),
             'actualAuthorReceipt': digest(BASE / args.state), 'matchedActualCameraReceipt': digest(BASE / 'atlas-clamp-v6-driver-render-receipt.json'),
             'outputImageReserved': str(image_path), 'sourceFragments': [digest(BASE / n) for n in names + ['render-paint-comparison-v1.py']],
             'staticValidation': 'AST and safe import/literal attribute checks pass; temporary copies only; no new bake or stored-scene mutation'}
meta = output.with_suffix('.preparation.json')
assert not meta.exists()
with meta.open('x') as handle:
    json.dump(inventory, handle, indent=2)
    handle.write('\n')
print(json.dumps(inventory['payload'], indent=2))
