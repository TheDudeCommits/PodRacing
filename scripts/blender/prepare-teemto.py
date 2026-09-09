"""Run through Blender MCP in the existing session; preserve the imported source.

Creates an isolated, rigid, opaque review copy. No scene configuration, original
animation, source image or source mesh is modified or exported as custom data.
"""
import bpy
import json
from mathutils import Matrix, Vector

SOURCE = 'PodRacing — source 4eff45899ada40bb920c5c744663db90'
STAGE = 'PodRacing — Teemto material study v1'
assert STAGE not in bpy.data.scenes, 'Study already exists; inspect instead of replacing it.'
source = bpy.data.scenes[SOURCE]
stage = bpy.data.scenes.new(STAGE)
stage.unit_settings.system = 'METRIC'
materials = {}
for name in ('Cabina', 'Propulsores'):
    original = bpy.data.materials[name]
    painted = bpy.data.materials.new('Inkstorm Teemto ' + name)
    painted.use_nodes = True
    nodes = painted.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value = .28
    shader.inputs['Roughness'].default_value = .76
    image = next(n.image for n in original.node_tree.nodes
                 if n.type == 'TEX_IMAGE' and n.image and 'baseColor' in n.image.name)
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    painted.node_tree.links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    painted.use_backface_culling = True
    materials[name] = painted

groups = {}
for name in ('cockpit', 'engine-left', 'engine-right'):
    group = bpy.data.objects.new('teemto-' + name, None)
    stage.collection.objects.link(group)
    groups[name] = group

copied = []
excluded = []
for original in source.objects:
    if original.type != 'MESH':
        continue
    material = original.data.materials[0] if original.data.materials else None
    if material is None or material.name not in materials:
        excluded.append(original.name)
        continue
    mesh = original.data.copy()
    mesh.name = 'Inkstorm Teemto ' + original.data.name
    mesh.transform(original.matrix_world)
    mesh.materials.clear()
    mesh.materials.append(materials[material.name])
    body = bpy.data.objects.new('study-' + original.name, mesh)
    stage.collection.objects.link(body)
    center_x = sum(v.co.x for v in mesh.vertices) / max(1, len(mesh.vertices))
    key = ('engine-right' if center_x > 0 else 'engine-left') if material.name == 'Propulsores' else 'cockpit'
    body.parent = groups[key]
    copied.append(body)

stage.render.engine = 'CYCLES'
stage.cycles.device = 'CPU'
stage.cycles.samples = 16
stage.cycles.use_denoising = True
stage.render.resolution_x = 1400
stage.render.resolution_y = 1000
stage.render.resolution_percentage = 100
stage.render.image_settings.file_format = 'PNG'
stage.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('PodRacing Teemto study world')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.20, .25, .34, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .35
stage.world = world

def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

for name, location, energy, color, size in (
    ('key', (2, 1, 12), 1900, (1, .80, .59), 8),
    ('fill', (-8, 8, 5), 1300, (.55, .70, 1), 7),
):
    light = bpy.data.lights.new('PodRacing Teemto ' + name, 'AREA')
    light.energy = energy
    light.color = color
    light.shape = 'DISK'
    light.size = size
    obj = bpy.data.objects.new(light.name, light)
    stage.collection.objects.link(obj)
    obj.location = location
    point_at(obj, (0, 5, -1))

camera = bpy.data.cameras.new('PodRacing Teemto review camera')
camera.lens = 45
camera.clip_start = .05
camera.clip_end = 300
obj = bpy.data.objects.new(camera.name, camera)
stage.collection.objects.link(obj)
obj.location = (9, 16, 7)
point_at(obj, (0, 5, -1))
stage.camera = obj
print(json.dumps({'scene':stage.name, 'copiedMeshes':len(copied), 'excludedOriginalVfx':excluded,
                  'sourceSceneUntouched':source.name, 'opaqueMaterials':list(materials),
                  'sourceFrame':source.frame_current, 'sourceTransformBaked':True,
                  'renderEngine':'CPU Cycles, source inspection only'}))
