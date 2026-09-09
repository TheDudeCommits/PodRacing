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


SOURCE_RECEIPT={'objectLineage': [{'importedName': 'teemto-cockpit.010', 'object': 'Teemto V16 rival intact | teemto-cockpit.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-cockpit-body.010', 'object': 'Teemto V16 rival intact | teemto-cockpit-body.010', 'triangles': 12026, 'type': 'MESH', 'worldBounds': [[-1.3348463773727417, -1.1882781982421875, 1.001510739326477], [1.3557040691375732, 7.333491802215576, 4.498374938964844]]}, {'importedName': 'teemto-engine-left.010', 'object': 'Teemto V16 rival intact | teemto-engine-left.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-left-body.013', 'object': 'Teemto V16 rival intact | teemto-engine-left-body.013', 'triangles': 5426, 'type': 'MESH', 'worldBounds': [[-6.54527473449707, -22.738540649414062, 0.07286620140075684], [-1.3187763690948486, -5.0940141677856445, 5.1863298416137695]]}, {'importedName': 'teemto-engine-right.010', 'object': 'Teemto V16 rival intact | teemto-engine-right.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-right-body.013', 'object': 'Teemto V16 rival intact | teemto-engine-right-body.013', 'triangles': 5378, 'type': 'MESH', 'worldBounds': [[1.2777190208435059, -22.736522674560547, 0.12051224708557129], [6.496447563171387, -5.1262664794921875, 5.250973701477051]]}, {'importedName': 'teemto-pilot.002', 'object': 'Teemto V16 rival intact | teemto-pilot.002', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-pilot-helmet.002', 'object': 'Teemto V16 rival intact | teemto-pilot-helmet.002', 'triangles': 514, 'type': 'MESH', 'worldBounds': [[-0.3725000321865082, 4.624944686889648, 2.3902416229248047], [0.36919623613357544, 5.669759273529053, 3.275423288345337]]}, {'importedName': 'teemto-pilot-orange.002', 'object': 'Teemto V16 rival intact | teemto-pilot-orange.002', 'triangles': 1166, 'type': 'MESH', 'worldBounds': [[-0.30346211791038513, 4.555837154388428, 2.1005306243896484], [0.30346211791038513, 5.563058376312256, 3.2314445972442627]]}, {'importedName': 'teemto-pilot-suit.014', 'object': 'Teemto V16 rival intact | teemto-pilot-suit.014', 'triangles': 1410, 'type': 'MESH', 'worldBounds': [[-0.3674999177455902, 4.12967586517334, 2.054417371749878], [0.3675000071525574, 5.534947395324707, 3.009394645690918]]}, {'importedName': 'teemto-pilot-visor.002', 'object': 'Teemto V16 rival intact | teemto-pilot-visor.002', 'triangles': 260, 'type': 'MESH', 'worldBounds': [[-0.19249999523162842, 5.22206974029541, 2.9972448348999023], [0.19249998033046722, 5.355953216552734, 3.1874423027038574]]}], 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 161}, 'scene': 'PodRacing — Teemto damage V16 pinned intact rival source', 'sceneCountAfter': 162, 'source': '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/intact-teemto-rival.glb', 'sourceByteSha256External': '3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f', 'sourceCornerNormalSignature': {'Teemto V16 rival intact | teemto-cockpit-body.010': 'bd9c934bceef6995', 'Teemto V16 rival intact | teemto-engine-left-body.013': '4c8a33c5cc2b3013', 'Teemto V16 rival intact | teemto-engine-right-body.013': 'd21bc4a781a4398a', 'Teemto V16 rival intact | teemto-pilot-helmet.002': '18c33a9ae8439df7', 'Teemto V16 rival intact | teemto-pilot-orange.002': '7591d69d6a413dcf', 'Teemto V16 rival intact | teemto-pilot-suit.014': '3f30b7dac8d3f025', 'Teemto V16 rival intact | teemto-pilot-visor.002': '1e6c6bddc4e0642f'}, 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.011': 'a93bedcebea3fcac', 'Inkstorm Teemto Propulsores.011': 'c975e02c63d5519a', 'Teemto original pilot helmet.002': 'e8699fe76db560cc', 'Teemto original pilot orange.002': '808b24240ee5c140', 'Teemto original pilot suit.002': '9ce869624a170788', 'Teemto original pilot visor.002': '68a4fcd55cfc3246'}, 'meshesFnv1a64': {'Inkstorm Teemto Gabina-exterior-timon_low_Cabina_0.002': 'c10d4e242fd0b9e8', 'Inkstorm Teemto Propulsores-alerones_low.002_Propulsores_0.002': 'c78021a93e4d9596', 'Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.002': '59d984da259e8ff2', 'Sphere.136': '1e9c2c0cd1f76867', 'Sphere.137': 'f928a10ab3d10453', 'Sphere.138': '0cf2bad63140b658', 'Sphere.139': '59b6f2582aed375f'}, 'objectsFnv1a64': '24a955528f2a5c0b'}, 'stage': 'V16 pinned source import', 'success': True}
DAMAGE_RECEIPT={'damageCornerNormalSignature': {'Teemto V16 retained | Teemto V16 rival intact | teemto-cockpit-body.010': 'bd9c934bceef6995', 'Teemto V16 retained | Teemto V16 rival intact | teemto-engine-left-body.013': '4c8a33c5cc2b3013', 'Teemto V16 retained | Teemto V16 rival intact | teemto-pilot-helmet.002': '18c33a9ae8439df7', 'Teemto V16 retained | Teemto V16 rival intact | teemto-pilot-orange.002': '7591d69d6a413dcf', 'Teemto V16 retained | Teemto V16 rival intact | teemto-pilot-suit.014': '3f30b7dac8d3f025', 'Teemto V16 retained | Teemto V16 rival intact | teemto-pilot-visor.002': '1e6c6bddc4e0642f', 'teemto-damage-right-front-v16.002': 'fbc96a683f6b245c', 'teemto-damage-right-rear-v16.002': '6434369f174b96a1'}, 'damageSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.011': 'a93bedcebea3fcac', 'Inkstorm Teemto Propulsores.011': 'c975e02c63d5519a', 'Teemto original pilot helmet.002': 'e8699fe76db560cc', 'Teemto original pilot orange.002': '808b24240ee5c140', 'Teemto original pilot suit.002': '9ce869624a170788', 'Teemto original pilot visor.002': '68a4fcd55cfc3246'}, 'meshesFnv1a64': {'Inkstorm Teemto Gabina-exterior-timon_low_Cabina_0.002': 'c10d4e242fd0b9e8', 'Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.002': '59d984da259e8ff2', 'Sphere.136': '1e9c2c0cd1f76867', 'Sphere.137': 'f928a10ab3d10453', 'Sphere.138': '0cf2bad63140b658', 'Sphere.139': '59b6f2582aed375f', 'teemto-damage-right-front-v16.002': '6104b4b65b23057e', 'teemto-damage-right-rear-v16.002': '0067995c8078ed08'}, 'objectsFnv1a64': '43eff8efb636b0ed'}, 'geometryOnlyRuntimeExport': True, 'lineage': [{'boundsGame': [[1.2777190208435059, 0.12051224708557129, 14.960857391357422], [6.496447563171387, 5.250973701477051, 22.736522674560547]], 'capInfo': {'jaggedAmplitudeBound': 0.24, 'loops': [{'centerGame': [4.022681713104248, 2.653714418411255, 15.200004577636719], 'depth': 0.28, 'loop': 0, 'radius': 2.9285140879289187, 'vertices': 32}, {'centerGame': [4.0258917808532715, 1.7685803174972534, 15.199999809265137], 'depth': 0.44800000000000006, 'loop': 1, 'radius': 1.5180115030925323, 'vertices': 20}], 'newCapTriangles': 152}, 'material': 'Inkstorm Teemto Propulsores.011', 'object': 'teemto-damage-right-front-v16.002', 'pivotGame': [3.8870832920074463, 2.6857428550720215, 18.848690032958984], 'runtimeName': 'teemto-damage-right-front-v16', 'sourceObject': 'Teemto V16 rival intact | teemto-engine-right-body.013', 'triangles': 3942}, {'boundsGame': [[1.660865306854248, 0.19954586029052734, 5.1262664794921875], [6.373703956604004, 4.077632427215576, 15.370991706848145]], 'capInfo': {'jaggedAmplitudeBound': 0.24, 'loops': [{'centerGame': [4.022682189941406, 2.6537137031555176, 15.200004577636719], 'depth': 0.28, 'loop': 0, 'radius': 2.9285133145070628, 'vertices': 32}, {'centerGame': [4.0258917808532715, 1.7685803174972534, 15.199999809265137], 'depth': 0.44800000000000006, 'loop': 1, 'radius': 1.5180115030925323, 'vertices': 20}], 'newCapTriangles': 152}, 'material': 'Inkstorm Teemto Propulsores.011', 'object': 'teemto-damage-right-rear-v16.002', 'pivotGame': [4.017284393310547, 2.1385891437530518, 10.248628616333008], 'runtimeName': 'teemto-damage-right-rear-v16', 'sourceObject': 'Teemto V16 rival intact | teemto-engine-right-body.013', 'triangles': 1844}], 'newGeometryMeshes': 2, 'newGeometryTriangles': 5786, 'newTextures': 0, 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 162}, 'retainedMeshes': 6, 'scene': 'PodRacing — Teemto authored damage V16 rival B', 'sceneCountAfter': 163, 'sourceByteSha256External': '3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f', 'sourceCornerNormalSignaturePreserved': True, 'sourceScene': 'PodRacing — Teemto damage V16 pinned intact rival source', 'sourceSignaturePreserved': True, 'stage': 'V16 authored fracture B', 'success': True, 'triangles': 26588}
# Actual receipt-composed, temporary isolated selection, no material/image payload.
SOURCE=bpy.data.scenes[SOURCE_RECEIPT['scene']]
DAMAGE=bpy.data.scenes[DAMAGE_RECEIPT['scene']]
assert source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
assert source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
STAGE='PodRacing — Teemto V16 geometry export temporary'
assert STAGE not in bpy.data.scenes
OUTPUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/teemto-damage-rival-b-native.glb'
snapshot=global_snapshot()
stage=None
report={'stage':'V16 geometry-only export A','path':OUTPUT,'newTextures':0,'nodes':[]}
try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage;snapshot['window'].view_layer=stage.view_layers[0]
    for expected in DAMAGE_RECEIPT['lineage']:
        original=DAMAGE.objects[expected['object']]
        ob=original.copy();ob.parent=None;ob.matrix_world=original.matrix_world.copy()
        ob.name='V16_EXPORT_'+expected['object'];stage.collection.objects.link(ob)
        ob['runtimeName']=expected['runtimeName']
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        report['nodes'].append({'exportName':ob.name,'runtimeName':expected['runtimeName'],'pivotGame':expected['pivotGame'],'materialBinding':expected['material'],'triangles':expected['triangles']})
    result=bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',use_selection=True,use_active_scene=True,
        export_materials='NONE',export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
    assert result=={'FINISHED'}
    report['result']='FINISHED'
finally:
    for ob in list(bpy.data.objects):
        if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
    if stage:bpy.data.scenes.remove(stage)
    report['preservation']=verify_global(snapshot)
    report['sourceExact']=source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
    report['damageExact']=source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
    report['sourceNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in SOURCE.objects if o.type=='MESH'}==SOURCE_RECEIPT['sourceCornerNormalSignature']
    report['damageNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in DAMAGE.objects if o.type=='MESH'}==DAMAGE_RECEIPT['damageCornerNormalSignature']
    assert report['sourceExact'] and report['damageExact'] and report['sourceNormalsExact'] and report['damageNormalsExact']
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN');print(json.dumps(report,sort_keys=True));print('TEEMTO_DAMAGE_RECEIPT_END')
