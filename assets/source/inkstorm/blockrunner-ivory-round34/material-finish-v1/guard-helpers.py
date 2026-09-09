import bpy, json, math

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

def matrix_rows(matrix):
    return [list(row) for row in matrix]

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

def normal_signatures(source):
    return {ob.name: {'cornerCount': len(ob.data.corner_normals),
                      'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals]),
                      'hasCustomNormals': ob.data.has_custom_normals}
            for ob in sorted(source.objects, key=name_key) if ob.type == 'MESH'}

def context_record(window):
    layer = window.view_layer
    return {'scene': window.scene.name, 'viewLayer': layer.name,
            'activeObject': layer.objects.active.name if layer.objects.active else None,
            'selectedObjects': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer)),
            'mode': bpy.context.mode}

def render_record(scene):
    render = scene.render
    record = {'engine': render.engine, 'resolution': [render.resolution_x, render.resolution_y, render.resolution_percentage],
              'pixelAspect': [render.pixel_aspect_x, render.pixel_aspect_y],
              'filmTransparent': render.film_transparent, 'filepath': render.filepath,
              'border': [render.use_border, render.use_crop_to_border, render.border_min_x, render.border_min_y, render.border_max_x, render.border_max_y],
              'image': [render.image_settings.file_format, render.image_settings.color_mode, render.image_settings.color_depth],
              'color': [scene.view_settings.view_transform, scene.view_settings.look, scene.view_settings.exposure, scene.view_settings.gamma],
              'fps': [render.fps, render.fps_base]}
    if hasattr(scene, 'cycles'):
        record['cycles'] = [scene.cycles.device, scene.cycles.samples, scene.cycles.use_denoising]
    return record

def scene_record(scene):
    return {'name': scene.name, 'objects': sorted(ob.name for ob in scene.objects),
            'masterObjects': sorted(ob.name for ob in scene.collection.objects),
            'masterChildren': sorted(c.name for c in scene.collection.children),
            'frame': [scene.frame_current, scene.frame_subframe, scene.frame_start, scene.frame_end],
            'camera': scene.camera.name if scene.camera else None,
            'world': scene.world.name if scene.world else None,
            'cursorMatrix': matrix_rows(scene.cursor.matrix), 'render': render_record(scene),
            'layers': [{'name': layer.name, 'active': layer.objects.active.name if layer.objects.active else None,
                        'selected': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer))}
                       for layer in scene.view_layers]}

def collection_record(collection):
    return {'name': collection.name, 'objects': sorted(ob.name for ob in collection.objects),
            'children': sorted(c.name for c in collection.children),
            'hideRender': collection.hide_render, 'hideViewport': collection.hide_viewport}

def datablock_sets():
    return {
        'scenes': set(bpy.data.scenes),
        'collections': set(bpy.data.collections),
        'objects': set(bpy.data.objects),
        'meshes': set(bpy.data.meshes),
        'materials': set(bpy.data.materials),
        'images': set(bpy.data.images),
        'worlds': set(bpy.data.worlds),
        'cameras': set(bpy.data.cameras),
        'lights': set(bpy.data.lights),
        'curves': set(bpy.data.curves),
        'actions': set(bpy.data.actions),
        'node_groups': set(bpy.data.node_groups),
    }

def fresh_snapshot():
    window = bpy.context.window
    assert window is not None, 'Existing interactive Blender window required.'
    layer = window.view_layer
    sets = datablock_sets()
    return {'window': window, 'scene': window.scene, 'layer': layer, 'active': layer.objects.active,
            'selected': set(ob for ob in layer.objects if ob.select_get(view_layer=layer)),
            'context': context_record(window), 'sets': sets,
            'scenes': {scene: scene_record(scene) for scene in bpy.data.scenes},
            'collections': {collection: collection_record(collection) for collection in bpy.data.collections}}

def restore_original_context(snapshot):
    window = snapshot['window']
    if window.scene != snapshot['scene']:
        window.scene = snapshot['scene']
    if window.view_layer != snapshot['layer']:
        window.view_layer = snapshot['layer']
    layer = snapshot['layer']
    selected = set(ob for ob in layer.objects if ob.select_get(view_layer=layer))
    if selected != snapshot['selected']:
        for ob in layer.objects:
            desired = ob in snapshot['selected']
            if ob.select_get(view_layer=layer) != desired:
                ob.select_set(desired, view_layer=layer)
    if layer.objects.active != snapshot['active']:
        layer.objects.active = snapshot['active']
    assert context_record(window) == snapshot['context'], 'Original scene/layer/active/selection/mode not restored.'

