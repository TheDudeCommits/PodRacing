# Headless Blender: assemble the original fleet from generated parts into the
# game's runtime GLB contract (+Z forward, +Y up, bottom near y=0, rigid opaque
# meshes, one material per mesh), then export hero and rival packages.
#   Blender -b --factory-startup --python build_fleet.py -- fleet.json meshes out [pod,...]
import bpy, sys, os, json, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
CFG, MESH_DIR, OUT = argv[0], argv[1], argv[2]
ONLY = set(argv[3].split(",")) if len(argv) > 3 and argv[3] else None
config = json.load(open(CFG))
os.makedirs(OUT, exist_ok=True)
HERO_TRIS, RIVAL_TRIS = 56000, 28000


def reset():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves, bpy.data.textures):
        for block in list(coll):
            if block.users == 0: coll.remove(block)


def select_only(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def apply(ob, location=True, rotation=True, scale=True):
    select_only(ob)
    bpy.ops.object.transform_apply(location=location, rotation=rotation, scale=scale)


def bounds(ob):
    bpy.context.view_layer.update()
    mw = ob.matrix_world
    xs = [mw @ v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
    mx = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    return mn, mx


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def import_part(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MESH_DIR, name + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    part = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in new:
        if o != part and o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
    part.rotation_mode = "XYZ"
    apply(part)
    # Keep base color, metallic-roughness and normal; drop emissive so the cel
    # adapter receives exactly the maps it supports.
    for slot in part.material_slots:
        mat = slot.material
        if not mat or not mat.node_tree: continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf: continue
        for key in ("Emission Color", "Emission"):
            sock = bsdf.inputs.get(key)
            if sock:
                for link in list(sock.links): mat.node_tree.links.remove(link)
        if bsdf.inputs.get("Emission Strength"): bsdf.inputs["Emission Strength"].default_value = 0.0
        mat.blend_method = "OPAQUE" if hasattr(mat, "blend_method") else None
    return part


def align(ob, axis=None, flip=False):
    """Long axis to Blender Y; front ends at -Y (glTF +Z forward)."""
    mn, mx = bounds(ob)
    size = mx - mn
    if axis is None: axis = max(range(3), key=lambda i: size[i])
    if axis == 0: ob.rotation_euler = (0, 0, math.radians(90))
    elif axis == 2: ob.rotation_euler = (math.radians(90), 0, 0)
    apply(ob)
    if flip:
        ob.rotation_euler = (0, 0, math.pi)
        apply(ob)
    mn, mx = bounds(ob)
    ob.location -= (mn + mx) / 2
    apply(ob)


def fit(ob, length, max_w, max_h, max_stretch=1.45):
    mn, mx = bounds(ob)
    w, l, h = mx.x - mn.x, mx.y - mn.y, mx.z - mn.z
    s = min(length / l, max_w / w, max_h / h)
    ob.scale = (s, s, s)
    apply(ob)
    stretch = min(max_stretch, length / (l * s))
    if stretch > 1.001:
        ob.scale = (1, stretch, 1)
        apply(ob)
    mn, mx = bounds(ob)
    ob.location -= (mn + mx) / 2
    apply(ob)


def place(ob, x, bottom, front=None, center=None):
    """glTF (x, y, z) == Blender (x, -z, y)."""
    mn, mx = bounds(ob)
    dx = x - (mn.x + mx.x) / 2
    dz = bottom - mn.z
    if front is not None: dy = -front - mn.y          # glTF front z == -Blender min y
    else: dy = -center - (mn.y + mx.y) / 2
    ob.location = (dx, dy, dz)
    apply(ob)


def gltf_box(ob):
    mn, mx = bounds(ob)
    return {"x": [mn.x, mx.x], "y": [mn.z, mx.z], "z": [-mx.y, -mn.y]}


def decimate(ob, target):
    """Decimate a mesh even when several engine nodes share it: detach the
    other users, apply on the single-user object, then relink them."""
    current = tris(ob)
    if current <= target: return
    sharers = [o for o in bpy.data.objects if o is not ob and o.type == "MESH" and o.data is ob.data]
    placeholder = bpy.data.meshes.new("placeholder") if sharers else None
    for o in sharers: o.data = placeholder
    select_only(ob)
    mod = ob.modifiers.new("lod", "DECIMATE")
    mod.ratio = max(0.02, target / current)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for o in sharers: o.data = ob.data
    if placeholder: bpy.data.meshes.remove(placeholder)


def principled(name, color, rough, metal):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def cable_mesh(name, pairs, radius, material):
    objs = []
    for i, (a, b, sag) in enumerate(pairs):
        cu = bpy.data.curves.new(f"{name}-{i}", "CURVE"); cu.dimensions = "3D"
        sp = cu.splines.new("BEZIER"); sp.bezier_points.add(1)
        p0, p1 = sp.bezier_points
        p0.co, p1.co = a, b
        mid = (a + b) / 2 + Vector((0, 0, -sag))
        p0.handle_left = p0.handle_right = a + (mid - a) * 0.7
        p1.handle_left = p1.handle_right = b + (mid - b) * 0.7
        cu.bevel_depth = radius; cu.bevel_resolution = 2; cu.resolution_u = 10
        ob = bpy.data.objects.new(f"{name}-{i}", cu); bpy.context.collection.objects.link(ob)
        objs.append(ob)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH")
    if len(objs) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name; ob.data.name = name
    ob.data.materials.clear(); ob.data.materials.append(material)
    return ob


def scale_images(size):
    for img in bpy.data.images:
        if img.size[0] > size or img.size[1] > size:
            img.scale(size, size)


def export(objs, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    kw = dict(filepath=path, use_selection=True, export_format="GLB", export_apply=True,
              export_image_format="WEBP", export_draco_mesh_compression_enable=True,
              export_draco_mesh_compression_level=6, export_yup=True, export_cameras=False,
              export_lights=False, export_animations=False, export_tangents=False)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        kw.pop("export_animations", None)
        bpy.ops.export_scene.gltf(**kw)
    return os.path.getsize(path)


report = {}
for pod, spec in config.items():
    if pod.startswith("_") or (ONLY and pod not in ONLY): continue
    reset()
    parts = {}
    engines = []
    for index, e in enumerate(spec["engines"]):
        src = e["part"]
        if src not in parts:
            ob = import_part(src)
            align(ob, e.get("axis"), e.get("flip", False))
            fit(ob, e["length"], e["maxW"], e["maxH"])
            parts[src] = ob
            base = ob
        else:
            base = parts[src]
        ob = base if not any(x["ob"] is base for x in engines) else base.copy()
        if ob is not base:
            ob.data = base.data  # linked: one mesh, several nodes
            bpy.context.collection.objects.link(ob)
        engines.append({"spec": e, "ob": ob})
    # Unlinked duplicates must be positioned individually; linked data means
    # we translate objects, not vertices, so place via object location.
    for item in engines:
        ob, e = item["ob"], item["spec"]
        mn, mx = bounds(ob)
        # Positions are computed from the shared mesh's own bounds (object at origin).
        ob.location = (0, 0, 0); bpy.context.view_layer.update()
        mn, mx = bounds(ob)
        ob.location = (e["x"] - (mn.x + mx.x) / 2, -e["front"] - mn.y, e["bottom"] - mn.z)
        ob.name = f"{pod}-{e['name']}-body"
    c = spec["cockpit"]
    cockpit = import_part(c["part"])
    align(cockpit, c.get("axis"), c.get("flip", False))
    fit(cockpit, c["length"], c["maxW"], c["maxH"], max_stretch=1.25)
    place(cockpit, 0.0, c["bottom"], center=c["center"])
    cockpit.name = f"{pod}-cockpit-body"
    bpy.context.view_layer.update()

    # Attachments (glTF space) and tow cables.
    def box(ob):
        mw = ob.matrix_world
        xs = [mw @ v.co for v in ob.data.vertices]
        mn = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
        mx = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
        return mn, mx
    by_name = {item["spec"]["name"]: item["ob"] for item in engines}
    exhaust_names = spec.get("exhaust") or [n for n in ("engine-left", "engine-right") if n in by_name]
    coupling_names = spec.get("coupling") if "coupling" in spec else [n for n in ("engine-left", "engine-right") if n in by_name]
    cmn, cmx = box(cockpit)
    cockpit_front = -cmn.y
    attachments = {}
    labels = ["exhaustLeft", "exhaustRight"]
    radii = []
    for label, name in zip(labels, exhaust_names):
        mn, mx = box(by_name[name])
        cx, cz = (mn.x + mx.x) / 2, mn.z + (mx.z - mn.z) * 0.46
        attachments[label] = [round(cx, 4), round(cz, 4), round(-mx.y + 0.2, 4)]
        radii.append(min(mx.x - mn.x, mx.z - mn.z) * 0.3)
    for label, name in zip(["couplingLeft", "couplingRight"], coupling_names):
        mn, mx = box(by_name[name])
        inner = mx.x if (mn.x + mx.x) / 2 < 0 else mn.x
        attachments[label] = [round(inner, 4), round(mn.z + (mx.z - mn.z) * 0.62, 4), round(-mn.y - (mx.y - mn.y) * 0.18, 4)]
    attachments["pilot"] = [0.0, round(cmn.z + (cmx.z - cmn.z) * 0.72, 4), round(-(cmn.y + cmx.y) / 2, 4)]

    cable_pairs = []
    for name in exhaust_names or list(by_name)[:2]:
        mn, mx = box(by_name[name])
        cx = (mn.x + mx.x) / 2
        side = -1 if cx < 0 else 1
        start = Vector((cx - side * (mx.x - mn.x) * 0.28, mx.y - (mx.y - mn.y) * 0.08, mn.z + (mx.z - mn.z) * 0.38))
        end = Vector((side * min(0.45, (cmx.x - cmn.x) * 0.25), cmn.y + 0.35, cmn.z + (cmx.z - cmn.z) * 0.42))
        if abs(cx) < 0.5:  # single centre engine: two cables from its flanks
            for s in (-1, 1):
                a = Vector((s * (mx.x - mn.x) * 0.3, mx.y - 0.3, mn.z + (mx.z - mn.z) * 0.35))
                b = Vector((s * 0.4, cmn.y + 0.35, cmn.z + (cmx.z - cmn.z) * 0.42))
                cable_pairs.append((a, b, 0.35))
            continue
        cable_pairs.append((start, end, 0.55))
    cable_mat = principled(f"{pod}-tow-cable", (0.045, 0.04, 0.042), 0.45, 0.6)
    cables = cable_mesh(f"{pod}-tow-cables", cable_pairs, 0.11, cable_mat)

    # Unique, pod-scoped material and image names keep packages self-describing.
    for ob in [cockpit] + list(parts.values()):
        for slot in ob.material_slots:
            if slot.material and not slot.material.name.startswith(pod):
                slot.material.name = f"{pod}-{ob.name.split('-body')[0].split(pod + '-')[-1]}-paint"
    for img in bpy.data.images:
        if not img.name.startswith(pod): img.name = f"{pod}-{img.name}"

    objs = [item["ob"] for item in engines] + [cockpit, cables]
    # --- hero ---
    unique_engines = list(parts.values())
    n_eng = len(engines)
    per_engine_hero = int((HERO_TRIS - 16000 - tris(cables)) / max(1, n_eng))
    for ob in unique_engines: decimate(ob, per_engine_hero)
    decimate(cockpit, 16000)
    scale_images(1024)
    hero_path = os.path.join(OUT, f"{pod}-hero.glb")
    hero_bytes = export(objs, hero_path)
    hero_tris = sum(tris(o) for o in objs)
    all_mn = Vector((1e9, 1e9, 1e9)); all_mx = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        mn, mx = box(o)
        all_mn = Vector((min(all_mn.x, mn.x), min(all_mn.y, mn.y), min(all_mn.z, mn.z)))
        all_mx = Vector((max(all_mx.x, mx.x), max(all_mx.y, mx.y), max(all_mx.z, mx.z)))
    # --- rival ---
    per_engine_rival = int((RIVAL_TRIS - 8000 - tris(cables)) / max(1, n_eng))
    for ob in unique_engines: decimate(ob, per_engine_rival)
    decimate(cockpit, 8000)
    scale_images(512)
    rival_path = os.path.join(OUT, f"{pod}-rival.glb")
    rival_bytes = export(objs, rival_path)
    rival_tris = sum(tris(o) for o in objs)
    report[pod] = {
        "identity": spec["identity"], "hero_bytes": hero_bytes, "rival_bytes": rival_bytes,
        "hero_tris": hero_tris, "rival_tris": rival_tris, "draws": len(objs),
        "attachments": attachments, "exhaustApertureRadius": round(min(radii) if radii else 0.5, 3),
        "bounds": {"x": [round(all_mn.x, 2), round(all_mx.x, 2)], "y": [round(all_mn.z, 2), round(all_mx.z, 2)],
                   "z": [round(-all_mx.y, 2), round(-all_mn.y, 2)]},
    }
    print("POD", pod, json.dumps(report[pod]))

json.dump(report, open(os.path.join(OUT, "fleet-report.json"), "w"), indent=2)
print("DONE", len(report))
