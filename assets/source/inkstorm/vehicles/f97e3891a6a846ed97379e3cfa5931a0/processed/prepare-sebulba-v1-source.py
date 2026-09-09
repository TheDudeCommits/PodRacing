"""Create a source-preserving Inkstorm Sebulba study with an original pilot.

The shared hardware material is deliberately solid smoked metal/glazing in this
graphic variant; its original source alpha (139–255) remains in the source GLB.
"""
import bpy
import math
import json
from mathutils import Matrix, Vector

NAME='PodRacing — Sebulba Inkstorm study v1'
assert NAME not in bpy.data.scenes
source=bpy.data.scenes['PodRacing — source f97e3891a6a846ed97379e3cfa5931a0']
stage=bpy.data.scenes.new(NAME)
saved_scene=bpy.context.window.scene
saved_layer=bpy.context.window.view_layer
materials={}
for original_name in ['Material_805','Material_765']:
    original=bpy.data.materials[original_name]
    m=bpy.data.materials.new('Inkstorm Sebulba '+original_name)
    m.use_nodes=True
    shader=m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value=.32
    shader.inputs['Roughness'].default_value=.70
    if original_name=='Material_805':
        im=bpy.data.images.load('/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/f97e3891a6a846ed97379e3cfa5931a0/processed/sebulba-paint-inkstorm-v1.png',check_existing=True)
    else:
        im=next(n.image for n in original.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'baseColor' in n.image.name)
    tex=m.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=im
    m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    # No alpha input: explicit opaque graphic hardware/glazing adaptation.
    m.use_backface_culling=False
    materials[original_name]=m

try:
    bpy.context.window.scene=stage
    for original in source.objects:
        if original.type!='MESH':continue
        mesh=original.data.copy();mesh.transform(original.matrix_world)
        name=original.data.materials[0].name
        mesh.materials.clear();mesh.materials.append(materials[name])
        ob=bpy.data.objects.new('study-sebulba-'+name,mesh)
        stage.collection.objects.link(ob)
    for key,material in materials.items():
        bodies=[o for o in stage.objects if o.type=='MESH' and material in list(o.data.materials)]
        bpy.ops.object.select_all(action='DESELECT')
        for o in bodies:o.select_set(True)
        bpy.context.view_layer.objects.active=bodies[0]
        bpy.ops.object.join()
        bpy.context.object.name='sebulba-body-'+('shell' if key=='Material_805' else 'hardware')
    # Copy only the four root-authored driver meshes, fitted to the observed
    # seat at (-2.04,0,.53), facing +X along this model's forward direction.
    donor=bpy.data.scenes['PodRacing — Teemto material study v1'].objects['teemto-pilot']
    origin=Vector((0,-.13,-.205))
    target=Vector((-2.04,0,.53))
    rotation=Matrix.Rotation(-math.pi/2,4,'Z')
    scale=1.7
    transform=Matrix.Translation(target-scale*(rotation@origin))@Matrix.Scale(scale,4)@rotation
    for original in donor.children:
        if original.type!='MESH':continue
        mesh=original.data.copy();mesh.transform(transform@original.matrix_world)
        ob=bpy.data.objects.new(original.name.replace('teemto','sebulba'),mesh)
        stage.collection.objects.link(ob)
    inspect=bpy.data.scenes['PodRacing — Sebulba source inspection']
    for original in inspect.objects:
        if original.type in ['LIGHT','CAMERA']:
            ob=original.copy();ob.data=original.data.copy();stage.collection.objects.link(ob)
            if original.type=='CAMERA':stage.camera=ob
    stage.world=inspect.world
    stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=16;stage.cycles.use_denoising=True
    stage.render.resolution_x=1400;stage.render.resolution_y=1000;stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG';stage.view_settings.view_transform='AgX'
    stage.render.filepath='/Users/amir/Projects/PodRacing/output/vehicles/sebulba-review/driver-material-v1.png'
    bpy.ops.render.render(write_still=True,scene=stage.name)
    print(json.dumps({'study':stage.name,'bodyMeshes':2,'originalPilotMeshes':4,
                      'seat':list(target),'driverForward':'+X','driverScale':scale,
                      'materialAdaptation':'opaque painted shell and solid smoked hardware/glazing',
                      'sourceModified':False,'driverAnimation':'static fitted pose'}))
finally:
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
