"""PREPARED ONLY. Source-preserving V4 geometry-aware procedural paint copy.

Prefix safe00+01, 13-v4-attribute-signatures.py, and
13-v4-geometry-wear-reference.py. Inject actual BLOCKRUNNER_AUDIT,
BLOCKRUNNER_FIT, BLOCKRUNNER_PAINT_AUTHOR (V2), BLOCKRUNNER_PAINT_STATE
(V2 after all four bakes). No bake, UV operator, normal encoding or export.
"""
V4_SCENE = 'PodRacing — Blockrunner geometry-aware Inkstorm paint round34 V4'
V4_BODY = 'blockrunner-body-paint-v4'
V4_PILOT = 'blockrunner-pilot-paint-v4'
assert V4_SCENE not in bpy.data.scenes
assert V4_BODY not in bpy.data.objects and V4_PILOT not in bpy.data.objects
assert BLOCKRUNNER_V4_MASKS['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_AUTHOR['targetScene'] == BLOCKRUNNER_V4_MASKS['parentScene']
assert BLOCKRUNNER_PAINT_STATE['targetScene'] == BLOCKRUNNER_V4_MASKS['parentScene']
assert BLOCKRUNNER_PAINT_STATE['bodyMeshName'] == 'blockrunner-body-paint-v2'
assert BLOCKRUNNER_PAINT_STATE['pilotMeshName'] == 'blockrunner-pilot-paint-v2'
assert fnv1a64_signature(BLOCKRUNNER_PAINT_STATE['paintSignature']) == BLOCKRUNNER_V4_MASKS['parentPaintSignatureFnv1a64']
mask_payload = {key: value for key, value in BLOCKRUNNER_V4_MASKS.items() if key != 'maskDataFnv1a64'}
assert fnv1a64_signature(mask_payload) == BLOCKRUNNER_V4_MASKS['maskDataFnv1a64']

BODY_RECIPES = [
    {'role': 'oxblood', 'base': '#AD4937', 'roughness': .49, 'variation': .035, 'undercoat': '#979B96'},
    {'role': 'ivory', 'base': '#E6DCC7', 'roughness': .58, 'variation': .022, 'undercoat': '#8E8B81'},
    {'role': 'graphite', 'base': '#414B57', 'roughness': .45, 'variation': .035, 'undercoat': '#A2A69F'}]
PILOT_RECIPES = [
    {'role': 'suit', 'base': '#606B76', 'roughness': .84, 'variation': .018, 'metallic': 0, 'specular': .24, 'coat': 0},
    {'role': 'helmet', 'base': '#99A2A5', 'roughness': .33, 'variation': .012, 'metallic': .28, 'specular': .50, 'coat': .08},
    {'role': 'visor', 'base': '#222C34', 'roughness': .16, 'variation': .005, 'metallic': 0, 'specular': .55, 'coat': .16},
    {'role': 'gloves', 'base': '#BBAF9B', 'roughness': .76, 'variation': .018, 'metallic': 0, 'specular': .28, 'coat': 0}]


def v4_normals(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def v4_linked_images(scene):
    result = {}
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        for slot in ob.material_slots:
            material = slot.material
            if material is None or not material.use_nodes:
                continue
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image is not None:
                    image = node.image
                    result[image.name] = {'name': image.name, 'size': list(image.size),
                        'colorSpace': image.colorspace_settings.name, 'filepath': image.filepath}
    return result


def v4_geometry_uv_signature(mesh):
    return fnv1a64_signature({'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data]) for layer in mesh.uv_layers],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None})


def v4_linear_hex(value):
    channels = [int(value[index:index+2], 16)/255 for index in (1, 3, 5)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in channels) + (1,)


def v4_material(name, recipe, body):
    assert name not in bpy.data.materials
    material = bpy.data.materials.new(name)
    owned_materials.append(material)
    material.use_nodes = True
    material.diffuse_color = v4_linear_hex(recipe['base'])
    material.use_backface_culling = False
    material.metallic = 0 if body else recipe['metallic']
    material.roughness = recipe['roughness']
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    # Explicit supported sockets only. Do not clone Blender's hidden Weight
    # socket by display name; it is not present on every fresh Principled node.
    responses = {'Metallic': 0 if body else recipe['metallic'],
        'IOR': 1.45,
        'Specular IOR Level': .38 if body else recipe['specular'],
        'Coat Weight': .06 if body else recipe['coat'],
        'Coat Roughness': .35, 'Transmission Weight': 0, 'Alpha': 1}
    for socket_name, value in responses.items():
        socket = shader.inputs.get(socket_name)
        assert socket is not None, ('Required Principled response unavailable', socket_name)
        socket.default_value = value
    shader.inputs['Roughness'].default_value = recipe['roughness']
    shader.inputs['Base Color'].default_value = v4_linear_hex(recipe['base'])

    def set_input(socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            links.new(value, socket)
        else:
            socket.default_value = value

    def math_node(operation, a, b=0):
        node = nodes.new('ShaderNodeMath')
        node.operation = operation
        set_input(node.inputs[0], a)
        set_input(node.inputs[1], b)
        return node.outputs[0]

    def clamp(value):
        return math_node('MINIMUM', math_node('MAXIMUM', value, 0), 1)

    def mix_color(a, b, factor, label):
        node = nodes.new('ShaderNodeMixRGB')
        node.name = label
        set_input(node.inputs[0], factor)
        set_input(node.inputs[1], a)
        set_input(node.inputs[2], b)
        return node.outputs[0]

    def mix_scalar(a, b, factor):
        return math_node('ADD', math_node('MULTIPLY', a, math_node('SUBTRACT', 1, factor)),
                         math_node('MULTIPLY', b, factor))

    geometry = nodes.new('ShaderNodeNewGeometry')
    geometry.name = 'Inkstorm Source World Geometry'
    def noise(scale, label):
        vector = nodes.new('ShaderNodeVectorMath')
        vector.operation = 'MULTIPLY'
        vector.inputs[1].default_value = scale
        links.new(geometry.outputs['Position'], vector.inputs[0])
        node = nodes.new('ShaderNodeTexNoise')
        node.name = label
        node.noise_dimensions = '3D'
        node.inputs['Scale'].default_value = 1
        node.inputs['Detail'].default_value = 1
        node.inputs['Roughness'].default_value = .5
        links.new(vector.outputs['Vector'], node.inputs['Vector'])
        return node.outputs['Fac']

    broad = noise((.9, .9, .9), 'Inkstorm Large Surface Variation')
    factor = math_node('ADD', 1-recipe['variation'], math_node('MULTIPLY', broad, 2*recipe['variation']))
    multiply = nodes.new('ShaderNodeMixRGB')
    multiply.name = 'Inkstorm Large Color Field'
    multiply.blend_type = 'MULTIPLY'
    multiply.inputs[0].default_value = 1
    multiply.inputs[1].default_value = v4_linear_hex(recipe['base'])
    links.new(factor, multiply.inputs[2])
    color = multiply.outputs[0]
    roughness = math_node('ADD', recipe['roughness']-.025, math_node('MULTIPLY', broad, .05))
    distance = nodes.new('ShaderNodeVertexColor')
    distance.name = 'Inkstorm V4 Measured Edge Distances'
    distance.layer_name = BLOCKRUNNER_V4_MASKS['distanceAttribute']
    strength = nodes.new('ShaderNodeVertexColor')
    strength.name = 'Inkstorm V4 Contact Strength And Surface Role'
    strength.layer_name = BLOCKRUNNER_V4_MASKS['strengthAttribute']
    ds = nodes.new('ShaderNodeSeparateColor')
    ds.mode = 'RGB'
    links.new(distance.outputs['Color'], ds.inputs['Color'])
    ss = nodes.new('ShaderNodeSeparateColor')
    ss.mode = 'RGB'
    links.new(strength.outputs['Color'], ss.inputs['Color'])

    if body:
        edge_channels = []
        for channel in ('Red', 'Green', 'Blue'):
            band = clamp(math_node('MULTIPLY', math_node('SUBTRACT', 1, ds.outputs[channel]), 2.6))
            edge_channels.append(math_node('MULTIPLY', band, ss.outputs[channel]))
        edges = math_node('MAXIMUM', math_node('MAXIMUM', edge_channels[0], edge_channels[1]), edge_channels[2])
        fracture = noise((4, 3, 7), 'Inkstorm Edge Only Medium Breakup')
        breakup = math_node('ADD', .55, math_node('MULTIPLY', clamp(math_node('MULTIPLY', math_node('SUBTRACT', fracture, .35), 3.3)), .45))
        wear = clamp(math_node('MULTIPLY', math_node('MULTIPLY', edges, breakup), 1.6))
        dirt = math_node('MULTIPLY', clamp(math_node('SUBTRACT', 1, distance.outputs['Alpha'])), .10)
        if recipe['role'] == 'oxblood':
            # Values derive from exact existing connected intake components:
            # alpha 1/3 = ten 8-face blades; alpha 2/3 = measured hub pieces.
            blade = clamp(math_node('MULTIPLY', strength.outputs['Alpha'], 3))
            hub = clamp(math_node('SUBTRACT', math_node('MULTIPLY', strength.outputs['Alpha'], 3), 1))
            color = mix_color(color, v4_linear_hex('#56616A'), blade, 'Inkstorm Existing Intake Blades')
            color = mix_color(color, v4_linear_hex('#929B9C'), hub, 'Inkstorm Existing Intake Hubs')
            roughness = mix_scalar(roughness, .38, blade)
            roughness = mix_scalar(roughness, .28, hub)
        color = mix_color(color, v4_linear_hex(recipe['undercoat']), wear, 'Inkstorm Local Exposed Undercoat')
        roughness = mix_scalar(roughness, .29 if recipe['role'] != 'ivory' else .38, wear)
        color = mix_color(color, v4_linear_hex('#746C5E'), dirt, 'Inkstorm Paint Color')
        roughness = mix_scalar(roughness, .75, dirt)
    else:
        if recipe['role'] == 'suit':
            accent = clamp(math_node('MULTIPLY', strength.outputs['Alpha'], 1.5))
            color = mix_color(color, v4_linear_hex('#7C8790'), accent, 'Inkstorm Source Suit Panels')
            roughness = mix_scalar(roughness, .78, accent)
        if recipe['role'] == 'visor':
            xyz = nodes.new('ShaderNodeSeparateXYZ')
            links.new(geometry.outputs['Position'], xyz.inputs[0])
            normal_xyz = nodes.new('ShaderNodeSeparateXYZ')
            links.new(geometry.outputs['Normal'], normal_xyz.inputs[0])
            visor = BLOCKRUNNER_V4_MASKS['owners']['pilot']
            dz = math_node('ABSOLUTE', math_node('SUBTRACT', xyz.outputs['Z'], visor['visorBandCenterZ']))
            band = clamp(math_node('SUBTRACT', 1, math_node('DIVIDE', dz, visor['visorBandHalfWidth'])))
            forward = clamp(math_node('MULTIPLY', normal_xyz.outputs['Y'], -1))
            band = math_node('MULTIPLY', math_node('MULTIPLY', band, forward), .42)
            color = mix_color(color, v4_linear_hex('#A1ABB0'), band, 'Inkstorm Controlled Visor Band')
        color = mix_color(color, color, 0, 'Inkstorm Paint Color')
    links.new(color, shader.inputs['Base Color'])
    final_roughness = nodes.new('ShaderNodeMath')
    final_roughness.name = 'Inkstorm Paint Roughness'
    final_roughness.operation = 'ADD'
    links.new(clamp(roughness), final_roughness.inputs[0])
    final_roughness.inputs[1].default_value = 0
    links.new(final_roughness.outputs[0], shader.inputs['Roughness'])
    assert not shader.inputs['Normal'].is_linked
    assert not any(node.type == 'TEX_IMAGE' for node in nodes)
    report['materialRecipes'].append({'material': material.name, 'owner': 'body' if body else 'pilot',
        'recipe': recipe, 'nonColorPrincipledResponses': responses,
        'normalMap': False, 'sourceImagesCopied': False,
        'roughnessBranches': {'blade': .38, 'hub': .28, 'exposedEdge': .29, 'ivoryExposedEdge': .38} if body else {}})
    return material


def apply_v4_masks(mesh, reference):
    assert len(mesh.polygons) == reference['polygons']
    assert len(mesh.vertices) == reference['vertexCount']
    for attribute_name in BLOCKRUNNER_V4_ATTRIBUTE_NAMES:
        assert attribute_name not in mesh.color_attributes
    distances = mesh.color_attributes.new(name=BLOCKRUNNER_V4_MASKS['distanceAttribute'], type='FLOAT_COLOR', domain='CORNER')
    strengths = mesh.color_attributes.new(name=BLOCKRUNNER_V4_MASKS['strengthAttribute'], type='FLOAT_COLOR', domain='CORNER')
    # RGB = distances to each triangle's opposite edge divided by physical
    # width. Alpha = one measured protected join distance. Inactive = 1.
    # Strength RGB is constant within a face; alpha encodes surface accents.
    distance_values = [1.0] * (len(mesh.loops)*4)
    strength_values = [0.0] * (len(mesh.loops)*4)
    encoded = reference['sparseEdgeRecords']
    assert len(encoded) == reference['recordCount']*8
    previous = -1
    for start in range(0, len(encoded), 8):
        polygon_index = int(encoded[start:start+4], 16)
        assert previous < polygon_index < len(mesh.polygons)
        previous = polygon_index
        weights = [int(encoded[start+4+i], 16)/15 for i in range(3)]
        flags = int(encoded[start+7], 16)
        cavity = flags & 3
        accent = (flags >> 2)/3
        polygon = mesh.polygons[polygon_index]
        assert len(polygon.vertices) == 3
        points = [mesh.vertices[index].co.copy() for index in polygon.vertices]
        double_area = (points[1]-points[0]).cross(points[2]-points[0]).length
        assert double_area > .000000000001
        heights = [double_area / (points[(i+1)%3]-points[(i+2)%3]).length for i in range(3)]
        for corner, loop_index in enumerate(polygon.loop_indices):
            offset = loop_index*4
            for channel in range(3):
                if weights[channel] > 0:
                    distance_values[offset+channel] = heights[channel]/reference['wearWidthSourceUnits'] if corner == channel else 0
                strength_values[offset+channel] = weights[channel]
            if cavity:
                distance_values[offset+3] = heights[cavity-1]/reference['joinWidthSourceUnits'] if corner == cavity-1 else 0
            strength_values[offset+3] = accent
    distances.data.foreach_set('color', distance_values)
    strengths.data.foreach_set('color', strength_values)
    assert distances.domain == 'CORNER' and strengths.domain == 'CORNER'
    assert distances.data_type == 'FLOAT_COLOR' and strengths.data_type == 'FLOAT_COLOR'
    assert len(distances.data) == len(mesh.loops) and len(strengths.data) == len(mesh.loops)
    # FLOAT_COLOR must retain HDR distances; clamping them would widen wear
    # over large low-poly faces and defeat the geometric band construction.
    wanted_max = max(distance_values)
    actual_max = max(max(item.color) for item in distances.data)
    assert abs(actual_max-wanted_max) <= max(.0001, wanted_max*.000001)
    if wanted_max > 1:
        assert actual_max > 1, 'Measured distance gradients were clamped.'
    return {'records': reference['recordCount'], 'wearWidthSourceUnits': reference['wearWidthSourceUnits'],
        'joinWidthSourceUnits': reference['joinWidthSourceUnits'],
        'distanceMaximumRequested': wanted_max, 'distanceMaximumStored': actual_max,
        'subdivisionOrUvChange': False, 'pointWeldPerformed': False}


def copy_v4_owner(original, name, materials, owner):
    reference = BLOCKRUNNER_V4_MASKS['owners'][owner]
    assert original.name == reference['sourceObject']
    assert original.parent is None and not original.modifiers and not original.constraints
    assert original.animation_data is None and original.data.shape_keys is None
    assert all(slot.link == 'DATA' for slot in original.material_slots)
    assert name + ' geometry' not in bpy.data.meshes
    assert mesh_signature(original.data) == reference['meshSignature']
    assert fnv1a64_signature([list(v.co) for v in original.data.vertices]) == reference['vertexFnv1a64']
    assert fnv1a64_signature([list(p.vertices)+[p.material_index, int(p.use_smooth)] for p in original.data.polygons]) == reference['polygonFnv1a64']
    normal_before = fnv1a64_signature([list(n.vector) for n in original.data.corner_normals])
    assert normal_before == reference['cornerNormalsFnv1a64']
    geometry_before = v4_geometry_uv_signature(original.data)
    indices = [polygon.material_index for polygon in original.data.polygons]
    old_attributes = {(a.name, a.domain, a.data_type, len(a.data)) for a in original.data.attributes}
    mesh = original.data.copy()
    owned_meshes.append(mesh)
    mesh.name = name + ' geometry'
    assert mesh_signature(mesh) == mesh_signature(original.data)
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
    for polygon, index in zip(mesh.polygons, indices):
        polygon.material_index = index
    mask_report = apply_v4_masks(mesh, reference)
    ob = original.copy()
    owned_objects.append(ob)
    ob.data = mesh
    ob.name = name
    target.collection.objects.link(ob)
    assert matrix_rows(ob.matrix_world) == matrix_rows(original.matrix_world)
    assert v4_geometry_uv_signature(mesh) == geometry_before
    assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == normal_before
    assert [p.material_index for p in mesh.polygons] == indices
    attributes_after = {(a.name, a.domain, a.data_type, len(a.data)) for a in mesh.attributes}
    expected_new_attributes = {(name, 'CORNER', 'FLOAT_COLOR', len(mesh.loops)) for name in BLOCKRUNNER_V4_ATTRIBUTE_NAMES}
    assert attributes_after == old_attributes | expected_new_attributes
    report['ownerCopies'].append({'sourceObject': original.name, 'copiedObject': ob.name,
        'triangles': len(mesh.polygons), 'geometryUvAndMaterialIndicesFnv1a64': geometry_before,
        'cornerNormalsFnv1a64': normal_before, 'sourcePolygonToCopiedPolygon': 'identity; same corner order',
        'geometryUvNormalsMaterialIndicesExact': True, 'normalReencodingPerformed': False,
        'masks': mask_report})
    return ob


snapshot = global_snapshot()
source = None
source_before = None
source_normals_before = None
fit = None
fit_before = None
fit_normals_before = None
paint = None
paint_before = None
paint_normals_before = None
paint_images_before = None
target = None
owned_objects, owned_meshes, owned_materials = [], [], []
success = False
report = {'stage': 'copy-author-geometry-aware-paint-v4', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': V4_SCENE,
    'bodyMeshName': V4_BODY, 'pilotMeshName': V4_PILOT,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'materialRecipes': [], 'ownerCopies': [],
    'maskDataFnv1a64': BLOCKRUNNER_V4_MASKS['maskDataFnv1a64'],
    'scope': 'New material and geometry-mask copy. Same source surfaces, UVs, normals and pilot/control fit. No bake, normalization, export or runtime acceptance.',
    'normalized': False, 'runtimeReady': False, 'sharedBlendSaved': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = v4_normals(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes.get(BLOCKRUNNER_FIT['targetScene'])
    assert fit is not None
    activate_source(snapshot, fit)
    fit_before = source_signature(fit)
    fit_normals_before = v4_normals(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes.get(BLOCKRUNNER_V4_MASKS['parentScene'])
    assert paint is not None
    activate_source(snapshot, paint)
    paint_before = source_signature(paint)
    paint_normals_before = v4_normals(paint)
    paint_images_before = v4_linked_images(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature']
    assert paint_normals_before == BLOCKRUNNER_V4_MASKS['parentPaintCornerNormalSignature']
    assert paint_images_before == BLOCKRUNNER_PAINT_STATE['linkedPaintImages']
    assert len(paint.objects) == 2 and all(ob.type == 'MESH' for ob in paint.objects)
    original_body = paint.objects[BLOCKRUNNER_PAINT_STATE['bodyMeshName']]
    original_pilot = paint.objects[BLOCKRUNNER_PAINT_STATE['pilotMeshName']]
    assert len(original_body.material_slots) == 3 and len(original_pilot.material_slots) == 4
    target = bpy.data.scenes.new(V4_SCENE)
    body_materials = [v4_material('Blockrunner V4 procedural '+recipe['role'], recipe, True) for recipe in BODY_RECIPES]
    pilot_materials = [v4_material('Blockrunner V4 pilot '+recipe['role'], recipe, False) for recipe in PILOT_RECIPES]
    body = copy_v4_owner(original_body, V4_BODY, body_materials, 'body')
    pilot = copy_v4_owner(original_pilot, V4_PILOT, pilot_materials, 'pilot')
    report['meshObjects'] = 2
    report['triangles'] = sum(len(ob.data.polygons) for ob in (body, pilot))
    assert report['triangles'] == 44028
    report['materialSlots'] = {'body': 3, 'pilot': 4}
    report['objectLineage'] = BLOCKRUNNER_PAINT_AUTHOR['objectLineage']
    report['objectLineageScope'] = 'Original source/fit to V2 consolidation ranges; ownerCopies maps V2 polygons/loops identically to V4.'
    report['normalEncodingBudget'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudget']
    report['normalEncodingBudgetInherited'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudget']
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = v4_normals(target)
    report['paintAttributeSignatures'] = paint_attribute_signatures(target)
    report['linkedPaintImages'] = v4_linked_images(target)
    assert report['linkedPaintImages'] == {}, 'V4 must begin without copied V2 bake targets.'
    report['paintBounds'] = bounds(ob.matrix_world @ v.co for ob in (body, pilot) for v in ob.data.vertices)
    assert report['paintBounds'] == BLOCKRUNNER_PAINT_AUTHOR['paintBounds']
    report['authoringMaskExportPolicy'] = 'Preserve both named layers in V4 history and baked material history; remove only on a later final export copy after atlas checks, preventing unintended COLOR_0 tint.'
    report['status'] = 'new V4 geometry-aware paint copy created; matched appearance and four atlas bakes pending'
    success = True
finally:
    restore_context(snapshot)
    if not success:
        for ob in reversed(owned_objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        if target is not None:
            bpy.data.scenes.remove(target)
        for mesh in owned_meshes:
            assert mesh.users == 0
            bpy.data.meshes.remove(mesh)
        for material in owned_materials:
            assert material.users == 0
            bpy.data.materials.remove(material)
    report['newSceneRetained'] = success
    if source_before is not None:
        report['sourcePreservation'] = source_signature(source) == source_before
        report['sourceCornerNormalsPreserved'] = v4_normals(source) == source_normals_before
    if fit_before is not None:
        report['fitPreservation'] = source_signature(fit) == fit_before
        report['fitCornerNormalsPreserved'] = v4_normals(fit) == fit_normals_before
    if paint_before is not None:
        report['parentPaintPreserved'] = source_signature(paint) == paint_before
        report['parentPaintCornerNormalsPreserved'] = v4_normals(paint) == paint_normals_before
        report['parentPaintImagesPreserved'] = v4_linked_images(paint) == paint_images_before
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if fit_before is not None:
        assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
    if paint_before is not None:
        assert report['parentPaintPreserved'] and report['parentPaintCornerNormalsPreserved'] and report['parentPaintImagesPreserved']
