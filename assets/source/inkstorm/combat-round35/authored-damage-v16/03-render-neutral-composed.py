"""DEFINITIONS ONLY. Concatenate 00-source-reference.py before this fragment.

Prepared for Blender MCP, not executed. No import, transform, save, render or
filesystem operation occurs here. Each stage explicitly calls the guards.
"""
import bpy
import collections
import json
import math
from mathutils import Vector


def fnv1a64_signature(value):
    # Non-cryptographic JSON signature. ASCII escaping and separators are
    # pinned identically to the externally prepared hierarchy reference.
    serialized = json.dumps(value, sort_keys=True, separators=(',', ':'),
                            allow_nan=False, ensure_ascii=True)
    signature = 14695981039346656037
    for character in serialized:
        signature = ((signature ^ ord(character)) * 1099511628211) & 18446744073709551615
    return format(signature, '016x')


def name_key(item):
    return item.name


def first_component_vertex_key(pair):
    return min(pair[1])

def matrix_rows(matrix):
    return [list(row) for row in matrix]


def bounds(points):
    points = list(points)
    if not points:
        return None
    return [[min(p[k] for p in points) for k in range(3)],
            [max(p[k] for p in points) for k in range(3)]]


def mesh_signature(mesh):
    # Non-cryptographic numeric signatures compare same-session structure,
    # never presented as byte equality between a Blender mesh and a GLB.
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth)
                     for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data])
               for layer in mesh.uv_layers],
        'materials': [m.name if m else None for m in mesh.materials],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None,
        'attributes': [(a.name, a.data_type, a.domain, len(a.data))
                       for a in mesh.attributes],
    })