def verify_snapshot(snapshot):
    restore_original_context(snapshot)
    changed_scenes = [scene.name for scene, previous in snapshot['scenes'].items() if scene_record(scene) != previous]
    changed_collections = [collection.name for collection, previous in snapshot['collections'].items() if collection_record(collection) != previous]
    current_sets = datablock_sets()
    changed_ids = [name for name, previous in snapshot['sets'].items() if current_sets[name] != previous]
    result = {'contextRestored': context_record(snapshot['window']) == snapshot['context'],
              'changedScenes': changed_scenes, 'changedCollections': changed_collections,
              'changedDatablockSets': changed_ids,
              'allSceneSettingsAndMembershipsPreserved': not changed_scenes,
              'allCollectionMembershipsPreserved': not changed_collections,
              'noPersistentDatablocksCreatedOrRemoved': not changed_ids}
    return result

from mathutils import Vector
def attribute_values(attribute):
    rows=[]
    for item in attribute.data:
        if hasattr(item, 'vector'):
            rows.append(list(item.vector))
        elif hasattr(item, 'color'):
            rows.append(list(item.color))
        elif hasattr(item, 'value'):
            value=item.value
            if isinstance(value, (int,float,bool,str)):
                rows.append(value)
            else:
                rows.append(list(value))
        else:
            raise AssertionError('Unsupported existing attribute value type: '+attribute.name)
    return rows

def geometry_record(mesh):
    return fnv1a64_signature({
        'vertices':[list(v.co) for v in mesh.vertices],
        'edges':[list(e.vertices) for e in mesh.edges],
        'polygons':[(list(p.vertices),p.use_smooth) for p in mesh.polygons],
        'loops':[(l.vertex_index,l.edge_index) for l in mesh.loops],
        'uv':[(a.name,[list(d.uv) for d in a.data]) for a in mesh.uv_layers],
        'attributes':[(a.name,a.data_type,a.domain,attribute_values(a)) for a in mesh.attributes
                      if a.name not in ('material_index','ivorySourcePolygon','ivoryPaintRole','ivoryFinishEdgeDistance','ivoryFinishRegion')],
        'shapeKeys':mesh.shape_keys.name if mesh.shape_keys else None,
        'normals':[list(n.vector) for n in mesh.corner_normals],
        'hasCustomNormals':mesh.has_custom_normals})

def require_histories():
    for name, expected in INPUT['reference'].items():
        scene=bpy.data.scenes.get(name)
        assert scene is not None, 'Missing preserved source history: '+name
        assert source_signature(scene)==expected['structure'], 'Source structure/material drift: '+name
        assert normal_signatures(scene)==expected['rawNormals'], 'Source raw corner-normal drift: '+name

def srgb_channel(v):
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4

def preserved_global(snapshot):
    restore_original_context(snapshot)
    sets=datablock_sets()
    removed={k:sorted(v.name for v in previous-sets[k]) for k,previous in snapshot['sets'].items()}
    additions={k:sorted(v.name for v in sets[k]-previous) for k,previous in snapshot['sets'].items()}
    scenes=[s.name for s,old in snapshot['scenes'].items() if scene_record(s)!=old]
    collections_changed=[c.name for c,old in snapshot['collections'].items() if collection_record(c)!=old]
    assert not scenes and not collections_changed and not any(removed.values()), 'Global history/context mutation'
    return {'contextRestored':True,'allPreexistingSceneSettingsMembershipsPreserved':True,
            'allPreexistingCollectionSettingsMembershipsPreserved':True,
            'preexistingSceneCount':len(snapshot['sets']['scenes']),'removedIds':removed,'addedIds':additions}

def rollback_new_ids(snapshot):
    # Explicit collection APIs, no dynamic bpy namespace access or source deletion.
    for ob in list(set(bpy.data.objects)-snapshot['sets']['objects']): bpy.data.objects.remove(ob,do_unlink=True)
    for scene in list(set(bpy.data.scenes)-snapshot['sets']['scenes']): bpy.data.scenes.remove(scene)
    for mesh in list(set(bpy.data.meshes)-snapshot['sets']['meshes']): bpy.data.meshes.remove(mesh)
    for material in list(set(bpy.data.materials)-snapshot['sets']['materials']): bpy.data.materials.remove(material)
