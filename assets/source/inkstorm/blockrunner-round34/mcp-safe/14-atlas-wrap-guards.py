"""Definitions only. Prefix safe00+01. No image, material or mesh mutation."""


def wrap_normal_signatures(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def wrap_geometry_record(mesh):
    return {'vertices': [list(v.co) for v in mesh.vertices],
            'edges': [list(e.vertices) for e in mesh.edges],
            'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in mesh.polygons],
            'uv': [(layer.name, [list(item.uv) for item in layer.data]) for layer in mesh.uv_layers],
            'attributes': [(a.name, a.domain, a.data_type, len(a.data)) for a in mesh.attributes],
            'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None}


def wrap_material_detail(material):
    # The older source signature omits texture extension. This additional
    # record explicitly covers every shader type present in final V5/V6.
    record = material_record(material)
    record['shaderProperties'] = []
    assert material.use_nodes and material.node_tree is not None
    assert len(material.node_tree.nodes) == 5
    for node in sorted(material.node_tree.nodes, key=name_key):
        row = {'name': node.name, 'type': node.bl_idname,
               'mute': node.mute,
               'inputSocketIdentifiers': [socket.identifier for socket in node.inputs]}
        if node.bl_idname == 'ShaderNodeTexImage':
            row['extension'] = node.extension
            row['interpolation'] = node.interpolation
            row['projection'] = node.projection
            row['projectionBlend'] = node.projection_blend
            row['imageName'] = node.image.name if node.image else None
        elif node.bl_idname == 'ShaderNodeSeparateColor':
            row['mode'] = node.mode
        elif node.bl_idname == 'ShaderNodeBsdfPrincipled':
            row['distribution'] = node.distribution
            row['subsurfaceMethod'] = node.subsurface_method
        elif node.bl_idname == 'ShaderNodeOutputMaterial':
            row['target'] = node.target
            row['isActiveOutput'] = node.is_active_output
        else:
            assert False, ('Unexpected final atlas shader node', node.name, node.bl_idname)
        record['shaderProperties'].append(row)
    record['activeNode'] = material.node_tree.nodes.active.name if material.node_tree.nodes.active else None
    return record


def wrap_atlas_graph_signatures(scene):
    result = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            for slot in ob.material_slots:
                assert slot.material is not None
                result[slot.material.name] = fnv1a64_signature(wrap_material_detail(slot.material))
    return result


def wrap_binary_fnv(data):
    signature = 14695981039346656037
    for byte_value in data:
        signature = ((signature ^ byte_value) * 1099511628211) & 18446744073709551615
    return format(signature, '016x')


def wrap_image_record(image):
    assert image.source in {'FILE', 'GENERATED'}
    assert image.packed_file is not None, ('Expected actual packed atlas', image.name)
    encoded = image.packed_file.data
    return {'name': image.name, 'size': list(image.size),
            'colorSpace': image.colorspace_settings.name, 'filepath': image.filepath,
            'alphaMode': image.alpha_mode, 'source': image.source,
            'isDirty': image.is_dirty, 'isFloat': image.is_float,
            'packedBytes': len(encoded), 'packedBytesFnv1a64': wrap_binary_fnv(encoded)}


def wrap_linked_image_records(scene):
    images = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            for slot in ob.material_slots:
                assert slot.material is not None and slot.material.use_nodes
                for node in slot.material.node_tree.nodes:
                    if node.type == 'TEX_IMAGE':
                        assert node.image is not None
                        images[node.image.name] = node.image
    return {name: wrap_image_record(image) for name, image in images.items()}


def wrap_image_identities(records):
    return {name: {key: row[key] for key in ['name', 'size', 'colorSpace', 'filepath']}
            for name, row in records.items()}