def socket_value(socket):
    if not hasattr(socket, 'default_value'):
        return None
    value = socket.default_value
    if isinstance(value, (str, bool, int, float)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def material_record(material):
    record = {'name': material.name, 'diffuseColor': list(material.diffuse_color),
              'useNodes': material.use_nodes,
              'roughness': material.roughness, 'metallic': material.metallic,
              'useBackfaceCulling': material.use_backface_culling,
              'nodes': [], 'links': []}
    if material.use_nodes and material.node_tree:
        for node in sorted(material.node_tree.nodes, key=name_key):
            row = {'name': node.name, 'type': node.bl_idname,
                   'inputs': [(s.name, socket_value(s)) for s in node.inputs]}
            if hasattr(node, 'image'):
                row['image'] = node.image.name if node.image else None
            record['nodes'].append(row)
        record['links'] = sorted((l.from_node.name, l.from_socket.name,
                                  l.to_node.name, l.to_socket.name)
                                 for l in material.node_tree.links)
    return record


def source_signature(source):
    rows = []
    meshes = {}
    materials = {}
    for ob in sorted(source.objects, key=name_key):
        rows.append({'name': ob.name, 'type': ob.type,
                     'parent': ob.parent.name if ob.parent else None,
                     'matrixLocal': matrix_rows(ob.matrix_local),
                     'matrixWorld': matrix_rows(ob.matrix_world),
                     'data': ob.data.name if ob.data else None,
                     'hideRender': ob.hide_render,
                     'hideViewport': ob.hide_viewport,
                     'materials': [(s.link, s.material.name if s.material else None)
                                   for s in ob.material_slots]})
        if ob.type == 'MESH':
            meshes[ob.data.name] = mesh_signature(ob.data)
            for slot in ob.material_slots:
                if slot.material:
                    materials[slot.material.name] = material_record(slot.material)
    return {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
            'objectsFnv1a64': fnv1a64_signature(rows), 'meshesFnv1a64': meshes,
            'materialsFnv1a64': {name: fnv1a64_signature(row) for name, row in materials.items()}}


def global_snapshot():
    # Capture every preexisting scene/collection, including the unrelated
    # Cruise work and all isolated historical studies. No fixed scene count.
    window = bpy.context.window
    assert window is not None, 'Requires the existing interactive Blender window.'
    layer = window.view_layer
    return {'window': window, 'scene': window.scene, 'layer': layer,
            'active': layer.objects.active,
            'selected': {o for o in layer.objects if o.select_get(view_layer=layer)},
            'scenes': {s: (set(s.objects), set(s.collection.children),
                           s.frame_current, s.frame_subframe, s.camera, s.world)
                       for s in bpy.data.scenes},
            'collections': {c: (set(c.objects), set(c.children))
                            for c in bpy.data.collections},
            'objects': set(bpy.data.objects), 'meshes': set(bpy.data.meshes),
            'materials': set(bpy.data.materials)}


def restore_context(snapshot):
    # The stages never use selection operators on preexisting objects.
    snapshot['window'].scene = snapshot['scene']
    snapshot['window'].view_layer = snapshot['layer']
    assert snapshot['layer'].objects.active == snapshot['active'], 'Active object changed.'
    assert {o for o in snapshot['layer'].objects
            if o.select_get(view_layer=snapshot['layer'])} == snapshot['selected'], 'Selection changed.'


def verify_global(snapshot):
    restore_context(snapshot)
    scenes = [s.name for s, old in snapshot['scenes'].items()
              if (set(s.objects), set(s.collection.children), s.frame_current,
                  s.frame_subframe, s.camera, s.world) != old]
    collections_changed = [c.name for c, old in snapshot['collections'].items()
                           if (set(c.objects), set(c.children)) != old]
    result = {'preexistingScenes': len(snapshot['scenes']),
              'changedScenes': scenes, 'changedCollections': collections_changed,
              'contextRestored': True,
              'preexistingObjectsRetained': snapshot['objects'] <= set(bpy.data.objects),
              'preexistingMeshesRetained': snapshot['meshes'] <= set(bpy.data.meshes),
              'preexistingMaterialsRetained': snapshot['materials'] <= set(bpy.data.materials)}
    assert not scenes and not collections_changed, result
    assert all(result[k] for k in ('preexistingObjectsRetained',
                                  'preexistingMeshesRetained', 'preexistingMaterialsRetained'))
    return result


SOURCE_RECEIPT={'objectLineage': [{'importedName': 'teemto-cockpit.010', 'object': 'Teemto V16 intact | teemto-cockpit.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-cockpit-body.010', 'object': 'Teemto V16 intact | teemto-cockpit-body.010', 'triangles': 17923, 'type': 'MESH', 'worldBounds': [[-4.178723335266113, -15.937384605407715, 1.001510739326477], [4.177325248718262, 7.389999866485596, 5.13743257522583]]}, {'importedName': 'teemto-cockpit-graphite-v2.004', 'object': 'Teemto V16 intact | teemto-cockpit-graphite-v2.004', 'triangles': 336, 'type': 'MESH', 'worldBounds': [[-0.5084967017173767, 3.436000108718872, 2.124769449234009], [0.5584967136383057, 7.064000129699707, 2.819999933242798]]}, {'importedName': 'teemto-engine-left.010', 'object': 'Teemto V16 intact | teemto-engine-left.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-left-body.013', 'object': 'Teemto V16 intact | teemto-engine-left-body.013', 'triangles': 11790, 'type': 'MESH', 'worldBounds': [[-6.54527473449707, -22.738540649414062, 0.07286620140075684], [-1.3186402320861816, -5.0940141677856445, 5.191770553588867]]}, {'importedName': 'teemto-engine-right.010', 'object': 'Teemto V16 intact | teemto-engine-right.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-right-body.013', 'object': 'Teemto V16 intact | teemto-engine-right-body.013', 'triangles': 11790, 'type': 'MESH', 'worldBounds': [[1.2777190208435059, -22.736522674560547, 0.11396288871765137], [6.496447563171387, -5.1262664794921875, 5.250973701477051]]}, {'importedName': 'teemto-pilot-construction-v4b.011', 'object': 'Teemto V16 intact | teemto-pilot-construction-v4b.011', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-pilot-accent.012', 'object': 'Teemto V16 intact | teemto-pilot-accent.012', 'triangles': 188, 'type': 'MESH', 'worldBounds': [[-0.3497789800167084, 5.051327228546143, 2.1751253604888916], [0.3465256690979004, 5.6404194831848145, 3.2211050987243652]]}, {'importedName': 'teemto-pilot-hardware.012', 'object': 'Teemto V16 intact | teemto-pilot-hardware.012', 'triangles': 1552, 'type': 'MESH', 'worldBounds': [[-0.17999997735023499, 5.061928749084473, 2.403860569000244], [0.18000000715255737, 5.627439498901367, 3.215754508972168]]}, {'importedName': 'teemto-pilot-rubber.011', 'object': 'Teemto V16 intact | teemto-pilot-rubber.011', 'triangles': 2228, 'type': 'MESH', 'worldBounds': [[-0.38293713331222534, 4.128168106079102, 2.29592227935791], [0.4204370379447937, 5.509989261627197, 2.9088850021362305]]}, {'importedName': 'teemto-pilot-shell.012', 'object': 'Teemto V16 intact | teemto-pilot-shell.012', 'triangles': 1444, 'type': 'MESH', 'worldBounds': [[-0.21125000715255737, 5.070261001586914, 2.2050418853759766], [0.21125000715255737, 5.660841464996338, 3.2183940410614014]]}, {'importedName': 'teemto-pilot-suit.014', 'object': 'Teemto V16 intact | teemto-pilot-suit.014', 'triangles': 9359, 'type': 'MESH', 'worldBounds': [[-0.37821540236473083, 4.231770992279053, 2.0615973472595215], [0.3790219724178314, 5.545644283294678, 2.8416998386383057]]}, {'importedName': 'teemto-pilot-webbing.011', 'object': 'Teemto V16 intact | teemto-pilot-webbing.011', 'triangles': 1008, 'type': 'MESH', 'worldBounds': [[-0.22436034679412842, 5.0683794021606445, 2.1737446784973145], [0.22436034679412842, 5.492895603179932, 2.8099563121795654]]}], 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 158}, 'scene': 'PodRacing — Teemto damage V16 pinned intact source', 'sceneCountAfter': 159, 'source': '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/intact-teemto-hero-open-v2.glb', 'sourceByteSha256External': 'af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e', 'sourceCornerNormalSignature': {'Teemto V16 intact | teemto-cockpit-body.010': '9382f910099bc601', 'Teemto V16 intact | teemto-cockpit-graphite-v2.004': '132df80f7c33ca18', 'Teemto V16 intact | teemto-engine-left-body.013': '3b500e2c7a5825dd', 'Teemto V16 intact | teemto-engine-right-body.013': '7aef17b76c4e629a', 'Teemto V16 intact | teemto-pilot-accent.012': '7c08fe40eb2c04d1', 'Teemto V16 intact | teemto-pilot-hardware.012': '88181e21307fa0e5', 'Teemto V16 intact | teemto-pilot-rubber.011': 'e49cfe35f0906308', 'Teemto V16 intact | teemto-pilot-shell.012': 'f4ffdc2e4c748718', 'Teemto V16 intact | teemto-pilot-suit.014': 'e575604e8cb0aaef', 'Teemto V16 intact | teemto-pilot-webbing.011': '8262de21606329fe'}, 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.010': '84a190a31752d503', 'Inkstorm Teemto Propulsores.010': '357ee598525ed769', 'Inkstorm Teemto open cockpit graphite structure v2.002': '3bb7c93e1e5773b7', 'Pilot atlas v4c runtime accent.010': '64b1bc57c8cd87d3', 'Pilot atlas v4c runtime hardware.010': '687498f7c34d4d21', 'Pilot atlas v4c runtime rubber.010': '01dd8b072d5a718b', 'Pilot atlas v4c runtime shell.010': '7dd33061bdb7833d', 'Pilot atlas v4c runtime suit.010': '68c35d6d93fb236c', 'Pilot atlas v4c runtime webbing.010': '4a58791ddae39d97'}, 'meshesFnv1a64': {'Original Inkstorm pilot v4b accent.020': '9a067cd28a08e408', 'Original Inkstorm pilot v4b hardware.020': 'a694a60f635a2188', 'Original Inkstorm pilot v4b rubber.020': 'd2ae9e9a36310ea7', 'Original Inkstorm pilot v4b shell.020': 'fc291625cd603f3b', 'Original Inkstorm pilot v4b suit.020': '7f0f525457296020', 'Original Inkstorm pilot v4b webbing.020': '4375ac6750711674', 'Pilot v4b unchanged body Inkstorm Teemto Propulsores-alerones_low.002_Propulsores_0.014': '5cd3bbc196fde3be', 'Pilot v4b unchanged body Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.014': 'a3e922f57e854300', 'teemto-cockpit-graphite-v2.004': 'a890cdd6a57013c4', 'teemto-open-cockpit-hull-v2.004': 'f07a34b64d7003e1'}, 'objectsFnv1a64': '2b999a793171538b'}, 'stage': 'V16 pinned source import', 'success': True}
DAMAGE_RECEIPT={'damageCornerNormalSignature': {'Teemto V16 retained | Teemto V16 intact | teemto-cockpit-graphite-v2.004': '132df80f7c33ca18', 'Teemto V16 retained | Teemto V16 intact | teemto-engine-left-body.013': '3b500e2c7a5825dd', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-accent.012': '7c08fe40eb2c04d1', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-hardware.012': '88181e21307fa0e5', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-rubber.011': 'e49cfe35f0906308', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-shell.012': 'f4ffdc2e4c748718', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-suit.014': 'e575604e8cb0aaef', 'Teemto V16 retained | Teemto V16 intact | teemto-pilot-webbing.011': '8262de21606329fe', 'teemto-damage-cockpit-stubs-v16': '2378efe3c3756802', 'teemto-damage-right-front-v16': '1481e68878b3a3b3', 'teemto-damage-right-rear-v16': '91bd99b2f0fab2d5', 'teemto-damage-severed-tethers-v16': '6408ddcbd6826002'}, 'damageSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.010': '84a190a31752d503', 'Inkstorm Teemto Propulsores.010': '357ee598525ed769', 'Inkstorm Teemto open cockpit graphite structure v2.002': '3bb7c93e1e5773b7', 'Pilot atlas v4c runtime accent.010': '64b1bc57c8cd87d3', 'Pilot atlas v4c runtime hardware.010': '687498f7c34d4d21', 'Pilot atlas v4c runtime rubber.010': '01dd8b072d5a718b', 'Pilot atlas v4c runtime shell.010': '7dd33061bdb7833d', 'Pilot atlas v4c runtime suit.010': '68c35d6d93fb236c', 'Pilot atlas v4c runtime webbing.010': '4a58791ddae39d97'}, 'meshesFnv1a64': {'Original Inkstorm pilot v4b accent.020': '9a067cd28a08e408', 'Original Inkstorm pilot v4b hardware.020': 'a694a60f635a2188', 'Original Inkstorm pilot v4b rubber.020': 'd2ae9e9a36310ea7', 'Original Inkstorm pilot v4b shell.020': 'fc291625cd603f3b', 'Original Inkstorm pilot v4b suit.020': '7f0f525457296020', 'Original Inkstorm pilot v4b webbing.020': '4375ac6750711674', 'Pilot v4b unchanged body Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.014': 'a3e922f57e854300', 'teemto-cockpit-graphite-v2.004': 'a890cdd6a57013c4', 'teemto-damage-cockpit-stubs-v16': 'a5c33363e1b272c5', 'teemto-damage-right-front-v16': '83b61830b44f5a1a', 'teemto-damage-right-rear-v16': 'fd4e0f3272c1634e', 'teemto-damage-severed-tethers-v16': '2c7ed15dbe0e6ffb'}, 'objectsFnv1a64': 'bf10d978ab02af63'}, 'geometryOnlyRuntimeExport': True, 'lineage': [{'boundsGame': [[-1.6710448265075684, 1.001510739326477, -7.389999866485596], [1.6874504089355469, 3.1440987586975098, 3.5227086544036865]], 'capInfo': {'jaggedAmplitudeBound': 0.035, 'loops': [{'centerGame': [-1.6124467849731445, 3.082728385925293, 3.5], 'depth': 0.026488718602187895, 'loop': 0, 'radius': 0.0588638191159731, 'vertices': 24}, {'centerGame': [1.6325554847717285, 3.0909316539764404, 3.5], 'depth': 0.025239345108647292, 'loop': 1, 'radius': 0.05608743357477176, 'vertices': 24}], 'newCapTriangles': 139}, 'material': 'Inkstorm Teemto Cabina.010', 'object': 'teemto-damage-cockpit-stubs-v16', 'pivotGame': [0.008202791213989258, 2.0728046894073486, -1.9336456060409546], 'sourceObject': 'Teemto V16 intact | teemto-cockpit-body.010', 'triangles': 17902}, {'boundsGame': [[-4.178723335266113, 3.029729127883911, 3.507042646408081], [4.177325248718262, 5.13743257522583, 15.937384605407715]], 'capInfo': {'jaggedAmplitudeBound': 0.035, 'loops': [{'centerGame': [-1.6124470233917236, 3.0827279090881348, 3.5], 'depth': 0.026488775560056313, 'loop': 0, 'radius': 0.05886394568901403, 'vertices': 24}, {'centerGame': [1.6325558423995972, 3.0909314155578613, 3.5], 'depth': 0.025239296072446585, 'loop': 1, 'radius': 0.056087324605436854, 'vertices': 24}], 'newCapTriangles': 139}, 'material': 'Inkstorm Teemto Cabina.010', 'object': 'teemto-damage-severed-tethers-v16', 'pivotGame': [-0.0006990432739257812, 4.08358097076416, 9.722213745117188], 'sourceObject': 'Teemto V16 intact | teemto-cockpit-body.010', 'triangles': 395}, {'boundsGame': [[1.2777190208435059, 0.12051224708557129, 14.960724830627441], [6.496447563171387, 5.250973701477051, 22.736522674560547]], 'capInfo': {'jaggedAmplitudeBound': 0.24, 'loops': [{'centerGame': [4.023552894592285, 2.6643877029418945, 15.200007438659668], 'depth': 0.28, 'loop': 0, 'radius': 2.935160659094016, 'vertices': 48}, {'centerGame': [3.9984993934631348, 1.733720064163208, 15.200004577636719], 'depth': 0.28, 'loop': 1, 'radius': 1.5531587324898113, 'vertices': 32}], 'newCapTriangles': 236}, 'material': 'Inkstorm Teemto Propulsores.010', 'object': 'teemto-damage-right-front-v16', 'pivotGame': [3.8870832920074463, 2.6857428550720215, 18.848623275756836], 'sourceObject': 'Teemto V16 intact | teemto-engine-right-body.013', 'triangles': 7948}, {'boundsGame': [[1.582594633102417, 0.11396288871765137, 5.1262664794921875], [6.450664043426514, 4.141551971435547, 15.40134048461914]], 'capInfo': {'jaggedAmplitudeBound': 0.24, 'loops': [{'centerGame': [4.023553848266602, 2.6643872261047363, 15.200007438659668], 'depth': 0.28, 'loop': 0, 'radius': 2.935161187078956, 'vertices': 48}, {'centerGame': [3.998499870300293, 1.733720064163208, 15.200004577636719], 'depth': 0.28, 'loop': 1, 'radius': 1.5531587232892186, 'vertices': 32}], 'newCapTriangles': 236}, 'material': 'Inkstorm Teemto Propulsores.010', 'object': 'teemto-damage-right-rear-v16', 'pivotGame': [4.016629219055176, 2.1277575492858887, 10.263803482055664], 'sourceObject': 'Teemto V16 intact | teemto-engine-right-body.013', 'triangles': 4474}], 'newGeometryMeshes': 4, 'newGeometryTriangles': 30719, 'newTextures': 0, 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 159}, 'retainedMeshes': 8, 'scene': 'PodRacing — Teemto authored damage V16 A', 'sceneCountAfter': 160, 'sourceByteSha256External': 'af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e', 'sourceCornerNormalSignaturePreserved': True, 'sourceScene': 'PodRacing — Teemto damage V16 pinned intact source', 'sourceSignaturePreserved': True, 'stage': 'V16 authored fracture A', 'success': True, 'triangles': 58624}
# Composed after shared guards and SOURCE_RECEIPT, DAMAGE_RECEIPT actual JSON.
from mathutils import Matrix, Euler
SOURCE=bpy.data.scenes[SOURCE_RECEIPT['scene']]
DAMAGE=bpy.data.scenes[DAMAGE_RECEIPT['scene']]
assert source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
assert source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
STAGE='PodRacing — Teemto damage V16 neutral render temporary'
assert STAGE not in bpy.data.scenes
snapshot=global_snapshot()
old_worlds=set(bpy.data.worlds);old_lights=set(bpy.data.lights);old_cameras=set(bpy.data.cameras)
stage=None
report={'stage':'V16 neutral damage geometry preview','images':[],'scope':'Authored damaged asset in an illustrative grounded pose under neutral studio lighting, not runtime animation, actual contact timing, performance or art acceptance.'}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
poses={'teemto-damage-severed-tethers-v16':((-2.8,0,-1.0),(.10,-.25,.65)),
       'teemto-damage-right-front-v16':((3.4,0,1.6),(.18,.30,.65)),
       'teemto-damage-right-rear-v16':((1.5,0,-3.3),(-.35,-.40,1.3))}
try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage;snapshot['window'].view_layer=stage.view_layers[0]
    copies=[]
    for original in DAMAGE.objects:
        if original.type!='MESH':continue
        ob=original.copy();ob.parent=None;ob.matrix_world=original.matrix_world.copy()
        ob.name='V16 neutral | '+original.name;stage.collection.objects.link(ob)
        if original.name in poses:
            delta,angles=poses[original.name]
            center=Vector(original['pivotGame'])
            transform=Matrix.Translation(center+Vector(delta))@Euler(angles,'XYZ').to_matrix().to_4x4()@Matrix.Translation(-center)
            ob.matrix_world=C@transform@C.inverted()@original.matrix_world
            minimum=min((ob.matrix_world@v.co).z for v in ob.data.vertices)
            ob.location.z += .12-minimum
        copies.append(ob)
    stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=24;stage.cycles.use_denoising=True
    stage.render.resolution_x=1400;stage.render.resolution_y=900;stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG';stage.render.image_settings.color_mode='RGBA'
    stage.view_settings.view_transform='AgX';stage.view_settings.look='AgX - Medium High Contrast';stage.view_settings.exposure=0;stage.view_settings.gamma=1
    world=bpy.data.worlds.new('V16 neutral world');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.18,.18,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6;stage.world=world
    def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
    for name,gamepos,power,color,size in [('key',(12,22,-3),4200,(1,.94,.85),14),('fill',(-18,14,8),3200,(.80,.88,1),14),('rim',(0,14,28),3800,(1,1,1),12)]:
        data=bpy.data.lights.new('V16 neutral '+name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(data.name,data);stage.collection.objects.link(ob);ob.location=C@Vector(gamepos);aim(ob,C@Vector((0,2,9)))
    groundmesh=bpy.data.meshes.new('V16 neutral ground');groundmesh.from_pydata([(-60,-60,0),(60,-60,0),(60,60,0),(-60,60,0)],[],[(0,1,2,3)]);groundmesh.update()
    ground=bpy.data.objects.new('V16 neutral ground',groundmesh);stage.collection.objects.link(ground)
    material=bpy.data.materials.new('V16 neutral ground');material.diffuse_color=(.16,.15,.14,1);material.roughness=.95;groundmesh.materials.append(material)
    camera_data=bpy.data.cameras.new('V16 neutral camera');camera=bpy.data.objects.new(camera_data.name,camera_data);stage.collection.objects.link(camera);stage.camera=camera;camera_data.type='ORTHO';camera_data.sensor_fit='HORIZONTAL';camera_data.clip_start=.1;camera_data.clip_end=500
    all_points=[ob.matrix_world@v.co for ob in copies for v in ob.data.vertices]
    low=Vector([min(p[k] for p in all_points) for k in range(3)]);high=Vector([max(p[k] for p in all_points) for k in range(3)]);target=(low+high)*.5
    for view,game_eye,focus,scale in [('full',(34,20,-20),target,None),('torn-engine',(28,11,6),C@Vector((6,2.5,13)),17)]:
        camera.location=C@Vector(game_eye);aim(camera,focus)
        if scale is None:
            inverse=camera.rotation_euler.to_matrix().inverted();points=[inverse@(p-target) for p in all_points]
            width=max(p.x for p in points)-min(p.x for p in points);height=max(p.y for p in points)-min(p.y for p in points)
            camera_data.ortho_scale=max(width,height*1400/900)*1.18
        else:camera_data.ortho_scale=scale
        stage.render.filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/neutral-a-'+view+'.png'
        bpy.ops.render.render(write_still=True)
        report['images'].append({'view':view,'path':stage.render.filepath,'camera':list(camera.location),'target':list(focus),'orthoScale':camera_data.ortho_scale})
finally:
    for ob in list(bpy.data.objects):
        if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
    if stage:bpy.data.scenes.remove(stage)
    for mesh in list(bpy.data.meshes):
        if mesh not in snapshot['meshes'] and mesh.users==0:bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        if material not in snapshot['materials'] and material.users==0:bpy.data.materials.remove(material)
    for data in list(bpy.data.worlds):
        if data not in old_worlds and data.users==0:bpy.data.worlds.remove(data)
    for data in list(bpy.data.lights):
        if data not in old_lights and data.users==0:bpy.data.lights.remove(data)
    for data in list(bpy.data.cameras):
        if data not in old_cameras and data.users==0:bpy.data.cameras.remove(data)
    report['preservation']=verify_global(snapshot)
    report['sourceExact']=source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
    report['damageExact']=source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
    report['sourceNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in SOURCE.objects if o.type=='MESH'}==SOURCE_RECEIPT['sourceCornerNormalSignature']
    report['damageNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in DAMAGE.objects if o.type=='MESH'}==DAMAGE_RECEIPT['damageCornerNormalSignature']
    assert report['sourceExact'] and report['damageExact'] and report['sourceNormalsExact'] and report['damageNormalsExact']
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN');print(json.dumps(report,sort_keys=True));print('TEEMTO_DAMAGE_RECEIPT_END')
