"""Definitions only. Prefix safe00/01/13-attributes/14-atlas-wrap-guards.
Exact node-operation guards supplement the legacy material signature. No bake.
"""


def contact_node_record(node):
    row = {'name': node.name, 'type': node.bl_idname, 'mute': node.mute,
           'inputs': [(s.identifier, s.name, socket_value(s)) for s in node.inputs],
           'outputs': [(s.identifier, s.name, socket_value(s)) for s in node.outputs]}
    # Record all exposed scalar/enum writable RNA fields, including operations,
    # dimensions, interpolation, layer names and AO properties. ID pointers are
    # recorded separately; no node group or external script nodes are allowed.
    scalar_properties = {}
    for prop in node.bl_rna.properties:
        if prop.is_readonly or prop.identifier in {'name'}:
            continue
        if prop.type in {'BOOLEAN', 'INT', 'FLOAT', 'STRING', 'ENUM'}:
            value = getattr(node, prop.identifier)
            if getattr(prop, 'is_array', False):
                value = list(value)
            if isinstance(value, set):
                value = sorted(value)
            scalar_properties[prop.identifier] = value
    row['properties'] = scalar_properties
    if node.bl_idname == 'ShaderNodeTexImage':
        row['image'] = node.image.name if node.image else None
        row['colorMapping'] = {'blendColor': list(node.color_mapping.blend_color),
                              'blendFactor': node.color_mapping.blend_factor,
                              'blendType': node.color_mapping.blend_type}
        row['textureMapping'] = {'translation': list(node.texture_mapping.translation),
                                'rotation': list(node.texture_mapping.rotation),
                                'scale': list(node.texture_mapping.scale),
                                'vectorType': node.texture_mapping.vector_type}
    assert node.bl_idname in {
        'ShaderNodeOutputMaterial', 'ShaderNodeBsdfPrincipled', 'ShaderNodeMath',
        'ShaderNodeVectorMath', 'ShaderNodeMixRGB', 'ShaderNodeNewGeometry',
        'ShaderNodeTexNoise', 'ShaderNodeVertexColor', 'ShaderNodeSeparateColor',
        'ShaderNodeSeparateXYZ', 'ShaderNodeTexImage', 'ShaderNodeAmbientOcclusion'
    }, ('Unreviewed node type', node.name, node.bl_idname)
    return row


def contact_material_record(material):
    row = material_record(material)
    row['nodes'] = [contact_node_record(node) for node in sorted(material.node_tree.nodes, key=name_key)]
    row['links'] = sorted((link.from_node.name, link.from_socket.identifier,
                           link.to_node.name, link.to_socket.identifier)
                          for link in material.node_tree.links)
    row['activeNode'] = material.node_tree.nodes.active.name if material.node_tree.nodes.active else None
    return row


def contact_graph_signatures(scene):
    result = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            for slot in ob.material_slots:
                assert slot.material is not None and slot.material.use_nodes
                result[slot.material.name] = fnv1a64_signature(contact_material_record(slot.material))
    return result


def contact_roughness_record(material):
    # Recursive input ancestry of the actual Principled roughness socket;
    # no color/AO branch is permitted to enter this unchanged dependency set.
    shader = material.node_tree.nodes['Principled BSDF']
    roughness = shader.inputs['Roughness']
    pending = [link.from_node for link in roughness.links]
    seen = set()
    nodes = []
    links = []
    while pending:
        node = pending.pop()
        if node.name in seen:
            continue
        seen.add(node.name)
        nodes.append(contact_node_record(node))
        for socket in node.inputs:
            for link in socket.links:
                links.append((link.from_node.name, link.from_socket.identifier,
                              node.name, socket.identifier))
                pending.append(link.from_node)
    def node_name(row):
        return row['name']
    return {'defaultValue': socket_value(roughness),
            'rootLinks': sorted((l.from_node.name, l.from_socket.identifier) for l in roughness.links),
            'nodes': sorted(nodes, key=node_name), 'links': sorted(links)}
