"""Export the inspected study as a normalized rigid GLB, without scene extras.

The rest forward axis joins cockpit seat and twin-engine center. Blender's
glTF Y-up conversion then yields +Z-forward game coordinates. Source meshes,
materials, images and the prior study stay unchanged.
"""
import bpy
import math
import json
from mathutils import Matrix, Vector

SOURCE = 'PodRacing — Teemto material study v1'
DEST = 'PodRacing — Teemto runtime export v1'
PATH = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/teemto-normalized-v1.glb'
assert DEST not in bpy.data.scenes
source = bpy.data.scenes[SOURCE]
destination = bpy.data.scenes.new(DEST)
previous_scene = bpy.context.window.scene
previous_layer = bpy.context.window.view_layer
scale = 2.5
pitch = math.atan2(1.895,8.38)
rotation = Matrix.Rotation(math.pi,4,'Z') @ Matrix.Rotation(pitch,4,'X')
seat = Vector((0,-.13,-.205))
desired_seat_blender = Vector((0,5.2,2.2))
offset = desired_seat_blender - scale * (rotation @ seat)
transform = Matrix.Translation(offset) @ Matrix.Scale(scale,4) @ rotation
groups = {}
mesh_objects = []

try:
    bpy.context.window.scene = destination
    for original in source.objects:
        if original.type != 'MESH':
            continue
        pilot = original.name.startswith('teemto-pilot-')
        # Source left/right names were inspected in +Y-forward coordinates;
        # our 180-degree up-axis turn exchanges camera-local left and right.
        parent = original.parent.name if original.parent else ''
        if pilot:
            group_name = 'teemto-pilot'
        elif parent == 'teemto-engine-right':
            group_name = 'teemto-engine-left'
        elif parent == 'teemto-engine-left':
            group_name = 'teemto-engine-right'
        else:
            group_name = 'teemto-cockpit'
        if group_name not in groups:
            group = bpy.data.objects.new(group_name, None)
            destination.collection.objects.link(group)
            groups[group_name] = group
        mesh = original.data.copy()
        mesh.transform(transform @ original.matrix_world)
        obj = bpy.data.objects.new(original.name if pilot else group_name+'-part',mesh)
        destination.collection.objects.link(obj)
        obj.parent = groups[group_name]
        mesh_objects.append(obj)

    # One body draw per rigid engine/cockpit, four original pilot materials.
    for name,group in groups.items():
        if name == 'teemto-pilot':
            continue
        selected=list(group.children)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in selected:
            obj.select_set(True)
        bpy.context.view_layer.objects.active=selected[0]
        if len(selected)>1:
            bpy.ops.object.join()
        bpy.context.object.name=name+'-body'

    # Export ONLY meshes and explicit hierarchy/anchors from this scene.
    for name,source_point in (
        ('teemto-seat',(0,-.13,-.205)),
        ('teemto-exhaust-left',(1.63,3.92,-1.95)),
        ('teemto-exhaust-right',(-1.61,3.92,-1.95)),
        ('teemto-coupling-left',(0.52,9.38,-1.93)),
        ('teemto-coupling-right',(-0.53,9.38,-1.93)),
    ):
        anchor=bpy.data.objects.new(name,None)
        destination.collection.objects.link(anchor)
        anchor.location=transform@Vector(source_point)

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=PATH,export_format='GLB',
                              use_selection=True,use_active_scene=True,
                              export_extras=False,export_animations=False,
                              export_cameras=False,export_lights=False,
                              export_yup=True)
    bounds=[]
    triangles=0
    for obj in destination.objects:
        if obj.type!='MESH':
            continue
        obj.data.calc_loop_triangles()
        triangles+=len(obj.data.loop_triangles)
        for point in obj.bound_box:
            p=obj.matrix_world@Vector(point)
            bounds.append((p.x,p.z,-p.y))
    anchors={}
    for obj in destination.objects:
        if obj.name.startswith(('teemto-seat','teemto-exhaust','teemto-coupling')):
            p=obj.location
            anchors[obj.name]=[p.x,p.z,-p.y]
    print(json.dumps({'export':PATH,'scene':destination.name,'triangles':triangles,
        'bodyMeshes':3,'pilotMeshes':4,'unitScale':scale,
        'restForwardPitchDegrees':math.degrees(pitch),
        'basis':'cockpit seat to engine center, +Z-forward Y-up',
        'seat':[0,2.2,-5.2],'anchors':anchors,
        'bounds':[[min(p[k] for p in bounds) for k in range(3)],
                  [max(p[k] for p in bounds) for k in range(3)]],
        'exportExtras':False,'animations':False,'sourceModified':False}))
finally:
    bpy.context.window.scene=previous_scene
    bpy.context.window.view_layer=previous_layer
