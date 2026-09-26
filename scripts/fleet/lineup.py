import bpy, sys, os, math, glob
from mathutils import Vector
out_dir, out = sys.argv[sys.argv.index("--") + 1:]
for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
order = ['kestrel', 'scrapjack', 'hornet', 'bulwark', 'sirocco', 'longshot', 'glasswing', 'crucible']
for i, pod in enumerate(order):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(out_dir, f'{pod}-hero.glb'))
    new = [o for o in bpy.data.objects if o not in before and o.parent is None]
    col, row = i % 4, i // 4
    for o in new:
        o.location.x += col * 26 - 39
        o.location.y += row * 44 - 22
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
p = bpy.context.active_object
m = bpy.data.materials.new('ground'); m.use_nodes = True
next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (.62, .42, .28, 1)
p.data.materials.append(m)
bpy.ops.object.light_add(type='SUN'); s = bpy.context.active_object; s.data.energy = 4.5; s.rotation_euler = (math.radians(55), 0, math.radians(-35))
w = bpy.data.worlds.new('w'); bpy.context.scene.world = w; w.use_nodes = True
next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs['Color'].default_value = (.45, .42, .55, 1)
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
cam.data.lens = 32
cam.location = (-58, -95, 70); d = Vector((0, 0, 0)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam; sc.render.filepath = out
bpy.ops.render.render(write_still=True)
