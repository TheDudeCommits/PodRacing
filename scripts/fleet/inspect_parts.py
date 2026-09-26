import bpy, sys, os, math, glob
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--") + 1:]
def clear():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
def verts_bounds(ob):
    bpy.context.view_layer.update(); mw = ob.matrix_world
    xs = [mw @ v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
    mx = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    return mn, mx
def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    ob.rotation_mode = 'XYZ'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mn, mx = verts_bounds(ob); size = mx - mn
    axis = max(range(3), key=lambda i: size[i])
    if axis == 0: ob.rotation_euler = (0, 0, math.radians(90))
    elif axis == 2: ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    mn, mx = verts_bounds(ob); s = 4.0 / (mx.y - mn.y); ob.scale = (s, s, s)
    bpy.ops.object.transform_apply(scale=True)
    mn, mx = verts_bounds(ob); ob.location -= (mn + mx) / 2
    bpy.ops.object.transform_apply(location=True)
    return ob, axis
scene = bpy.context.scene
for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: scene.render.engine = eng; break
    except TypeError: pass
scene.render.resolution_x, scene.render.resolution_y = 640, 360
for path in sorted(glob.glob(os.path.join(src, '*.glb'))):
    clear()
    ob, axis = load(path)
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.active_object; sun.data.energy = 4; sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND').inputs['Color'].default_value = (.5, .5, .55, 1)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
    cam.location = (7.5, 0, 1.2); d = Vector((0, 0, 0)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.filepath = os.path.join(out, os.path.basename(path).replace('.glb', f'-axis{axis}.png'))
    bpy.ops.render.render(write_still=True)
