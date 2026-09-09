import bpy
s=bpy.data.scenes['PodRacing — Sebulba Inkstorm study v1']
for obj in list(s.objects):
 if obj.name.startswith('sebulba-pilot'):bpy.data.objects.remove(obj,do_unlink=True)
"""Original helmeted seated driver fitted to the inspected Sebulba source cockpit.

Dimensions are in the source study's coordinate frame (+Y forward, +Z up).
The source file has an empty seat. This adds only original geometry to the study.
"""
import bpy
import math
import json
from mathutils import Vector

stage = bpy.data.scenes['PodRacing — Sebulba Inkstorm study v1']
assert 'sebulba-pilot' not in stage.objects
saved_scene = bpy.context.window.scene
saved_layer = bpy.context.window.view_layer
bpy.context.window.scene = stage
pilot = bpy.data.objects.new('sebulba-pilot', None)
stage.collection.objects.link(pilot)
materials = {}
for name, color, rough, metal in (
    ('suit', (.027, .038, .052, 1), .85, .08),
    ('helmet', (.74, .62, .43, 1), .58, .12),
    ('orange', (.55, .16, .035, 1), .70, .12),
    ('visor', (.008, .021, .031, 1), .23, .48),
):
    m = bpy.data.materials.new('Sebulba original pilot ' + name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    m.diffuse_color = color
    materials[name] = m

parts = []
def ellipsoid(name, center, size, material, tilt=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1, location=center)
    obj = bpy.context.object
    obj.name = 'sebulba-pilot-' + name
    obj.scale = size
    obj.rotation_euler.x = tilt
    obj.data.materials.append(materials[material])
    obj.parent = pilot
    for face in obj.data.polygons:
        face.use_smooth = True
    parts.append(obj)
    return obj

def limb(name, a, b, radius_a, radius_b, material):
    a, b = Vector(a), Vector(b)
    delta = b-a
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=radius_a, radius2=radius_b,
                                    depth=delta.length, location=(a+b)*.5)
    obj = bpy.context.object
    obj.name = 'sebulba-pilot-' + name
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(materials[material])
    obj.parent = pilot
    for face in obj.data.polygons:
        face.use_smooth = True
    bevel = obj.modifiers.new('Rounded tailored seam', 'BEVEL')
    bevel.width = .006
    bevel.segments = 2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    parts.append(obj)
    return obj

ellipsoid('pelvis', (0,-.13,-.205), (.083,.065,.058), 'suit')
ellipsoid('torso', (0,-.17,-.055), (.099,.062,.135), 'suit', -.16)
ellipsoid('collar', (0,-.166,.051), (.068,.055,.029), 'orange')
ellipsoid('helmet-shell', (0,-.16,.143), (.084,.081,.099), 'helmet')
ellipsoid('wrap-visor', (0,-.086,.151), (.077,.026,.039), 'visor')
ellipsoid('chin-breather', (0,-.084,.094), (.054,.023,.022), 'suit')
ellipsoid('helmet-brow', (0,-.087,.193), (.074,.028,.014), 'orange')
for side in (-1,1):
    ellipsoid('ear-pod', (side*.082,-.164,.139), (.012,.034,.031), 'orange')
    shoulder=(side*.09,-.147,.023)
    elbow=(side*.116,-.07,-.102)
    hand=(side*.072,.0524,-.0109)
    ellipsoid('shoulder-pad', shoulder, (.033,.043,.045), 'orange')
    limb('upper-sleeve', shoulder, elbow, .033,.029,'suit')
    ellipsoid('elbow-pad', elbow, (.031,.03,.03), 'suit')
    limb('forearm', elbow, hand, .029,.022,'suit')
    ellipsoid('glove', hand, (.027,.033,.025), 'helmet')
    # Bent knees and boots rest inside the existing pan and pedal assembly.
    hip=(side*.05,-.11,-.207)
    knee=(side*.075,.088,-.272)
    boot=(side*.075,.254,-.218)
    limb('thigh', hip,knee,.038,.029,'suit')
    ellipsoid('knee-pad', knee,(.031,.031,.022),'orange')
    limb('shin', knee,boot,.027,.022,'suit')
    ellipsoid('boot', boot,(.029,.052,.027),'suit')
    limb('harness', (side*.054,-.096,.038), (side*.035,-.075,-.139), .010,.009,'helmet')
ellipsoid('harness-buckle', (0,-.065,-.116),(.021,.012,.016),'orange')

# Bake the small static body into one mesh per material. The head can become a
# separate transform rig when its presentation animation is authored.
for key, material in materials.items():
    selected=[o for o in list(pilot.children) if o.type == 'MESH' and material in list(o.data.materials)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in selected:
        o.select_set(True)
    bpy.context.view_layer.objects.active=selected[0]
    if len(selected)>1:bpy.ops.object.join()
    obj=bpy.context.object
    obj.name='sebulba-pilot-'+key
    obj.parent=pilot
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.context.window.scene=saved_scene
bpy.context.window.view_layer=saved_layer
print(json.dumps({'driver':'Original Inkstorm helmeted racer','scene':stage.name,
                  'pilotMeshes':4,'pose':'static seated fit candidate; inspect rendered grip contacts',
                  'pelvis':[0,-.13,-.205], 'helmetCenter':[0,-.16,.143],
                  'preTransformHandTargets':[[-.072,.0524,-.0109],[.072,.0524,-.0109]],
                  'animation':'static fitted pose, animation not implemented',
                  'sourceModified':False}))

import math
from mathutils import Matrix,Vector
s=bpy.data.scenes['PodRacing — Sebulba Inkstorm study v1'];pilot=s.objects['sebulba-pilot']
r=Matrix.Rotation(-math.pi/2,4,'Z');target=Vector((-2.04,0,.53));origin=Vector((0,-.13,-.205));pilot.matrix_world=Matrix.Translation(target-1.7*(r@origin))@Matrix.Scale(1.7,4)@r
s.render.filepath='/Users/amir/Projects/PodRacing/output/vehicles/sebulba-review/driver-material-v5.png';bpy.ops.render.render(write_still=True,scene=s.name)
print('Sebulba-specific grip targets in source coordinates: X=-1.72992,Y=+-0.1224,Z=0.85997; static authored pose.')

