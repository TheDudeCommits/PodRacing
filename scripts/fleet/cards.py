import bpy, sys, os, math
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--") + 1:]
pods = {'kestrel':'teemto','scrapjack':'sebulba','hornet':'polwo','bulwark':'blockrunner','sirocco':'verdigris','longshot':'skybolt','glasswing':'needle','crucible':'pog'}
sc = bpy.context.scene
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: sc.render.engine = eng; break
    except TypeError: pass
sc.render.resolution_x, sc.render.resolution_y = 1200, 750
sc.render.film_transparent = True
try:
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
except Exception: pass
for pod, identity in pods.items():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, f'{pod}-hero.glb'))
    pts = []
    for ob in bpy.data.objects:
        if ob.type == 'MESH': pts += [ob.matrix_world @ v.co for v in ob.data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (mn + mx) / 2; r = (mx - mn).length / 2
    bpy.ops.object.light_add(type='SUN'); s = bpy.context.active_object; s.data.energy = 3.6; s.data.color = (1, .9, .78)
    s.rotation_euler = (math.radians(50), 0, math.radians(-140))
    bpy.ops.object.light_add(type='SUN'); f = bpy.context.active_object; f.data.energy = 1.3; f.data.color = (.62, .7, 1)
    f.rotation_euler = (math.radians(70), 0, math.radians(60))
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.32, .3, .36, 1); bg.inputs['Strength'].default_value = .7
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
    cam.data.lens = 50
    # Front three-quarter: craft faces Blender -Y, so the camera sits at -Y, left and above.
    direction = Vector((-0.62, -0.72, 0.36)).normalized()
    cam.location = c + direction * r * 2.55
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = os.path.join(out, f'card-{identity}.png')
    bpy.ops.render.render(write_still=True)
