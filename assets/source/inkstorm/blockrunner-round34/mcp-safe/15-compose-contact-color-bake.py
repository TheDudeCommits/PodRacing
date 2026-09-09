"""EXTERNAL ONLY. Compose one actual-receipt-driven V7 color bake; no Blender.
Two calls: body from author, then pilot from the actual successful body receipt.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--state', required=True)
p.add_argument('--owner', choices=['body', 'pilot'], required=True)
p.add_argument('--token', required=True)
p.add_argument('--output', required=True)
args = p.parse_args()
assert 6 <= len(args.token) <= 32 and all(c.isascii() and (c.isalnum() or c == '-') for c in args.token)
output = BASE / args.output
assert output.resolve().is_relative_to(BASE) and not output.exists()
image_path = BASE.parent / f'blockrunner-{args.owner}-color-v1-{args.token}.png'
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
author = read('contact-author-v7-receipt.json')
render = read('contact-v7-driver-render-receipt.json')
assert render['status'] == 'rendered; human inspection pending'
assert render['paintContactGraphsAndImagesPreserved'] and render['v4bGeometryNormalsMasksGraphsAndImagesPreserved']
assert render['contactGraphSignatures'] == author['contactGraphSignatures']
assert state['targetScene'] == author['targetScene'] == 'PodRacing — Blockrunner short contact color round34 V7'
assert state['bodyMeshName'] == 'blockrunner-body-paint-v7' and state['pilotMeshName'] == 'blockrunner-pilot-paint-v7'
assert state['meshObjects'] == 2 and state['triangles'] == 44028
assert len(state['contactGraphSignatures']) == 7
assert len(state['packedImageRecords']) == (2 if args.owner == 'body' else 3)
if args.owner == 'body':
    assert state['stage'] == 'copy-short-contact-color-v7' and state['newSceneRetained']
else:
    assert state['owner'] == 'body' and state['channel'] == 'color' and state['newImageRetained']
    assert state['extendedContactGraphsRestored'] and state['proceduralGraphsRestored']
audit = read('audit-receipt.json')
fit = read('control-fit-v1-receipt.json')
parent = read('bake-v4b-pilot-roughness-receipt.json')
parent_images = read('atlas-clamp-v6-receipt.json')['atlasPackedImageRecords']
names = ['00-source-reference.py', '01-source-guard.py', '13-v4-attribute-signatures.py', '14-atlas-wrap-guards.py', '15d-ao-contact-guards.py', '15-contact-bake-guards.py']
prefix = '\n'.join((BASE / name).read_text() for name in names) + '\n'
values = {
 'BLOCKRUNNER_AUDIT': subset(audit, 'sourceSignature'),
 'BLOCKRUNNER_FIT': subset(fit, 'targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_STATE': subset(state, 'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages contactGraphSignatures packedImageRecords'),
 'BLOCKRUNNER_CONTACT_PARENT': subset(parent, 'targetScene paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages'),
 'BLOCKRUNNER_CONTACT_PARENT_IMAGES': parent_images,
 'BLOCKRUNNER_CONTACT_SETTINGS': author['contactSettings'],
 'BLOCKRUNNER_REUSED_ROUGHNESS': author['reusedRoughnessMasterAuthority'],
 'BLOCKRUNNER_ATLAS_OWNER': args.owner, 'BLOCKRUNNER_ATLAS_CHANNEL': 'color', 'BLOCKRUNNER_BAKE_TOKEN': args.token}
f = (BASE / '10-bake-atlas-channel-v1.py').read_text()
f = replace_once(f, 'restoration_errors = []\n', 'restoration_errors = []\nvalidated = False\ncontact_parent = None\ncontact_parent_graphs = None\n')
point = '    paint_before = source_signature(paint)\n'
f = replace_once(f, point, point + '''    assert paint_attribute_signatures(paint) == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert contact_graph_signatures(paint) == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']
    assert wrap_linked_image_records(paint) == BLOCKRUNNER_PAINT_STATE['packedImageRecords']
    assert all(not ob.hide_render for ob in paint.objects if ob.type == 'MESH')
    contact_parent = bpy.data.scenes.get(BLOCKRUNNER_CONTACT_PARENT['targetScene'])
    assert contact_parent is not None
    assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
    assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
    assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
    assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_CONTACT_PARENT_IMAGES
    contact_parent_graphs = contact_graph_signatures(contact_parent)
''')
f = replace_once(f, "        assert nodes.get(CHANNEL_NODE) is not None\n", '''        assert CHANNEL_NODE == 'Inkstorm Paint Color'
        assert nodes[CHANNEL_NODE].bl_idname == 'ShaderNodeMixRGB'
        assert nodes[CHANNEL_NODE].blend_type == 'MULTIPLY'
        assert abs(nodes[CHANNEL_NODE].inputs[0].default_value - .38) < .000001
        ao = nodes['Inkstorm Short Contact AO V7']
        assert ao.bl_idname == 'ShaderNodeAmbientOcclusion'
        assert abs(ao.inputs['Distance'].default_value - .16) < .000001
        assert ao.samples == 16 and not ao.only_local and not ao.inside
        assert not ao.inputs['Normal'].is_linked
        assert len(nodes[CHANNEL_NODE].inputs[2].links) == 1
        assert nodes[CHANNEL_NODE].inputs[2].links[0].from_socket == ao.outputs['AO']
''')
f = replace_once(f, "'before': material_record(material),\n", "'before': material_record(material), 'contactBefore': contact_material_record(material),\n")
point = "        links.new(emission.outputs[0], state['output'].inputs['Surface'])\n"
f = replace_once(f, point, point + '''        assert len(emission.inputs['Color'].links) == 1
        assert emission.inputs['Color'].links[0].from_socket == nodes[CHANNEL_NODE].outputs[0]
        assert emission.inputs['Strength'].default_value == 1
        assert len(state['output'].inputs['Surface'].links) == 1
        assert state['output'].inputs['Surface'].links[0].from_node == emission
        assert contact_normalized_emission_graph(material, state) == state['contactBefore'], 'Unexpected temporary bake graph mutation.'
''')
# Mark removed handles explicitly, so the outer failure rollback is idempotent.
f = replace_once(f, "            nodes.remove(state['emissionNode'])\n", "            nodes.remove(state['emissionNode'])\n            state['emissionNode'] = None\n")
f = replace_once(f, "            nodes.remove(state['imageNode'])\n", "            nodes.remove(state['imageNode'])\n            state['imageNode'] = None\n")
f = replace_once(f, '            bpy.data.images.remove(image)\n', '            bpy.data.images.remove(image)\n            image = None\n')
point = "        after = material_record(material)\n"
f = replace_once(f, point, '''        contact_after = contact_material_record(material)
        if success:
            contact_after['nodes'] = [row for row in contact_after['nodes'] if row['name'] != state['imageNode'].name]
            contact_after['activeNode'] = state['contactBefore']['activeNode']
        if contact_after != state['contactBefore']:
            restoration_errors.append('Extended AO graph changed: ' + material.name)
''' + point)
point = "    report['globalPreservation'] = verify_global(snapshot)\n"
f = replace_once(f, point, '''    if paint_meshes_before is not None:
        report['paintAttributeSignatures'] = paint_attribute_signatures(paint)
        assert report['paintAttributeSignatures'] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
        report['contactGraphSignatures'] = contact_graph_signatures(paint)
        report['packedImageRecords'] = wrap_linked_image_records(paint)
        for image_name, previous_image in BLOCKRUNNER_PAINT_STATE['packedImageRecords'].items():
            assert report['packedImageRecords'][image_name] == previous_image
        assert len(report['packedImageRecords']) == len(BLOCKRUNNER_PAINT_STATE['packedImageRecords']) + (1 if success else 0)
        untouched = set(BLOCKRUNNER_PAINT_STATE['contactGraphSignatures']) - {state['material'].name for state in material_states}
        for material_name in untouched:
            assert report['contactGraphSignatures'][material_name] == BLOCKRUNNER_PAINT_STATE['contactGraphSignatures'][material_name]
        report['existingPackedImagesPreserved'] = True
        report['untouchedOwnerContactGraphsExact'] = True
        report['extendedContactGraphsRestored'] = not restoration_errors
        report['contactSettings'] = BLOCKRUNNER_CONTACT_SETTINGS
        report['reusedRoughnessMasterAuthority'] = BLOCKRUNNER_REUSED_ROUGHNESS
        report['contactBakeScope'] = 'New color-only EMIT image from final AO-composited output. Both source owners renderable; AO16 and Cycles1 samples. Original V4B roughness masters reused unchanged, not rebaked.'
    if contact_parent_graphs is not None:
        assert source_signature(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintSignature']
        assert wrap_normal_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintCornerNormalSignature']
        assert paint_attribute_signatures(contact_parent) == BLOCKRUNNER_CONTACT_PARENT['paintAttributeSignatures']
        assert contact_graph_signatures(contact_parent) == contact_parent_graphs
        assert wrap_linked_image_records(contact_parent) == BLOCKRUNNER_CONTACT_PARENT_IMAGES
        report['v4bGeometryNormalsMasksGraphsAndImagesPreserved'] = True
''' + point)
f = replace_once(f, '    print_receipt(report)\n', '')
# Existing graph restoration and all new preservation assertions now happen
# inside a transaction. A post-bake guard failure drops ONLY new targets/image.
start = f.index('\nfinally:\n')
head = f[:start]
restoration = f[start + len('\nfinally:\n'):]
f = head + '\nfinally:\n    try:\n' + '\n'.join('    ' + line if line else line for line in restoration.split('\n')) + '''
        if paint_settings_before is not None:
            assert report['paintBakeSettingsRestored']
        if paint_selected is not None:
            assert report['paintLayerSelectionRestored']
        validated = success
    finally:
        if not validated:
            for state in material_states:
                nodes, links = state['material'].node_tree.nodes, state['material'].node_tree.links
                if state['emissionNode'] is not None:
                    for link in list(state['output'].inputs['Surface'].links):
                        links.remove(link)
                    for old_source, old_target in state['surfaceLinks']:
                        links.new(old_source, old_target)
                    nodes.remove(state['emissionNode'])
                    state['emissionNode'] = None
                if state['imageNode'] is not None:
                    nodes.remove(state['imageNode'])
                    state['imageNode'] = None
                nodes.active = state['activeNode']
            if image is not None:
                assert image.users == 0
                bpy.data.images.remove(image)
                image = None
        if paint_settings_before is not None:
            restore_bake_settings(paint, paint_settings_before)
        if paint_selected is not None:
            for ob in paint_layer.objects:
                ob.select_set(ob in paint_selected, view_layer=paint_layer)
            paint_layer.objects.active = paint_active
        restore_context(snapshot)
        report['newImageRetained'] = validated
        report['partialOutputMayExistOnFailure'] = output_file_write_started and not validated
        if not validated:
            report['status'] = 'Color bake failed validation; new image nodes/datablock rolled back; any written private PNG remains for inspection'
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
with output.open('x') as handle:
    handle.write(payload)
meta = output.with_suffix('.preparation.json')
assert not meta.exists()
with meta.open('x') as handle:
    json.dump({'status': 'prepared only; no Blender execution', 'payload': digest(output), 'state': digest(BASE / args.state), 'actualDriverReceipt': digest(BASE / 'contact-v7-driver-render-receipt.json'), 'owner': args.owner, 'channel': 'color', 'outputImageReserved': str(image_path), 'sourceFragments': [digest(BASE / name) for name in names + ['10-bake-atlas-channel-v1.py']], 'roughnessTreatment': 'Existing original V4B masters retained; no new roughness bake', 'staticChecks': 'AST/allowed imports/literal attribute names/payload size pass'}, handle, indent=2)
    handle.write('\n')
print(json.dumps(digest(output), indent=2))
