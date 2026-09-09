"""Create a CPU-only, source-preserving normalized Sebulba export.

Only the owned study's six meshes are copied. Body meshes are welded at a
microscopic distance and decimated; loop UVs retain their texture seams. The
four static pilot meshes are unchanged. No scene properties, animation,
cameras, lights, credentials, or unrelated objects are exported.
"""
import bpy
import math
import json
from mathutils import Matrix, Vector

SOURCE = 'PodRacing — Sebulba Inkstorm study v1'
DEST = 'PodRacing — Sebulba runtime export v2'
PATH = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/f97e3891a6a846ed97379e3cfa5931a0/processed/sebulba-normalized-v2.glb'
assert DEST not in bpy.data.scenes
source = bpy.data.scenes[SOURCE]
destination = bpy.data.scenes.new(DEST)
previous_scene = bpy.context.window.scene
previous_layer = bpy.context.window.view_layer
previous_active = previous_layer.objects.active
previous_selected = [o for o in previous_layer.objects if o.select_get()]

# Blender -Y forward exports as glTF +Z forward. Source +X becomes -Y.
scale = 2.2
transform = (Matrix.Translation((0, .712, .2)) @ Matrix.Scale(scale, 4)
             @ Matrix.Rotation(-math.pi / 2, 4, 'Z'))
body_ratio = .115
records = []
source_records = []
for obj in source.objects:
    if obj.type == 'MESH':
        obj.data.calc_loop_triangles()
        source_records.append({'name': obj.name, 'vertices': len(obj.data.vertices),
                               'triangles': len(obj.data.loop_triangles)})

body_vertices = [v.co.copy() for o in source.objects
                 if o.type == 'MESH' and o.name.startswith('sebulba-body-')
                 for v in o.data.vertices]

# Rear opening center is measured from the densely sampled circular rim at
# source X=1.99 (+/- .005); paired Y/Z extents give its center. Coupling is an
# authored VFX attachment at the nearest actual inner-shell source vertex,
# not a claim that the source contains an animated energy coupling.
anchors_source = {'sebulba-seat': [-2.04, 0, .53]}
anchor_evidence = {}
for side, label in [(-1, 'left'), (1, 'right')]:
    rim = [v for v in body_vertices if v.y * side > 1.2 and round(v.x, 2) == 1.99]
    assert len(rim) > 1000
    center = [sum(v.x for v in rim) / len(rim)] + [
        (min(v[k] for v in rim) + max(v[k] for v in rim)) / 2 for k in [1, 2]]
    anchors_source['sebulba-exhaust-' + label] = center
    target = Vector((5, side * 1.25, 1.66))
    def distance_to_inner_target(vertex):
        return (vertex - target).length_squared
    inner = min((v for v in body_vertices if v.y * side > .8),
                key=distance_to_inner_target)
    anchors_source['sebulba-coupling-' + label] = list(inner)
    anchor_evidence[label] = {'rimVertexCount': len(rim), 'rimSourceXBin': [1.985, 1.995],
                             'rimCenter': center, 'innerShellVertex': list(inner),
                             'innerShellTargetDistance': (inner - target).length}

try:
    # Render(scene=...) does not guarantee inactive-scene matrix_world is
    # refreshed. Evaluate and capture the fitted pilot's parent transforms.
    bpy.context.window.scene = source
    bpy.context.view_layer.update()
    source_matrices = {o.name: o.matrix_world.copy() for o in source.objects if o.type == 'MESH'}
    bpy.context.window.scene = destination
    for original in source.objects:
        if original.type != 'MESH':
            continue
        assert original.name.startswith(('sebulba-body-', 'sebulba-pilot-'))
        mesh = original.data.copy()
        mesh.transform(transform @ source_matrices[original.name])
        obj = bpy.data.objects.new(original.name, mesh)
        destination.collection.objects.link(obj)
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        original_vertices = len(mesh.vertices)
        if original.name.startswith('sebulba-body-'):
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.remove_doubles(threshold=.0000022)
            bpy.ops.object.mode_set(mode='OBJECT')
            modifier = obj.modifiers.new('Browser body triangle budget', 'DECIMATE')
            modifier.decimate_type = 'COLLAPSE'
            modifier.ratio = body_ratio
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        validation_repaired = mesh.validate(verbose=True, clean_customdata=True)
        mesh.update()
        mesh.calc_loop_triangles()
        records.append({'name': obj.name, 'sourceVertices': original_vertices,
                        'vertices': len(mesh.vertices), 'triangles': len(mesh.loop_triangles),
                        'materials': [m.name for m in mesh.materials],
                        'pilotSimplified': False, 'meshValidationRepaired': validation_repaired})

    for name, point in anchors_source.items():
        anchor = bpy.data.objects.new(name, None)
        destination.collection.objects.link(anchor)
        anchor.location = transform @ Vector(point)

    bpy.context.view_layer.update()
    bounds = []
    for obj in destination.objects:
        if obj.type == 'MESH':
            for point in obj.bound_box:
                p = obj.matrix_world @ Vector(point)
                bounds.append([p.x, p.z, -p.y])
    triangles = sum(r['triangles'] for r in records)
    assert triangles <= 60000, ('Triangle budget exceeded', triangles)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=PATH, export_format='GLB',
                              use_selection=True, use_active_scene=True,
                              export_extras=False, export_animations=False,
                              export_cameras=False, export_lights=False,
                              export_yup=True)
    anchors = {}
    for name, point in anchors_source.items():
        p = transform @ Vector(point)
        anchors[name] = [p.x, p.z, -p.y]
    print(json.dumps({'export': PATH, 'scene': DEST, 'triangles': triangles,
                      'bodyMeshes': 2, 'pilotMeshes': 4, 'meshes': records,
                      'sourceStudyMeshes': source_records, 'unitScale': scale,
                      'bodyDecimationRatio': body_ratio, 'bodyWeldDistance': .0000022,
                      'basis': '+Z forward, +Y up; x=2.2*sourceY, y=2.2*sourceZ+.2, z=2.2*sourceX-.712',
                      'anchors': anchors, 'anchorSourceEvidence': anchor_evidence,
                      'bounds': [[min(p[k] for p in bounds) for k in range(3)],
                                 [max(p[k] for p in bounds) for k in range(3)]],
                      'exportExtras': False, 'animations': False, 'sourceModified': False,
                      'materialAdaptation': 'Material_765 original alpha 139..255 intentionally converted to opaque graphic hardware/glazing',
                      'visualAcceptance': 'Pending: normalized and simplified export not rendered in this CPU-only pass'}))
finally:
    bpy.context.window.scene = previous_scene
    bpy.context.window.view_layer = previous_layer
    for obj in previous_layer.objects:
        obj.select_set(obj in previous_selected)
    previous_layer.objects.active = previous_active
