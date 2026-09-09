"""Definitions only. Prefix safe00/01/13-attributes/14-atlas-wrap-guards.
Exact node-operation guards supplement the legacy material signature. No bake.
"""


def contact_node_record(node):
    row = {'name': node.name, 'type': node.bl_idname, 'mute': node.mute,
           'inputs': [(s.identifier, s.name, socket_value(s)) for s in node.inputs],
           'outputs': [(s.identifier, s.name, socket_value(s)) for s in node.outputs]}
    # Explicit supported semantic fields: computed getattr/RNA property reads
    # are disallowed by MCP safe mode. All socket defaults remain recorded.
    scalar_properties = {}
    if node.bl_idname == 'ShaderNodeOutputMaterial':
        scalar_properties = {'target': node.target, 'isActiveOutput': node.is_active_output}
    elif node.bl_idname == 'ShaderNodeBsdfPrincipled':
        scalar_properties = {'distribution': node.distribution, 'subsurfaceMethod': node.subsurface_method}
    elif node.bl_idname == 'ShaderNodeMath':
        scalar_properties = {'operation': node.operation, 'useClamp': node.use_clamp}
    elif node.bl_idname == 'ShaderNodeVectorMath':
        scalar_properties = {'operation': node.operation}
    elif node.bl_idname == 'ShaderNodeMixRGB':
        scalar_properties = {'blendType': node.blend_type, 'useClamp': node.use_clamp, 'useAlpha': node.use_alpha}
    elif node.bl_idname == 'ShaderNodeTexNoise':
        scalar_properties = {'noiseDimensions': node.noise_dimensions,
                             'noiseType': getattr(node, 'noise_type', None),
                             'normalize': getattr(node, 'normalize', None)}
    elif node.bl_idname == 'ShaderNodeVertexColor':
        scalar_properties = {'layerName': node.layer_name}
    elif node.bl_idname == 'ShaderNodeSeparateColor':
        scalar_properties = {'mode': node.mode}
    elif node.bl_idname == 'ShaderNodeTexImage':
        scalar_properties = {'extension': node.extension, 'interpolation': node.interpolation,
                             'projection': node.projection, 'projectionBlend': node.projection_blend}
    elif node.bl_idname == 'ShaderNodeAmbientOcclusion':
        scalar_properties = {'samples': node.samples, 'inside': node.inside, 'onlyLocal': node.only_local}
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
